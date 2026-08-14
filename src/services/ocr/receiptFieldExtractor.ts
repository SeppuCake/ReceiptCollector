import type { OcrCandidate, ReceiptOcrCandidates, TextObservation } from '../../domain/ocr'
import type { ReceiptFieldExtractor } from '../../platform/contracts'

const TOTAL_LABEL = /\b(?:GRAND\s+TOTAL|TOTAL|JUMLAH|AMOUNT(?:\s+DUE)?)\b/i
const EXCLUDED_TOTAL_LABEL = /\b(?:SUB\s*TOTAL|TENDER(?:ED)?|CASH|CHANGE|ROUND(?:ING)?|BALANCE)\b/i
const TAX_LABEL = /\b(?:TAX|SST|GST|SERVICE\s+TAX|CUKAI)\b/i
const DATE_PATTERN = /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b|\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:20)?\d{2})\b/
const TEXTUAL_DATE_PATTERN = /\b(0?[1-9]|[12]\d|3[01])\s+(JAN(?:UARY|UARI)?|FEB(?:RUARY|RUARI)?|MAR(?:CH)?|MAC|APR(?:IL)?|MAY|MEI|JUN(?:E)?|JUL(?:Y|AI)?|AUG(?:UST)?|OGOS|SEP(?:TEMBER)?|OCT(?:OBER)?|OKTOBER|NOV(?:EMBER)?|DEC(?:EMBER)?|DISEMBER)\s+(20\d{2})\b/i
const AMOUNT_PATTERN = /(?:\b(RM|MYR)\s*)?(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi

const months = new Map([
  ['JAN', 1], ['FEB', 2], ['MAR', 3], ['MAC', 3], ['APR', 4], ['MAY', 5], ['MEI', 5], ['JUN', 6],
  ['JUL', 7], ['AUG', 8], ['OGO', 8], ['SEP', 9], ['OCT', 10], ['OKT', 10], ['NOV', 11], ['DEC', 12], ['DIS', 12],
])

function evidence(observation: TextObservation) {
  return { page: observation.page, text: observation.text, ...(observation.boundingBox ? { boundingBox: observation.boundingBox } : {}) }
}
function validDate(year: number, month: number, day: number): string | undefined {
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return undefined
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDate(text: string): string | undefined {
  const numeric = DATE_PATTERN.exec(text)
  if (numeric) {
    if (numeric[1]) return validDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]))
    const yearText = numeric[6]!
    return validDate(yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText), Number(numeric[5]), Number(numeric[4]))
  }
  const textual = TEXTUAL_DATE_PATTERN.exec(text)
  if (!textual) return undefined
  const month = months.get(textual[2]!.slice(0, 3).toUpperCase())
  return month ? validDate(Number(textual[3]), month, Number(textual[1])) : undefined
}

function parseAmount(raw: string): number | undefined {
  let normalized = raw.replace(/\s/g, '')
  const lastDot = normalized.lastIndexOf('.')
  const lastComma = normalized.lastIndexOf(',')
  const decimalIndex = Math.max(lastDot, lastComma)
  if (decimalIndex >= 0 && normalized.length - decimalIndex - 1 === 2) {
    normalized = `${normalized.slice(0, decimalIndex).replace(/[.,]/g, '')}.${normalized.slice(decimalIndex + 1)}`
  } else {
    normalized = normalized.replace(/[.,]/g, '')
  }
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0 || value > 99_999_999.99) return undefined
  return Math.round(value * 100)
}

function amountCandidates(observation: TextObservation, confidenceBoost: number): OcrCandidate<number>[] {
  const results: OcrCandidate<number>[] = []
  for (const match of observation.text.matchAll(AMOUNT_PATTERN)) {
    const matchEnd = (match.index ?? 0) + match[0].length
    if (observation.text.slice(matchEnd).trimStart().startsWith('%')) continue
    const value = parseAmount(match[2]!)
    if (value === undefined) continue
    results.push({
      value,
      confidence: Math.min(
        1,
        observation.confidence + confidenceBoost + (match[1] ? 0.04 : 0) + (matchEnd / observation.text.length) * 0.02,
      ),
      language: observation.language,
      evidence: evidence(observation),
    })
  }
  return results
}

function uniqueSorted<T>(candidates: readonly OcrCandidate<T>[]): OcrCandidate<T>[] {
  const seen = new Set<string>()
  return [...candidates]
    .sort((left, right) => right.confidence - left.confidence)
    .filter((candidate) => {
      const key = JSON.stringify(candidate.value)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export class DeterministicReceiptFieldExtractor implements ReceiptFieldExtractor {
  extract(observations: readonly TextObservation[]): ReceiptOcrCandidates {
    const usable = observations.filter((observation) => observation.text.trim().length > 0)
    const merchant: OcrCandidate<string>[] = []
    const transactionDate: OcrCandidate<string>[] = []
    const totalMinor: OcrCandidate<number>[] = []
    const taxMinor: OcrCandidate<number>[] = []
    const currency: OcrCandidate<'MYR'>[] = []

    for (const [index, observation] of usable.entries()) {
      const text = observation.text.trim()
      const parsedDate = parseDate(text)
      if (parsedDate) transactionDate.push({ value: parsedDate, confidence: observation.confidence, language: observation.language, evidence: evidence(observation) })

      if (/\b(?:RM|MYR)\b/i.test(text)) {
        currency.push({ value: 'MYR', confidence: Math.min(1, observation.confidence + 0.1), language: observation.language, evidence: evidence(observation) })
      }

      if (TOTAL_LABEL.test(text) && !EXCLUDED_TOTAL_LABEL.test(text)) totalMinor.push(...amountCandidates(observation, 0.12))
      if (TAX_LABEL.test(text) && !/SUB\s*TOTAL/i.test(text)) taxMinor.push(...amountCandidates(observation, 0.08))

      if (
        index < 5 &&
        text.length >= 3 && text.length <= 160 &&
        !/(?:RECEIPT|INVOICE|TAX|SST|GST|TOTAL|JUMLAH|AMOUNT|DATE|TEL|PHONE|ADDRESS|NO\.|SDN\.?\s*BHD\.?\s*\d)/i.test(text) &&
        !DATE_PATTERN.test(text) && !/^\W*\d/.test(text)
      ) {
        merchant.push({ value: text.replace(/\s+/g, ' '), confidence: Math.min(1, observation.confidence + Math.max(0, 0.12 - index * 0.025)), language: observation.language, evidence: evidence(observation) })
      }
    }

    return {
      merchant: uniqueSorted(merchant),
      transactionDate: uniqueSorted(transactionDate),
      totalMinor: uniqueSorted(totalMinor),
      taxMinor: uniqueSorted(taxMinor),
      currency: uniqueSorted(currency),
    }
  }
}
