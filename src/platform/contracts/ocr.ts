import type { OcrRun, ReceiptOcrCandidates, TextObservation } from '../../domain/ocr'
import type { ReceiptAsset } from '../../domain/receipt'
import type { PlatformResult } from './result'

export interface TextRecognitionProgress {
  progress: number
  text: string
}

export interface TextRecognitionResult {
  observations: readonly TextObservation[]
  detectedLanguages: readonly string[]
}

export interface TextRecognitionEngine {
  readonly name: string
  readonly version: string
  readonly model: string
  readonly modelVersion: string
  supportedLanguages(): readonly string[]
  recognize(
    document: ReceiptAsset,
    requestedLanguages: readonly string[],
    options: { signal: AbortSignal; onProgress: (progress: TextRecognitionProgress) => void },
  ): Promise<PlatformResult<TextRecognitionResult>>
  cancel(): Promise<void>
}

export interface ReceiptFieldExtractor {
  extract(observations: readonly TextObservation[]): ReceiptOcrCandidates
}

export type OcrRunPatch = Partial<Omit<OcrRun, 'id' | 'receiptId' | 'documentId'>>

export interface OcrRunPersistence {
  create(run: OcrRun): Promise<PlatformResult<void>>
  update(runId: string, patch: OcrRunPatch): Promise<PlatformResult<void>>
  latest(receiptId: string): Promise<PlatformResult<OcrRun | undefined>>
  watchLatest(receiptId: string, listener: (run: OcrRun | undefined) => void, onError?: (error: unknown) => void): () => void
}

export interface ReceiptOcrCoordinator {
  start(receiptId: string): Promise<PlatformResult<OcrRun>>
  retry(receiptId: string): Promise<PlatformResult<OcrRun>>
  cancel(runId: string): Promise<PlatformResult<void>>
  latest(receiptId: string): Promise<PlatformResult<OcrRun | undefined>>
  watchLatest(receiptId: string, listener: (run: OcrRun | undefined) => void, onError?: (error: unknown) => void): () => void
}
