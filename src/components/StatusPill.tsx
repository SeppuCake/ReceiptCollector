import type { ReceiptStatus } from '../domain/receipt'

const labels: Record<ReceiptStatus, string> = {
  needs_review: 'Needs review',
  confirmed: 'Confirmed',
  processing: 'Reading receipt',
  failed: 'Needs attention',
}

export function StatusPill({ status }: { status: ReceiptStatus }) {
  return <span className={`status-pill status-${status}`}>{labels[status]}</span>
}

