import { BaselineDexieReceiptRepository } from './browser/baselineDexieAdapter'
import { LoopbackOnlyRuntimePolicy } from './browser/runtimePolicy'
import type { Clock, IdentifierSource } from './contracts'

const systemClock: Clock = { now: () => new Date() }
const systemIdentifiers: IdentifierSource = { next: () => crypto.randomUUID() }

export const platform = {
  receipts: new BaselineDexieReceiptRepository(systemClock, systemIdentifiers),
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
