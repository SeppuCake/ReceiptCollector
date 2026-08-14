import { liveQuery } from 'dexie'
import type { OcrRun } from '../../../domain/ocr'
import type { OcrRunPatch, OcrRunPersistence, PlatformResult } from '../../contracts'
import { failure, success } from '../../contracts'
import { receiptCollectorDatabase, type ReceiptCollectorDatabase } from '../database'

function interrupted(reason: unknown): PlatformResult<never> {
  return failure('interrupted', 'The OCR history store interrupted the operation.', { retryable: true, cause: reason })
}

export class BrowserOcrRunRepository implements OcrRunPersistence {
  constructor(private readonly database: ReceiptCollectorDatabase = receiptCollectorDatabase) {}

  async create(run: OcrRun): Promise<PlatformResult<void>> {
    try {
      await this.database.ocrRuns.add(run)
      return success(undefined)
    } catch (reason) {
      return interrupted(reason)
    }
  }

  async update(runId: string, patch: OcrRunPatch): Promise<PlatformResult<void>> {
    try {
      const count = await this.database.ocrRuns.update(runId, patch)
      return count === 0 ? failure('unavailable', 'The OCR run no longer exists.') : success(undefined)
    } catch (reason) {
      return interrupted(reason)
    }
  }

  async latest(receiptId: string): Promise<PlatformResult<OcrRun | undefined>> {
    try {
      const runs = await this.database.ocrRuns.where('receiptId').equals(receiptId).toArray()
      return success(runs.sort((left, right) => left.attempt - right.attempt).at(-1))
    } catch (reason) {
      return interrupted(reason)
    }
  }

  watchLatest(receiptId: string, listener: (run: OcrRun | undefined) => void, onError?: (error: unknown) => void): () => void {
    const subscription = liveQuery(async () => {
      const runs = await this.database.ocrRuns.where('receiptId').equals(receiptId).toArray()
      return runs.sort((left, right) => left.attempt - right.attempt).at(-1)
    }).subscribe({ next: listener, error: onError })
    return () => subscription.unsubscribe()
  }
}
