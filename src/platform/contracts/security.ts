import type { PlatformResult } from './result'

export type LocalAuthenticationKind = 'device-credential' | 'biometric' | 'pin'

export interface LocalAuthenticationRequest {
  reason: string
  allow: readonly LocalAuthenticationKind[]
}

export interface KeyProtection {
  availability(): Promise<PlatformResult<{ available: readonly LocalAuthenticationKind[] }>>
  authenticate(request: LocalAuthenticationRequest): Promise<PlatformResult<void>>
  seal(keyId: string, secret: Uint8Array): Promise<PlatformResult<Uint8Array>>
  unseal(keyId: string, envelope: Uint8Array): Promise<PlatformResult<Uint8Array>>
  forget(keyId: string): Promise<PlatformResult<void>>
}
