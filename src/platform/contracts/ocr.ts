import type { PlatformResult } from './result'

export interface OcrProvenance {
  engine: string
  engineVersion: string
  model: string
  modelVersion: string
  processedAt: string
  sourceDocumentSha256: string
}

export interface OcrField<T> {
  value?: T
  confidence?: number
  language?: string
  evidence?: { page: number; text: string; boundingBox?: readonly number[] }
}

export interface ReceiptOcrResult {
  languages: readonly string[]
  merchant: OcrField<string>
  transactionDate: OcrField<string>
  totalMinor: OcrField<number>
  taxMinor: OcrField<number>
  currency: OcrField<string>
  provenance: OcrProvenance
  raw: unknown
}

export interface OfflineReceiptOcr {
  supportedLanguages(): Promise<PlatformResult<readonly string[]>>
  analyze(documentId: string, requestedLanguages: readonly string[]): Promise<PlatformResult<ReceiptOcrResult>>
  cancel(operationId: string): Promise<PlatformResult<void>>
}
