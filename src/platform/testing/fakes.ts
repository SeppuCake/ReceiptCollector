import type { ReceiptAsset, ReceiptRecord } from '../../domain/receipt'
import type {
  Clock,
  CryptographicRandomness,
  IdentifierSource,
  KeyProtection,
  LocalAuthenticationRequest,
  ReceiptCaptureRequest,
  ReceiptLedgerPersistence,
  ReceiptSnapshot,
  ReceiptUpdate,
  RecoveryArchive,
  RecoveryArchiveMetadata,
  RuntimeNetworkPolicy,
} from '../contracts'
import { failure, success, type PlatformResult } from '../contracts'
import { FailureInjector } from './failureInjection'

export class FakeClock implements Clock {
  constructor(private current = new Date('2025-01-15T08:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current)
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds)
  }
}

export class FakeIdentifiers implements IdentifierSource {
  private counter = 0

  constructor(private readonly prefix = 'test-id') {}

  next(): string {
    this.counter += 1
    return `${this.prefix}-${this.counter}`
  }
}

export class FakeCryptographicRandomness implements CryptographicRandomness {
  private cursor = 0

  constructor(private readonly sequence = [0x11, 0x22, 0x33, 0x44]) {}

  bytes(length: number): Uint8Array {
    return Uint8Array.from({ length }, () => {
      const value = this.sequence[this.cursor % this.sequence.length]!
      this.cursor += 1
      return value
    })
  }
}

async function digest(content: Blob): Promise<string> {
  const bytes = new Uint8Array(await content.arrayBuffer())
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class InMemoryReceiptRepository implements ReceiptLedgerPersistence {
  private receipts: ReceiptRecord[] = []
  private assets: ReceiptAsset[] = []
  private readonly listeners = new Set<(snapshot: ReceiptSnapshot) => void>()

  constructor(
    private readonly clock = new FakeClock(),
    private readonly identifiers = new FakeIdentifiers(),
    readonly failures = new FailureInjector(),
  ) {}

  async snapshot(): Promise<PlatformResult<ReceiptSnapshot>> {
    const injected = this.failures.take('snapshot')
    if (injected) return { ok: false, error: injected }
    return success(this.copySnapshot())
  }

  watch(listener: (snapshot: ReceiptSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.copySnapshot())
    return () => this.listeners.delete(listener)
  }

  async capture(request: ReceiptCaptureRequest): Promise<PlatformResult<ReceiptRecord>> {
    const before = this.failures.take('capture.before_prepare')
    if (before) return { ok: false, error: before }
    if (request.documents.length === 0) return failure('invalid', 'At least one source document is required.')
    if (request.documents.some((document) => document.size !== document.content.size || document.size === 0)) {
      return failure('corrupt', 'Source-document content is inconsistent.')
    }

    const digests = await Promise.all(request.documents.map((document) => digest(document.content)))
    if (digests.some((sha256) => this.assets.some((asset) => asset.sha256 === sha256))) {
      return failure('duplicate', 'This receipt file is already in your inbox.')
    }

    const now = this.clock.now().toISOString()
    const receiptId = this.identifiers.next()
    const nextAssets: ReceiptAsset[] = request.documents.map((document, index) => ({
      id: this.identifiers.next(),
      receiptId,
      createdAt: now,
      name: document.name,
      mimeType: document.mimeType,
      size: document.size,
      sha256: digests[index]!,
      blob: document.content,
    }))
    const nextReceipt: ReceiptRecord = {
      id: receiptId,
      capturedAt: now,
      updatedAt: now,
      source: request.source,
      status: 'needs_review',
      syncState: 'local',
      fileCount: nextAssets.length,
      primaryFileId: nextAssets[0]!.id,
      currency: 'MYR',
    }

    // Nothing mutates until the commit point, modelling an atomic transaction.
    const beforeCommit = this.failures.take('capture.before_commit')
    if (beforeCommit) return { ok: false, error: beforeCommit }
    this.receipts = [...this.receipts, nextReceipt]
    this.assets = [...this.assets, ...nextAssets]
    this.emit()
    return success(nextReceipt)
  }

  async update(receiptId: string, patch: ReceiptUpdate): Promise<PlatformResult<void>> {
    const injected = this.failures.take('update')
    if (injected) return { ok: false, error: injected }
    const index = this.receipts.findIndex((receipt) => receipt.id === receiptId)
    if (index < 0) return failure('unavailable', 'The receipt no longer exists.')
    this.receipts[index] = { ...this.receipts[index]!, ...patch }
    this.emit()
    return success(undefined)
  }

  async delete(receiptId: string): Promise<PlatformResult<void>> {
    const injected = this.failures.take('delete.before_commit')
    if (injected) return { ok: false, error: injected }
    this.receipts = this.receipts.filter((receipt) => receipt.id !== receiptId)
    this.assets = this.assets.filter((asset) => asset.receiptId !== receiptId)
    this.emit()
    return success(undefined)
  }

  private copySnapshot(): ReceiptSnapshot {
    return { receipts: [...this.receipts], assets: [...this.assets] }
  }

  private emit(): void {
    const snapshot = this.copySnapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}

export class FakeKeyProtection implements KeyProtection {
  constructor(private available = true) {}

  availability(): Promise<PlatformResult<{ available: readonly ['pin'] }>> {
    return Promise.resolve(this.available ? success({ available: ['pin'] as const }) : failure('unavailable', 'Local authentication is unavailable.'))
  }

  authenticate(request: LocalAuthenticationRequest): Promise<PlatformResult<void>> {
    void request
    return Promise.resolve(this.available ? success(undefined) : failure('unavailable', 'Local authentication is unavailable.'))
  }

  seal(keyId: string, secret: Uint8Array): Promise<PlatformResult<Uint8Array>> {
    void keyId
    return Promise.resolve(this.available ? success(secret.slice()) : failure('locked', 'Key protection is locked.'))
  }

  unseal(keyId: string, envelope: Uint8Array): Promise<PlatformResult<Uint8Array>> {
    void keyId
    return Promise.resolve(this.available ? success(envelope.slice()) : failure('locked', 'Key protection is locked.'))
  }

  forget(keyId: string): Promise<PlatformResult<void>> {
    void keyId
    return Promise.resolve(success(undefined))
  }
}

export class FakeRecoveryArchive implements RecoveryArchive {
  private readonly expected = new Uint8Array([7, 7, 7])
  private readonly metadata: RecoveryArchiveMetadata = {
    format: 'receipt-collector-test',
    formatVersion: 1,
    createdAt: '2025-01-15T08:00:00.000Z',
    applicationRelease: 'test',
    entryCount: 1,
  }

  create(recoveryMaterial: Uint8Array): Promise<PlatformResult<{ metadata: RecoveryArchiveMetadata; archive: Uint8Array }>> {
    void recoveryMaterial
    return Promise.resolve(success({ metadata: this.metadata, archive: new Uint8Array([1, 2, 3]) }))
  }

  inspect(archive: Uint8Array): Promise<PlatformResult<RecoveryArchiveMetadata>> {
    return Promise.resolve(archive.length === 3 ? success(this.metadata) : failure('corrupt', 'Recovery archive is corrupt.'))
  }

  restore(_archive: Uint8Array, recoveryMaterial: Uint8Array): Promise<PlatformResult<void>> {
    const matches = recoveryMaterial.length === this.expected.length && recoveryMaterial.every((value, index) => value === this.expected[index])
    return Promise.resolve(matches ? success(undefined) : failure('wrong_recovery_material', 'Recovery material did not unlock the archive.'))
  }
}

export class FakeRuntimeNetworkPolicy implements RuntimeNetworkPolicy {
  readonly mode = 'loopback-only' as const
  private offline = false

  check(url: URL): PlatformResult<void> {
    if (this.offline) return failure('unavailable', 'Forced offline mode is active.')
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
      ? success(undefined)
      : failure('unsupported', 'Outbound requests are prohibited.')
  }

  setOfflineForTesting(offline: boolean): void {
    this.offline = offline
  }

  isOffline(): boolean {
    return this.offline
  }
}
