export interface Clock {
  now(): Date
}

export interface IdentifierSource {
  next(): string
}

export interface CryptographicRandomness {
  bytes(length: number): Uint8Array
}
