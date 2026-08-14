import { BaselineDexieReceiptRepository } from './browser/baselineDexieAdapter'
import { BrowserOcrRunRepository } from './browser/ocr/browserOcrRunRepository'
import { TesseractTextRecognitionEngine } from './browser/ocr/tesseractTextRecognitionEngine'
import { LoopbackOnlyRuntimePolicy } from './browser/runtimePolicy'
import type { Clock, IdentifierSource } from './contracts'
import { DeterministicReceiptFieldExtractor } from '../services/ocr/receiptFieldExtractor'
import { LocalReceiptOcrCoordinator } from '../services/ocr/receiptOcrCoordinator'

const systemClock: Clock = { now: () => new Date() }
const systemIdentifiers: IdentifierSource = { next: () => crypto.randomUUID() }
const receipts = new BaselineDexieReceiptRepository(systemClock, systemIdentifiers)
const ocrRuns = new BrowserOcrRunRepository()
const ocrEngine = new TesseractTextRecognitionEngine()

export const platform = {
  receipts,
  ocr: new LocalReceiptOcrCoordinator(
    receipts,
    ocrRuns,
    ocrEngine,
    new DeterministicReceiptFieldExtractor(),
    systemClock,
    systemIdentifiers,
  ),
  network: new LoopbackOnlyRuntimePolicy(),
} as const

export function filesToDocuments(files: readonly File[]) {
  return files.map((file) => ({
    name: file.name,
    mimeType: file.type,
    size: file.size,
    content: file as Blob,
  }))
}
