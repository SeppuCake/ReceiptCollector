import type { ReceiptAsset, ReceiptRecord, ReceiptSource } from '../../domain/receipt'
import type { ReceiptOcrCandidates } from '../../domain/ocr'
import type { PlatformResult } from './result'

export interface ReceiptSnapshot {
  receipts: ReceiptRecord[]
  assets: ReceiptAsset[]
}

export interface SourceDocumentDraft {
  name: string
  mimeType: string
  size: number
  content: Blob
}

export interface ReceiptCaptureRequest {
  documents: readonly SourceDocumentDraft[]
  source: ReceiptSource
}

export type ReceiptUpdate = Partial<
  Pick<
    ReceiptRecord,
    | 'merchant'
    | 'transactionDate'
    | 'totalMinor'
    | 'taxMinor'
    | 'category'
    | 'paymentMethod'
    | 'notes'
    | 'status'
    | 'syncState'
    | 'updatedAt'
    | 'ocrConfidence'
    | 'failureReason'
  >
>

/**
 * Receipt metadata and source documents form one aggregate. Implementations must
 * commit capture and deletion atomically: callers must never observe only one side.
 */
export interface ReceiptLedgerPersistence {
  snapshot(): Promise<PlatformResult<ReceiptSnapshot>>
  watch(listener: (snapshot: ReceiptSnapshot) => void, onError?: (error: unknown) => void): () => void
  capture(request: ReceiptCaptureRequest): Promise<PlatformResult<ReceiptRecord>>
  update(receiptId: string, patch: ReceiptUpdate): Promise<PlatformResult<void>>
  applyOcrSuggestions(
    receiptId: string,
    expectedUpdatedAt: string,
    candidates: ReceiptOcrCandidates,
  ): Promise<PlatformResult<{ applied: boolean }>>
  delete(receiptId: string): Promise<PlatformResult<void>>
}
