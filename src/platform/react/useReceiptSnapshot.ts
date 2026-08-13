import { useEffect, useState } from 'react'
import type { ReceiptLedgerPersistence, ReceiptSnapshot } from '../contracts'

const EMPTY_SNAPSHOT: ReceiptSnapshot = { receipts: [], assets: [] }

export function useReceiptSnapshot(repository: ReceiptLedgerPersistence): ReceiptSnapshot {
  const [snapshot, setSnapshot] = useState<ReceiptSnapshot>(EMPTY_SNAPSHOT)

  useEffect(() => repository.watch(setSnapshot, (reason) => {
    console.error('The baseline receipt store could not be observed.', reason)
  }), [repository])

  return snapshot
}
