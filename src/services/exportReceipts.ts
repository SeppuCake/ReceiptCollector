import type { ReceiptRecord } from '../domain/receipt'

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function receiptsToCsv(receipts: ReceiptRecord[]): string {
  const headers = ['Date', 'Merchant', 'Category', 'Payment method', 'Currency', 'Total', 'Tax', 'Notes', 'Receipt ID']
  const rows = receipts
    .filter((receipt) => receipt.status === 'confirmed')
    .sort((a, b) => (a.transactionDate ?? '').localeCompare(b.transactionDate ?? ''))
    .map((receipt) => [
      receipt.transactionDate,
      receipt.merchant,
      receipt.category,
      receipt.paymentMethod,
      receipt.currency,
      receipt.totalMinor === undefined ? undefined : (receipt.totalMinor / 100).toFixed(2),
      receipt.taxMinor === undefined ? undefined : (receipt.taxMinor / 100).toFixed(2),
      receipt.notes,
      receipt.id,
    ])

  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(receipts: ReceiptRecord[]): void {
  const blob = new Blob([`\uFEFF${receiptsToCsv(receipts)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const month = new Date().toISOString().slice(0, 7)
  link.href = url
  link.download = `receipt-collector-${month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

