import { liveQuery } from 'dexie'
import type { ReceiptOcrCandidates } from '../../domain/ocr'
import type { ReceiptAsset, ReceiptRecord } from '../../domain/receipt'
import type {
  Clock,
  IdentifierSource,
  ReceiptCaptureRequest,
  ReceiptLedgerPersistence,
  ReceiptSnapshot,
  ReceiptUpdate,
} from '../contracts'
import { failure, success, type PlatformResult } from '../contracts'
import { receiptCollectorDatabase, type ReceiptCollectorDatabase } from './database'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

export function validateReceiptDocuments(documents: ReceiptCaptureRequest['documents']): string[] {
  const issues: string[] = []
  if (documents.length === 0) issues.push('Choose at least one receipt image or PDF.')
  if (documents.length > 10) issues.push('A receipt can contain at most 10 files.')

  for (const document of documents) {
    if (!ALLOWED_TYPES.has(document.mimeType)) issues.push(`${document.name} is not a supported image or PDF.`)
    if (document.size > MAX_FILE_SIZE) issues.push(`${document.name} is larger than 15 MB.`)
    if (document.size === 0) issues.push(`${document.name} is empty.`)
    if (document.content.size !== document.size) issues.push(`${document.name} has inconsistent content.`)
  }
  return issues
}

async function sha256(content: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await content.arrayBuffer())
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function interrupted(reason: unknown): PlatformResult<never> {
  return failure('interrupted', 'The local browser store interrupted the operation.', { retryable: true, cause: reason })
}

/**
 * Baseline compatibility adapter for the Stage 0 browser prototype.
 * IndexedDB/Dexie is neither an encrypted vault nor a durable backup.
 */
export class BaselineDexieReceiptRepository implements ReceiptLedgerPersistence {
  constructor(
    private readonly clock: Clock,
    private readonly identifiers: IdentifierSource,
    private readonly database: ReceiptCollectorDatabase = receiptCollectorDatabase,
  ) {}

  async snapshot(): Promise<PlatformResult<ReceiptSnapshot>> {
    try {
      const [receipts, assets] = await Promise.all([
        this.database.receipts.orderBy('capturedAt').reverse().toArray(),
        this.database.assets.toArray(),
      ])
      return success({ receipts, assets })
    } catch (reason) {
      return interrupted(reason)
    }
  }

  watch(listener: (snapshot: ReceiptSnapshot) => void, onError?: (error: unknown) => void): () => void {
    const subscription = liveQuery(async () => {
      const [receipts, assets] = await Promise.all([
        this.database.receipts.orderBy('capturedAt').reverse().toArray(),
        this.database.assets.toArray(),
      ])
      return { receipts, assets }
    }).subscribe({ next: listener, error: onError })
    return () => subscription.unsubscribe()
  }

  async capture(request: ReceiptCaptureRequest): Promise<PlatformResult<ReceiptRecord>> {
    const issues = validateReceiptDocuments(request.documents)
    if (issues.length > 0) return failure('invalid', issues.join(' '))

    try {
      const now = this.clock.now().toISOString()
      const receiptId = this.identifiers.next()
      const assets: ReceiptAsset[] = await Promise.all(
        request.documents.map(async (document) => ({
          id: this.identifiers.next(),
          receiptId,
          createdAt: now,
          name: document.name || `receipt-${now}.jpg`,
          mimeType: document.mimeType,
          size: document.size,
          sha256: await sha256(document.content),
          blob: document.content,
        })),
      )

      const duplicate = await this.database.assets.where('sha256').anyOf(assets.map((asset) => asset.sha256)).first()
      if (duplicate) return failure('duplicate', 'This receipt file is already in your inbox.')

      const receipt: ReceiptRecord = {
        id: receiptId,
        capturedAt: now,
        updatedAt: now,
        source: request.source,
        status: 'needs_review',
        syncState: 'local',
        fileCount: assets.length,
        primaryFileId: assets[0]!.id,
        currency: 'MYR',
      }

      await this.database.transaction('rw', this.database.receipts, this.database.assets, async () => {
        await this.database.receipts.add(receipt)
        await this.database.assets.bulkAdd(assets)
      })
      return success(receipt)
    } catch (reason) {
      return interrupted(reason)
    }
  }

  async update(receiptId: string, patch: ReceiptUpdate): Promise<PlatformResult<void>> {
    try {
      const count = await this.database.receipts.update(receiptId, patch)
      return count === 0 ? failure('unavailable', 'The receipt no longer exists.') : success(undefined)
    } catch (reason) {
      return interrupted(reason)
    }
  }

  async applyOcrSuggestions(
    receiptId: string,
    expectedUpdatedAt: string,
    candidates: ReceiptOcrCandidates,
  ): Promise<PlatformResult<{ applied: boolean }>> {
    try {
      return await this.database.transaction('rw', this.database.receipts, async () => {
        const receipt = await this.database.receipts.get(receiptId)
        if (!receipt) return failure('unavailable', 'The receipt no longer exists.')
        if (receipt.status === 'confirmed' || receipt.updatedAt !== expectedUpdatedAt) return success({ applied: false })

        const confidences: number[] = []
        const best = <T>(items: readonly { value: T; confidence: number }[]) => items[0]
        const merchant = best(candidates.merchant)
        const transactionDate = best(candidates.transactionDate)
        const totalMinor = best(candidates.totalMinor)
        const taxMinor = best(candidates.taxMinor)
        for (const candidate of [merchant, transactionDate, totalMinor, taxMinor]) {
          if (candidate) confidences.push(candidate.confidence)
        }

        await this.database.receipts.update(receiptId, {
          ...(receipt.merchant || !merchant ? {} : { merchant: merchant.value }),
          ...(receipt.transactionDate || !transactionDate ? {} : { transactionDate: transactionDate.value }),
          ...(receipt.totalMinor !== undefined || !totalMinor ? {} : { totalMinor: totalMinor.value }),
          ...(receipt.taxMinor !== undefined || !taxMinor ? {} : { taxMinor: taxMinor.value }),
          status: 'needs_review',
          failureReason: undefined,
          ocrConfidence: confidences.length > 0 ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : undefined,
          updatedAt: this.clock.now().toISOString(),
        })
        return success({ applied: true })
      })
    } catch (reason) {
      return interrupted(reason)
    }
  }

  async delete(receiptId: string): Promise<PlatformResult<void>> {
    try {
      await this.database.transaction('rw', this.database.receipts, this.database.assets, this.database.ocrRuns, async () => {
        await this.database.ocrRuns.where('receiptId').equals(receiptId).delete()
        await this.database.assets.where('receiptId').equals(receiptId).delete()
        await this.database.receipts.delete(receiptId)
      })
      return success(undefined)
    } catch (reason) {
      return interrupted(reason)
    }
  }
}
