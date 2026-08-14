import { createWorker, OEM, type Worker } from 'tesseract.js'
import type { ReceiptAsset } from '../../../domain/receipt'
import type { PlatformResult, TextRecognitionEngine, TextRecognitionProgress, TextRecognitionResult } from '../../contracts'
import { failure, success } from '../../contracts'

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PIXELS = 24_000_000

async function imageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  if ('createImageBitmap' in globalThis) {
    const bitmap = await createImageBitmap(blob)
    try {
      return { width: bitmap.width, height: bitmap.height }
    } finally {
      bitmap.close()
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be decoded.'))
    }
    image.src = url
  })
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'The local OCR engine failed.'
}

export class TesseractTextRecognitionEngine implements TextRecognitionEngine {
  readonly name = 'Tesseract.js'
  readonly version = '7.0.0'
  readonly model = 'tessdata_fast eng+msa'
  readonly modelVersion = 'tessdata_fast 87416418657359cb625c412a48b6e1d6d41c29bd'
  private workerPromise?: Promise<Worker>
  private progress?: (progress: TextRecognitionProgress) => void

  supportedLanguages(): readonly string[] {
    return ['eng', 'msa']
  }

  private worker(): Promise<Worker> {
    this.workerPromise ??= createWorker(['eng', 'msa'], OEM.LSTM_ONLY, {
      workerPath: new URL('/ocr/runtime/worker.min.js', window.location.origin).href,
      corePath: new URL('/ocr/runtime/core', window.location.origin).href,
      langPath: new URL('/ocr/models', window.location.origin).href,
      workerBlobURL: false,
      gzip: false,
      cacheMethod: 'write',
      logger: (entry) => this.progress?.({ progress: entry.progress, text: entry.status }),
      errorHandler: () => undefined,
    })
    return this.workerPromise
  }

  async recognize(
    document: ReceiptAsset,
    requestedLanguages: readonly string[],
    options: { signal: AbortSignal; onProgress: (progress: TextRecognitionProgress) => void },
  ): Promise<PlatformResult<TextRecognitionResult>> {
    if (!SUPPORTED_MIME_TYPES.has(document.mimeType)) return failure('unsupported', 'OCR currently supports JPEG, PNG, and WebP images.')
    if (options.signal.aborted) return failure('cancelled', 'OCR was cancelled.', { retryable: true })

    try {
      const dimensions = await imageDimensions(document.blob)
      if (dimensions.width * dimensions.height > MAX_PIXELS) return failure('unsupported', 'The image is too large for safe local OCR.', { retryable: true })
      if (dimensions.width < 100 || dimensions.height < 100) return failure('unsupported', 'The image is too small for reliable OCR.', { retryable: true })

      this.progress = options.onProgress
      const worker = await this.worker()
      if (options.signal.aborted) return failure('cancelled', 'OCR was cancelled.', { retryable: true })
      const result = await worker.recognize(document.blob, {}, { blocks: true, text: true })
      if (options.signal.aborted) return failure('cancelled', 'OCR was cancelled.', { retryable: true })

      const language = requestedLanguages.join('+')
      const observations = (result.data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => ({
        page: 1,
        text: line.text.trim(),
        confidence: Math.max(0, Math.min(1, line.confidence / 100)),
        language,
        boundingBox: {
          x: line.bbox.x0,
          y: line.bbox.y0,
          width: line.bbox.x1 - line.bbox.x0,
          height: line.bbox.y1 - line.bbox.y0,
        },
      })))).filter((observation) => observation.text.length > 0)

      return success({ observations, detectedLanguages: observations.length > 0 ? requestedLanguages : [] })
    } catch (reason) {
      if (options.signal.aborted) return failure('cancelled', 'OCR was cancelled.', { retryable: true })
      await this.resetWorker()
      return failure('interrupted', message(reason), { retryable: true, cause: reason })
    } finally {
      this.progress = undefined
    }
  }

  async cancel(): Promise<void> {
    await this.resetWorker()
  }

  private async resetWorker(): Promise<void> {
    const current = this.workerPromise
    this.workerPromise = undefined
    if (!current) return
    try {
      await (await current).terminate()
    } catch {
      // The worker may already be gone after cancellation or an engine failure.
    }
  }
}
