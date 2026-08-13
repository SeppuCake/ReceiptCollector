import type { PlatformResult } from './result'

export type NetworkMode = 'deny-all' | 'loopback-only'

export interface RuntimeNetworkPolicy {
  readonly mode: NetworkMode
  check(url: URL): PlatformResult<void>
  setOfflineForTesting(offline: boolean): void
  isOffline(): boolean
}
