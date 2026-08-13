import { describe, expect, it } from 'vitest'
import type { ReceiptLedgerPersistence } from '../contracts'
import { syntheticCaptureRequest, syntheticReceiptDocument } from './fixtures'
import { InMemoryReceiptRepository } from './fakes'

export function receiptPersistenceContractSuite(
  name: string,
  factory: () => ReceiptLedgerPersistence & { failures: InMemoryReceiptRepository['failures'] },
): void {
  describe(name, () => {
    it('rolls back metadata and source documents when an atomic capture is interrupted', async () => {
      const repository = factory()
      repository.failures.failNext('capture.before_commit', 'interrupted')

      const result = await repository.capture(syntheticCaptureRequest())
      const snapshot = await repository.snapshot()

      expect(result).toMatchObject({ ok: false, error: { code: 'interrupted' } })
      expect(snapshot).toEqual({ ok: true, value: { receipts: [], assets: [] } })
    })

    it('rejects corrupted source content', async () => {
      const repository = factory()
      const result = await repository.capture(syntheticCaptureRequest({
        documents: [syntheticReceiptDocument({ size: 999 })],
      }))

      expect(result).toMatchObject({ ok: false, error: { code: 'corrupt' } })
    })

    it('rejects duplicate intake without creating a second aggregate', async () => {
      const repository = factory()
      expect((await repository.capture(syntheticCaptureRequest())).ok).toBe(true)

      const duplicate = await repository.capture(syntheticCaptureRequest())
      const snapshot = await repository.snapshot()

      expect(duplicate).toMatchObject({ ok: false, error: { code: 'duplicate' } })
      expect(snapshot.ok && snapshot.value.receipts).toHaveLength(1)
      expect(snapshot.ok && snapshot.value.assets).toHaveLength(1)
    })

    it('surfaces cancellation without mutating state', async () => {
      const repository = factory()
      repository.failures.failNext('capture.before_prepare', 'cancelled')

      expect(await repository.capture(syntheticCaptureRequest())).toMatchObject({ ok: false, error: { code: 'cancelled' } })
      expect(await repository.snapshot()).toEqual({ ok: true, value: { receipts: [], assets: [] } })
    })
  })
}
