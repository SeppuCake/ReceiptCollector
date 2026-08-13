export const platformErrorCodes = [
  'unavailable',
  'cancelled',
  'locked',
  'corrupt',
  'unsupported',
  'interrupted',
  'duplicate',
  'invalid',
  'wrong_recovery_material',
] as const

export type PlatformErrorCode = (typeof platformErrorCodes)[number]

export interface PlatformError {
  code: PlatformErrorCode
  message: string
  retryable: boolean
  cause?: unknown
}

export type PlatformResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PlatformError }

export function success<T>(value: T): PlatformResult<T> {
  return { ok: true, value }
}

export function failure(
  code: PlatformErrorCode,
  message: string,
  options: { retryable?: boolean; cause?: unknown } = {},
): PlatformResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable: options.retryable ?? false,
      ...(options.cause === undefined ? {} : { cause: options.cause }),
    },
  }
}
