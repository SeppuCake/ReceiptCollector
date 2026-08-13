import { z } from 'zod'

export const receiptStatuses = ['needs_review', 'confirmed', 'processing', 'failed'] as const
export type ReceiptStatus = (typeof receiptStatuses)[number]

export const receiptSources = ['camera', 'files', 'share'] as const
export type ReceiptSource = (typeof receiptSources)[number]

export const syncStates = ['local', 'queued', 'synced', 'failed'] as const
export type SyncState = (typeof syncStates)[number]

export const categories = [
  'Groceries',
  'Dining',
  'Transport',
  'Household',
  'Health',
  'Utilities',
  'Shopping',
  'Work',
  'Other',
] as const

export const paymentMethods = [
  'Cash',
  'Debit card',
  'Credit card',
  'Bank transfer',
  'Touch ‘n Go',
  'GrabPay',
  'ShopeePay',
  'Other',
] as const

export interface ReceiptRecord {
  id: string
  capturedAt: string
  updatedAt: string
  source: ReceiptSource
  status: ReceiptStatus
  syncState: SyncState
  fileCount: number
  primaryFileId: string
  merchant?: string
  transactionDate?: string
  totalMinor?: number
  taxMinor?: number
  currency: 'MYR'
  category?: string
  paymentMethod?: string
  notes?: string
  ocrConfidence?: number
  failureReason?: string
}

export interface ReceiptAsset {
  id: string
  receiptId: string
  createdAt: string
  name: string
  mimeType: string
  size: number
  sha256: string
  blob: Blob
}

export const receiptReviewSchema = z.object({
  merchant: z.string().trim().min(1, 'Merchant is required').max(160),
  transactionDate: z.string().date('Enter a valid date'),
  total: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,2})?$/, 'Use an amount such as 12.50')
    .refine((value) => Number(value) <= 99_999_999.99, 'Amount is too large'),
  tax: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+(?:\.\d{1,2})?$/.test(value), 'Use an amount such as 1.20'),
  category: z.string().trim().min(1, 'Category is required'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1,000 characters'),
})

export type ReceiptReviewInput = z.infer<typeof receiptReviewSchema>

