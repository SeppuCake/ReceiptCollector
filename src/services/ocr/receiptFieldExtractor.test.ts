import { describe, expect, it } from 'vitest'
import type { TextObservation } from '../../domain/ocr'
import { DeterministicReceiptFieldExtractor } from './receiptFieldExtractor'

function line(text: string, confidence = 0.9): TextObservation {
  return { page: 1, text, confidence, language: 'eng+msa' }
}

describe('DeterministicReceiptFieldExtractor', () => {
  it('extracts Malaysian merchant, date, total, tax, and currency candidates', () => {
    const result = new DeterministicReceiptFieldExtractor().extract([
      line('KEDAI UJIAN MAJU', 0.93),
      line('DATE: 15/01/2025', 0.91),
      line('SUBTOTAL RM 11.60'),
      line('SST RM 0.74', 0.88),
      line('GRAND TOTAL RM 12.34', 0.95),
      line('CASH RM 20.00'),
      line('CHANGE RM 7.66'),
    ])

    expect(result.merchant[0]?.value).toBe('KEDAI UJIAN MAJU')
    expect(result.transactionDate[0]?.value).toBe('2025-01-15')
    expect(result.totalMinor.map((candidate) => candidate.value)).toEqual([1234])
    expect(result.taxMinor[0]?.value).toBe(74)
    expect(result.currency[0]?.value).toBe('MYR')
  })

  it('preserves alternatives and rejects impossible dates', () => {
    const result = new DeterministicReceiptFieldExtractor().extract([
      line('KEDAI CONTOH'),
      line('DATE 31/02/2025'),
      line('AMOUNT RM 10.00', 0.8),
      line('TOTAL MYR 12.00', 0.7),
    ])

    expect(result.transactionDate).toEqual([])
    expect(result.totalMinor.map((candidate) => candidate.value)).toEqual([1000, 1200])
  })
})
