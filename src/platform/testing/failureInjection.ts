import type { PlatformError, PlatformErrorCode } from '../contracts'

export class FailureInjector {
  private readonly queued = new Map<string, PlatformError[]>()

  failNext(point: string, code: PlatformErrorCode, message = `Injected failure at ${point}`): void {
    const failures = this.queued.get(point) ?? []
    failures.push({ code, message, retryable: code === 'interrupted' || code === 'unavailable' })
    this.queued.set(point, failures)
  }

  take(point: string): PlatformError | undefined {
    const failures = this.queued.get(point)
    const next = failures?.shift()
    if (failures?.length === 0) this.queued.delete(point)
    return next
  }
}
