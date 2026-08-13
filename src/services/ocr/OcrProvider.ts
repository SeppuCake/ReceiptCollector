export interface OcrField<T> {
  value?: T
  confidence?: number
}

export interface ReceiptOcrResult {
  provider: string
  merchant: OcrField<string>
  transactionDate: OcrField<string>
  totalMinor: OcrField<number>
  taxMinor: OcrField<number>
  currency: OcrField<string>
  raw: unknown
}

export interface OcrProvider {
  analyze(receiptId: string): Promise<ReceiptOcrResult>
}

