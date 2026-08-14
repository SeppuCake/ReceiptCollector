import { describe, expect, it } from 'vitest'
import type { OcrRun } from '../../domain/ocr'
import type {
  OcrRunPatch,
  OcrRunPersistence,
  PlatformResult,
  TextRecognitionEngine,
  TextRecognitionProgress,
  TextRecognitionResult,
} from '../../platform/contracts'
import { failure, success } from '../../platform/contracts'
import { FakeClock, FakeIdentifiers, InMemoryReceiptRepository, syntheticCaptureRequest } from '../../platform/testing'
import { DeterministicReceiptFieldExtractor } from './receiptFieldExtractor'
import { LocalReceiptOcrCoordinator } from './receiptOcrCoordinator'

class InMemoryOcrRunRepository implements OcrRunPersistence {
  runs: OcrRun[] = []
  private listeners = new Map<string, Set<(run: OcrRun | undefined) => void>>()

  create(run: OcrRun): Promise<PlatformResult<void>> {
    this.runs.push(run)
    this.emit(run.receiptId)
    return Promise.resolve(success(undefined))
  }

  update(runId: string, patch: OcrRunPatch): Promise<PlatformResult<void>> {
    const index = this.runs.findIndex((run) => run.id === runId)
    if (index < 0) return Promise.resolve(failure('unavailable', 'Missing run'))
    this.runs[index] = { ...this.runs[index]!, ...patch }
    this.emit(this.runs[index]!.receiptId)
    return Promise.resolve(success(undefined))
  }

  latest(receiptId: string): Promise<PlatformResult<OcrRun | undefined>> {
    return Promise.resolve(success(this.runs.filter((run) => run.receiptId === receiptId).sort((left, right) => left.attempt - right.attempt).at(-1)))
  }

  watchLatest(receiptId: string, listener: (run: OcrRun | undefined) => void): () => void {
    const listeners = this.listeners.get(receiptId) ?? new Set()
    listeners.add(listener)
    this.listeners.set(receiptId, listeners)
    listener(this.runs.filter((run) => run.receiptId === receiptId).sort((left, right) => left.attempt - right.attempt).at(-1))
    return () => listeners.delete(listener)
  }

  private emit(receiptId: string) {
    const latest = this.runs.filter((run) => run.receiptId === receiptId).sort((left, right) => left.attempt - right.attempt).at(-1)
    for (const listener of this.listeners.get(receiptId) ?? []) listener(latest)
  }
}

class FakeTextEngine implements TextRecognitionEngine {
  readonly name = 'Fake OCR'
  readonly version = '1'
  readonly model = 'synthetic'
  readonly modelVersion = '1'
  recognizeImpl: TextRecognitionEngine['recognize'] = async () => success({
    detectedLanguages: ['eng'],
    observations: [
      { page: 1, text: 'KEDAI UJIAN', confidence: 0.95 },
      { page: 1, text: '15/01/2025', confidence: 0.9 },
      { page: 1, text: 'TOTAL RM 12.34', confidence: 0.95 },
    ],
  })

  supportedLanguages() { return ['eng'] }
  recognize(document: Parameters<TextRecognitionEngine['recognize']>[0], requestedLanguages: readonly string[], options: { signal: AbortSignal; onProgress: (progress: TextRecognitionProgress) => void }): Promise<PlatformResult<TextRecognitionResult>> {
    return this.recognizeImpl(document, requestedLanguages, options)
  }
  cancel() { return Promise.resolve() }
}

async function eventually(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('Condition was not reached')
}

async function fixture() {
  const clock = new FakeClock()
  const receipts = new InMemoryReceiptRepository(clock, new FakeIdentifiers('receipt'))
  const captured = await receipts.capture(syntheticCaptureRequest())
  if (!captured.ok) throw new Error('Synthetic capture failed')
  const runs = new InMemoryOcrRunRepository()
  const engine = new FakeTextEngine()
  const coordinator = new LocalReceiptOcrCoordinator(receipts, runs, engine, new DeterministicReceiptFieldExtractor(), clock, new FakeIdentifiers('ocr'))
  return { receipt: captured.value, receipts, runs, engine, coordinator }
}

describe('LocalReceiptOcrCoordinator', () => {
  it('prefills suggestions while keeping the receipt unconfirmed', async () => {
    const { receipt, receipts, runs, coordinator } = await fixture()
    expect((await coordinator.start(receipt.id)).ok).toBe(true)
    await eventually(() => runs.runs[0]?.status === 'completed')

    const snapshot = await receipts.snapshot()
    expect(snapshot.ok && snapshot.value.receipts[0]).toMatchObject({
      merchant: 'KEDAI UJIAN', transactionDate: '2025-01-15', totalMinor: 1234, status: 'needs_review',
    })
  })

  it('does not overwrite a user edit delivered before a late OCR result', async () => {
    const { receipt, receipts, runs, engine, coordinator } = await fixture()
    let resolveRecognition!: (result: PlatformResult<TextRecognitionResult>) => void
    engine.recognizeImpl = () => new Promise((resolve) => { resolveRecognition = resolve })
    await coordinator.start(receipt.id)
    await eventually(() => runs.runs[0]?.status === 'running')
    await receipts.update(receipt.id, { merchant: 'USER TYPED', updatedAt: '2025-01-15T09:00:00.000Z' })
    resolveRecognition(success({ detectedLanguages: ['eng'], observations: [{ page: 1, text: 'OCR MERCHANT', confidence: 0.99 }] }))
    await eventually(() => runs.runs[0]?.status === 'completed')

    const snapshot = await receipts.snapshot()
    expect(snapshot.ok && snapshot.value.receipts[0]?.merchant).toBe('USER TYPED')
  })

  it('keeps the source document after cancellation and permits a fresh retry run', async () => {
    const { receipt, receipts, runs, engine, coordinator } = await fixture()
    engine.recognizeImpl = (_document, _languages, { signal }) => new Promise((resolve) => {
      signal.addEventListener('abort', () => resolve(failure('cancelled', 'cancelled')), { once: true })
    })
    const started = await coordinator.start(receipt.id)
    if (!started.ok) throw new Error('OCR did not start')
    await eventually(() => runs.runs[0]?.status === 'running')
    expect((await coordinator.cancel(started.value.id)).ok).toBe(true)
    await eventually(() => runs.runs[0]?.status === 'cancelled')
    const snapshot = await receipts.snapshot()
    expect(snapshot.ok && snapshot.value.assets).toHaveLength(1)

    engine.recognizeImpl = async () => failure('interrupted', 'synthetic failure', { retryable: true })
    expect((await coordinator.retry(receipt.id)).ok).toBe(true)
    await eventually(() => runs.runs[1]?.status === 'failed')
    expect(runs.runs).toHaveLength(2)
  })
})
