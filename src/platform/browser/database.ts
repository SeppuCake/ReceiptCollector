import Dexie, { type EntityTable } from 'dexie'
import type { OcrRun } from '../../domain/ocr'
import type { ReceiptAsset, ReceiptRecord } from '../../domain/receipt'

export class ReceiptCollectorDatabase extends Dexie {
  receipts!: EntityTable<ReceiptRecord, 'id'>
  assets!: EntityTable<ReceiptAsset, 'id'>
  ocrRuns!: EntityTable<OcrRun, 'id'>

  constructor() {
    super('receipt-collector')
    this.version(1).stores({
      receipts: 'id, capturedAt, updatedAt, status, syncState, transactionDate, merchant',
      assets: 'id, receiptId, sha256, createdAt',
    })
    this.version(2).stores({
      receipts: 'id, capturedAt, updatedAt, status, syncState, transactionDate, merchant',
      assets: 'id, receiptId, sha256, createdAt',
      ocrRuns: 'id, receiptId, documentId, status, startedAt, completedAt',
    })
    this.version(3).stores({
      receipts: 'id, capturedAt, updatedAt, status, syncState, transactionDate, merchant',
      assets: 'id, receiptId, sha256, createdAt',
      ocrRuns: 'id, receiptId, documentId, status, createdAt, attempt, startedAt, completedAt',
    })
  }
}

export const receiptCollectorDatabase = new ReceiptCollectorDatabase()
