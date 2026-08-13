import { describe, expect, it } from 'vitest'
import { formatMoney, minorToInput, parseMoneyToMinor } from './money'

describe('money helpers', () => {
  it.each([
    ['0', 0],
    ['1', 100],
    ['12.3', 1230],
    ['12.34', 1234],
    ['99999999.99', 9_999_999_999],
  ])('parses %s without floating-point rounding', (input, expected) => {
    expect(parseMoneyToMinor(input)).toBe(expected)
  })

  it('rejects ambiguous or over-precise values', () => {
    expect(() => parseMoneyToMinor('1.234')).toThrow('Invalid money value')
    expect(() => parseMoneyToMinor('-1.00')).toThrow('Invalid money value')
    expect(() => parseMoneyToMinor('RM 10')).toThrow('Invalid money value')
  })

  it('formats minor units for Malaysian display and form editing', () => {
    expect(formatMoney(1234)).toContain('12.34')
    expect(minorToInput(1234)).toBe('12.34')
    expect(minorToInput(undefined)).toBe('')
  })
})

