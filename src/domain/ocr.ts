export const ocrRunStatuses = ['queued', 'running', 'completed', 'failed', 'cancelled'] as const
export type OcrRunStatus = (typeof ocrRunStatuses)[number]

export interface OcrBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface TextObservation {
  page: number
  text: string
  confidence: number
  language?: string
  boundingBox?: OcrBoundingBox
}

export interface OcrEvidence {
  page: number
  text: string
  boundingBox?: OcrBoundingBox
}

export interface OcrCandidate<T> {
  value: T
  confidence: number
  language?: string
  evidence: OcrEvidence
}

export interface ReceiptOcrCandidates {
  merchant: readonly OcrCandidate<string>[]
  transactionDate: readonly OcrCandidate<string>[]
  totalMinor: readonly OcrCandidate<number>[]
  taxMinor: readonly OcrCandidate<number>[]
  currency: readonly OcrCandidate<'MYR'>[]
}

export interface OcrRun {
  id: string
  receiptId: string
  documentId: string
  attempt: number
  createdAt: string
  status: OcrRunStatus
  progress: number
  progressText: string
  engine: string
  engineVersion: string
  model: string
  modelVersion: string
  requestedLanguages: readonly string[]
  detectedLanguages: readonly string[]
  observations: readonly TextObservation[]
  candidates: ReceiptOcrCandidates
  sourceDocumentSha256: string
  startedAt?: string
  completedAt?: string
  failureReason?: string
}

export const emptyOcrCandidates = (): ReceiptOcrCandidates => ({
  merchant: [],
  transactionDate: [],
  totalMinor: [],
  taxMinor: [],
  currency: [],
})
