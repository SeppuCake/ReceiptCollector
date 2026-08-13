import { describe, expect, it } from 'vitest'
import { receiptPersistenceContractSuite } from './contractSuites'
import { FakeKeyProtection, FakeRecoveryArchive, FakeRuntimeNetworkPolicy, InMemoryReceiptRepository } from './fakes'

receiptPersistenceContractSuite('in-memory receipt persistence contract', () => new InMemoryReceiptRepository())

describe('platform failure fakes', () => {
  it('reports unavailable local authentication', async () => {
    const authentication = new FakeKeyProtection(false)
    expect(await authentication.authenticate({ reason: 'Unlock receipt vault', allow: ['pin'] })).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    })
  })

  it('rejects wrong recovery material', async () => {
    const recovery = new FakeRecoveryArchive()
    expect(await recovery.restore(new Uint8Array([1, 2, 3]), new Uint8Array([9]))).toMatchObject({
      ok: false,
      error: { code: 'wrong_recovery_material' },
    })
  })

  it('forces offline behavior and blocks non-loopback traffic', () => {
    const runtime = new FakeRuntimeNetworkPolicy()
    expect(runtime.check(new URL('https://example.com'))).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    runtime.setOfflineForTesting(true)
    expect(runtime.check(new URL('http://127.0.0.1:4173'))).toMatchObject({ ok: false, error: { code: 'unavailable' } })
  })
})
