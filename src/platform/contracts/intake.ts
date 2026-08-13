import type { ReceiptSource } from '../../domain/receipt'
import type { SourceDocumentDraft } from './persistence'
import type { PlatformResult } from './result'

export type IntakeCapability = 'camera' | 'file-picker' | 'share-target'

export interface IntakeRequest {
  source: ReceiptSource
  accept: readonly string[]
  multiple: boolean
}

export interface ReceiptIntake {
  capabilities(): Promise<PlatformResult<readonly IntakeCapability[]>>
  acquire(request: IntakeRequest): Promise<PlatformResult<readonly SourceDocumentDraft[]>>
}
