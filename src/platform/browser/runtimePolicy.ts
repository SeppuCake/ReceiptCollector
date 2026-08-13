import type { RuntimeNetworkPolicy } from '../contracts'
import { failure, success, type PlatformResult } from '../contracts'

const LOOPBACK_NAMES = new Set(['127.0.0.1', '::1', 'localhost'])

export class LoopbackOnlyRuntimePolicy implements RuntimeNetworkPolicy {
  readonly mode = 'loopback-only' as const
  private forcedOffline = false

  check(url: URL): PlatformResult<void> {
    if (this.forcedOffline) return failure('unavailable', 'Network access is disabled for this runtime.', { retryable: true })
    if (!LOOPBACK_NAMES.has(url.hostname)) return failure('unsupported', 'Outbound network access is prohibited.')
    return success(undefined)
  }

  setOfflineForTesting(offline: boolean): void {
    this.forcedOffline = offline
  }

  isOffline(): boolean {
    return this.forcedOffline
  }
}
