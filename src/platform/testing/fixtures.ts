import type { ReceiptCaptureRequest, SourceDocumentDraft } from '../contracts'

export function syntheticReceiptDocument(overrides: Partial<SourceDocumentDraft> = {}): SourceDocumentDraft {
  const content = overrides.content ?? new Blob(['SYNTHETIC RECEIPT\nMerchant: Kedai Ujian\nTotal: RM 12.34'], { type: 'image/png' })
  return {
    name: 'synthetic-receipt.png',
    mimeType: 'image/png',
    size: content.size,
    content,
    ...overrides,
  }
}

export function syntheticCaptureRequest(overrides: Partial<ReceiptCaptureRequest> = {}): ReceiptCaptureRequest {
  return {
    source: 'files',
    documents: [syntheticReceiptDocument()],
    ...overrides,
  }
}
