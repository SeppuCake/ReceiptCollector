import type { PlatformResult } from './result'

export interface RecoveryArchiveMetadata {
  format: string
  formatVersion: number
  createdAt: string
  applicationRelease: string
  entryCount: number
}

export interface RecoveryArchive {
  create(recoveryMaterial: Uint8Array): Promise<PlatformResult<{ metadata: RecoveryArchiveMetadata; archive: Uint8Array }>>
  inspect(archive: Uint8Array): Promise<PlatformResult<RecoveryArchiveMetadata>>
  restore(archive: Uint8Array, recoveryMaterial: Uint8Array): Promise<PlatformResult<void>>
}
