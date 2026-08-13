import Dexie, { type EntityTable } from 'dexie'
import type { ReceiptAsset, ReceiptRecord, ReceiptSource } from '../domain/receipt'

class ReceiptCollectorDatabase extends Dexie {
  receipts!: EntityTable<ReceiptRecord, 'id'>
  assets!: EntityTable<ReceiptAsset, 'id'>

  constructor() {
    super('receipt-collector')
    this.version(1).stores({
      receipts: 'id, capturedAt, updatedAt, status, syncState, transactionDate, merchant',
      assets: 'id, receiptId, sha256, createdAt',
    })
  }
}

export const db = new ReceiptCollectorDatabase()

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

export function validateReceiptFiles(files: File[]): string[] {
  const issues: string[] = []
  if (files.length === 0) issues.push('Choose at least one receipt image or PDF.')
  if (files.length > 10) issues.push('A receipt can contain at most 10 files.')

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) issues.push(`${file.name} is not a supported image or PDF.`)
    if (file.size > MAX_FILE_SIZE) issues.push(`${file.name} is larger than 15 MB.`)
    if (file.size === 0) issues.push(`${file.name} is empty.`)
  }
  return issues
}

async function sha256(file: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createReceipt(files: File[], source: ReceiptSource): Promise<ReceiptRecord> {
  const issues = validateReceiptFiles(files)
  if (issues.length > 0) throw new Error(issues.join(' '))

  const now = new Date().toISOString()
  const receiptId = crypto.randomUUID()
  const assets: ReceiptAsset[] = await Promise.all(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      receiptId,
      createdAt: now,
      name: file.name || `receipt-${now}.jpg`,
      mimeType: file.type,
      size: file.size,
      sha256: await sha256(file),
      blob: file,
    })),
  )

  const duplicate = await db.assets.where('sha256').anyOf(assets.map((asset) => asset.sha256)).first()
  if (duplicate) throw new Error('This receipt file is already in your inbox.')

  const receipt: ReceiptRecord = {
    id: receiptId,
    capturedAt: now,
    updatedAt: now,
    source,
    status: 'needs_review',
    syncState: 'local',
    fileCount: assets.length,
    primaryFileId: assets[0]!.id,
    currency: 'MYR',
  }

  await db.transaction('rw', db.receipts, db.assets, async () => {
    await db.receipts.add(receipt)
    await db.assets.bulkAdd(assets)
  })
  return receipt
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  await db.transaction('rw', db.receipts, db.assets, async () => {
    await db.assets.where('receiptId').equals(receiptId).delete()
    await db.receipts.delete(receiptId)
  })
}

