import { emptyOcrCandidates, type OcrRun } from '../../domain/ocr'
import type {
  Clock,
  IdentifierSource,
  OcrRunPersistence,
  PlatformResult,
  ReceiptFieldExtractor,
  ReceiptLedgerPersistence,
  ReceiptOcrCoordinator,
  TextRecognitionEngine,
} from '../../platform/contracts'
import { failure, success } from '../../platform/contracts'

const OCR_TIMEOUT_MS = 90_000

export class LocalReceiptOcrCoordinator implements ReceiptOcrCoordinator {
  private queue: Promise<void> = Promise.resolve()
  private readonly controllers = new Map<string, AbortController>()
  private activeRunId?: string

  constructor(
    private readonly receipts: ReceiptLedgerPersistence,
    private readonly runs: OcrRunPersistence,
    private readonly engine: TextRecognitionEngine,
    private readonly extractor: ReceiptFieldExtractor,
    private readonly clock: Clock,
    private readonly identifiers: IdentifierSource,
  ) {}

  start(receiptId: string): Promise<PlatformResult<OcrRun>> {
    return this.enqueue(receiptId)
  }

  retry(receiptId: string): Promise<PlatformResult<OcrRun>> {
    return this.enqueue(receiptId)
  }

  latest(receiptId: string): Promise<PlatformResult<OcrRun | undefined>> {
    return this.runs.latest(receiptId)
  }

  watchLatest(receiptId: string, listener: (run: OcrRun | undefined) => void, onError?: (error: unknown) => void): () => void {
    return this.runs.watchLatest(receiptId, listener, onError)
  }

  async cancel(runId: string): Promise<PlatformResult<void>> {
    const controller = this.controllers.get(runId)
    if (!controller) return failure('unavailable', 'The OCR run is no longer active.')
    controller.abort()
    if (this.activeRunId === runId) await this.engine.cancel()
    return success(undefined)
  }

  private async enqueue(receiptId: string): Promise<PlatformResult<OcrRun>> {
    const snapshotResult = await this.receipts.snapshot()
    if (!snapshotResult.ok) return snapshotResult
    const receipt = snapshotResult.value.receipts.find((item) => item.id === receiptId)
    if (!receipt) return failure('unavailable', 'The receipt no longer exists.')
    if (receipt.status === 'confirmed') return failure('locked', 'Confirmed receipts are not changed by OCR.')
    if (receipt.status === 'processing') return failure('locked', 'OCR is already running for this receipt.')
    const document = snapshotResult.value.assets.find((asset) => asset.id === receipt.primaryFileId)
    if (!document) return failure('corrupt', 'The source document is missing.')

    const latestResult = await this.runs.latest(receiptId)
    if (!latestResult.ok) return latestResult
    const createdAt = this.clock.now().toISOString()
    const run: OcrRun = {
      id: this.identifiers.next(),
      receiptId,
      documentId: document.id,
      attempt: (latestResult.value?.attempt ?? 0) + 1,
      createdAt,
      status: 'queued',
      progress: 0,
      progressText: 'Waiting for the local OCR worker',
      engine: this.engine.name,
      engineVersion: this.engine.version,
      model: this.engine.model,
      modelVersion: this.engine.modelVersion,
      requestedLanguages: this.engine.supportedLanguages(),
      detectedLanguages: [],
      observations: [],
      candidates: emptyOcrCandidates(),
      sourceDocumentSha256: document.sha256,
    }
    const created = await this.runs.create(run)
    if (!created.ok) return created
    await this.receipts.update(receiptId, { status: 'processing', failureReason: undefined })

    const controller = new AbortController()
    this.controllers.set(run.id, controller)
    this.queue = this.queue
      .then(() => this.process(run, document, receipt.updatedAt, controller))
      .catch(async (reason: unknown) => this.finishFailed(run, reason instanceof Error ? reason.message : 'The OCR coordinator was interrupted.'))
    return success(run)
  }

  private async process(
    run: OcrRun,
    document: Parameters<TextRecognitionEngine['recognize']>[0],
    expectedUpdatedAt: string,
    controller: AbortController,
  ): Promise<void> {
    if (controller.signal.aborted) {
      await this.finishCancelled(run)
      return
    }

    this.activeRunId = run.id
    const startedAt = this.clock.now().toISOString()
    await this.runs.update(run.id, { status: 'running', startedAt, progressText: 'Loading local OCR models' })
    let progressWrites = Promise.resolve()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
      if (this.activeRunId === run.id) void this.engine.cancel()
    }, OCR_TIMEOUT_MS)

    try {
      const recognized = await this.engine.recognize(document, run.requestedLanguages, {
        signal: controller.signal,
        onProgress: ({ progress, text }) => {
          progressWrites = progressWrites.then(async () => {
            await this.runs.update(run.id, { progress: Math.max(0, Math.min(1, progress)), progressText: text })
          })
        },
      })
      await progressWrites

      if (!recognized.ok) {
        if (timedOut) {
          await this.finishFailed(run, 'Local OCR timed out. Try a smaller or clearer image.')
        } else if (recognized.error.code === 'cancelled' || controller.signal.aborted) {
          await this.finishCancelled(run)
        } else {
          await this.finishFailed(run, recognized.error.message)
        }
        return
      }

      const candidates = this.extractor.extract(recognized.value.observations)
      const completedAt = this.clock.now().toISOString()
      await this.runs.update(run.id, {
        status: 'completed',
        progress: 1,
        progressText: 'Receipt text ready for review',
        detectedLanguages: recognized.value.detectedLanguages,
        observations: recognized.value.observations,
        candidates,
        completedAt,
      })
      await this.receipts.applyOcrSuggestions(run.receiptId, expectedUpdatedAt, candidates)
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(run.id)
      if (this.activeRunId === run.id) this.activeRunId = undefined
    }
  }

  private async finishCancelled(run: OcrRun): Promise<void> {
    await this.runs.update(run.id, {
      status: 'cancelled',
      progressText: 'OCR cancelled; manual review is still available',
      completedAt: this.clock.now().toISOString(),
    })
    await this.receipts.update(run.receiptId, { status: 'needs_review', failureReason: undefined })
    this.controllers.delete(run.id)
  }

  private async finishFailed(run: OcrRun, reason: string): Promise<void> {
    await this.runs.update(run.id, {
      status: 'failed',
      progressText: 'OCR could not read this receipt',
      failureReason: reason,
      completedAt: this.clock.now().toISOString(),
    })
    await this.receipts.update(run.receiptId, { status: 'needs_review', failureReason: reason })
  }
}
