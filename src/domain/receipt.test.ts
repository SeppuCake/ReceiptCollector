import { describe, expect, it } from 'vitest'
import { receiptReviewSchema } from './receipt'

const validReview = {
  merchant: 'Kedai Runcit Maju',
  transactionDate: '2026-08-13',
  total: '18.90',
  tax: '1.20',
  category: 'Groceries',
  paymentMethod: 'Cash',
  notes: '',
}

describe('receipt review validation', () => {
  it('accepts a complete review', () => {
    expect(receiptReviewSchema.safeParse(validReview).success).toBe(true)
  })

  it('requires human-checkable ledger fields', () => {
    const result = receiptReviewSchema.safeParse({ ...validReview, merchant: '', category: '', total: '18.999' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['merchant', 'category', 'total']))
  })
})

