import type { PlatformResult } from './result'

export interface StoredSourceDocument {
  id: string
  ownerId: string
  name: string
  mimeType: string
  byteLength: number
  sha256: string
  createdAt: string
}

export interface SourceDocumentStorage {
  put(ownerId: string, document: Omit<StoredSourceDocument, 'id' | 'ownerId' | 'createdAt'>, content: Uint8Array): Promise<PlatformResult<StoredSourceDocument>>
  read(documentId: string): Promise<PlatformResult<{ metadata: StoredSourceDocument; content: Uint8Array }>>
  delete(documentId: string): Promise<PlatformResult<void>>
}
