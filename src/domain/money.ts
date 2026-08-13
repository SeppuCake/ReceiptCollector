export function parseMoneyToMinor(value: string): number {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Invalid money value')
  }

  const [whole = '0', fraction = ''] = normalized.split('.')
  return Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0') || '0', 10)
}

export function formatMoney(minor: number | undefined, currency = 'MYR'): string {
  if (minor === undefined) return '—'
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100)
}

export function minorToInput(minor: number | undefined): string {
  return minor === undefined ? '' : (minor / 100).toFixed(2)
}

