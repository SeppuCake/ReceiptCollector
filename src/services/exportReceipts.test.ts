import { describe, expect, it } from 'vitest'
import type { ReceiptRecord } from '../domain/receipt'
import { receiptsToCsv } from './exportReceipts'

function receipt(overrides: Partial<ReceiptRecord>): ReceiptRecord {
  return {
    id: crypto.randomUUID(),
    capturedAt: '2026-08-13T10:00:00.000Z',
    updatedAt: '2026-08-13T10:00:00.000Z',
    source: 'camera',
    status: 'confirmed',
    syncState: 'local',
    fileCount: 1,
    primaryFileId: crypto.randomUUID(),
    currency: 'MYR',
    ...overrides,
  }
}

describe('CSV export', () => {
  it('exports only confirmed receipts in purchase-date order', () => {
    const csv = receiptsToCsv([
      receipt({ merchant: 'Later', transactionDate: '2026-08-13', totalMinor: 250 }),
      receipt({ merchant: 'Pending', transactionDate: '2026-08-01', status: 'needs_review' }),
      receipt({ merchant: 'Earlier', transactionDate: '2026-08-02', totalMinor: 100 }),
    ])
    expect(csv).toContain('"Earlier"')
    expect(csv).toContain('"Later"')
    expect(csv).not.toContain('"Pending"')
    expect(csv.indexOf('"Earlier"')).toBeLessThan(csv.indexOf('"Later"'))
  })

  it('escapes spreadsheet cells safely', () => {
    const csv = receiptsToCsv([receipt({ merchant: 'Shop, "Central"', transactionDate: '2026-08-13', totalMinor: 1234 })])
    expect(csv).toContain('"Shop, ""Central"""')
    expect(csv).toContain('"12.34"')
  })
})

