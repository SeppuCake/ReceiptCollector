import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const requiredFields = [
  'id', 'authority', 'title', 'version', 'publicationDate', 'retrievalDate',
  'officialUrl', 'sha256', 'effectivePeriod', 'supersedes', 'scope',
  'applicationRelease', 'status', 'rulePack',
]

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function periodsOverlap(left, right) {
  const leftEnd = left.to ?? '9999-12-31'
  const rightEnd = right.to ?? '9999-12-31'
  return left.from <= rightEnd && right.from <= leftEnd
}

function validateRegister(registerPath) {
  const errors = []
  let register
  try {
    register = JSON.parse(readFileSync(registerPath, 'utf8'))
  } catch (error) {
    return [`${registerPath}: cannot parse register: ${error instanceof Error ? error.message : String(error)}`]
  }

  if (register?.formatVersion !== 1) errors.push('formatVersion must be 1')
  if (!Array.isArray(register?.entries)) return [...errors, 'entries must be an array']

  const ids = new Set()
  for (const [index, entry] of register.entries.entries()) {
    const label = `entries[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object`)
      continue
    }
    for (const field of requiredFields) {
      if (!(field in entry)) errors.push(`${label}.${field} is required`)
    }
    if (typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9.-]+$/.test(entry.id)) errors.push(`${label}.id is malformed`)
    if (ids.has(entry.id)) errors.push(`${label}.id is duplicated: ${entry.id}`)
    ids.add(entry.id)
    for (const field of ['authority', 'title', 'version', 'scope', 'applicationRelease']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') errors.push(`${label}.${field} must be a non-empty string`)
    }
    if (!isDate(entry.publicationDate)) errors.push(`${label}.publicationDate must be a real YYYY-MM-DD date`)
    if (!isDate(entry.retrievalDate)) errors.push(`${label}.retrievalDate must be a real YYYY-MM-DD date`)
    if (isDate(entry.publicationDate) && isDate(entry.retrievalDate) && entry.publicationDate > entry.retrievalDate) {
      errors.push(`${label}.publicationDate cannot follow retrievalDate`)
    }
    try {
      const url = new URL(entry.officialUrl)
      if (url.protocol !== 'https:') errors.push(`${label}.officialUrl must use HTTPS`)
    } catch {
      errors.push(`${label}.officialUrl must be an absolute URL`)
    }
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) errors.push(`${label}.sha256 must be 64 lowercase hexadecimal characters`)
    if (!entry.effectivePeriod || !isDate(entry.effectivePeriod.from) || !(entry.effectivePeriod.to === null || isDate(entry.effectivePeriod.to))) {
      errors.push(`${label}.effectivePeriod must contain a valid from date and a valid or null to date`)
    } else if (entry.effectivePeriod.to !== null && entry.effectivePeriod.from > entry.effectivePeriod.to) {
      errors.push(`${label}.effectivePeriod.from cannot follow effectivePeriod.to`)
    }
    if (!Array.isArray(entry.supersedes) || entry.supersedes.some((id) => typeof id !== 'string')) errors.push(`${label}.supersedes must be a string array`)
    if (!['registered', 'active', 'superseded'].includes(entry.status)) errors.push(`${label}.status is invalid`)

    if (typeof entry.rulePack !== 'string' || entry.rulePack.trim() === '' || isAbsolute(entry.rulePack)) {
      errors.push(`${label}.rulePack must be a relative path`)
    } else {
      const base = dirname(resolve(registerPath))
      const packPath = resolve(base, entry.rulePack)
      const escaped = relative(base, packPath).startsWith('..')
      if (escaped) errors.push(`${label}.rulePack escapes the register directory`)
      else if (!existsSync(packPath) || !statSync(packPath).isFile()) errors.push(`${label}.rulePack does not exist: ${entry.rulePack}`)
      else {
        const actual = createHash('sha256').update(readFileSync(packPath)).digest('hex')
        if (actual !== entry.sha256) errors.push(`${label}.sha256 does not match ${entry.rulePack}`)
      }
    }
  }

  for (const entry of register.entries) {
    if (!entry || !Array.isArray(entry.supersedes)) continue
    for (const supersededId of entry.supersedes) {
      if (supersededId === entry.id) errors.push(`${entry.id} cannot supersede itself`)
      if (!ids.has(supersededId)) errors.push(`${entry.id} supersedes unknown id ${supersededId}`)
    }
  }

  const active = register.entries.filter((entry) => entry?.status === 'active' && entry.effectivePeriod)
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const a = active[left]
      const b = active[right]
      if (a.scope === b.scope && periodsOverlap(a.effectivePeriod, b.effectivePeriod)) {
        errors.push(`ambiguous active packs ${a.id} and ${b.id} overlap for scope ${a.scope}`)
      }
    }
  }
  return errors
}

function report(registerPath, errors, expectedValid) {
  const display = relative(projectRoot, registerPath)
  if (expectedValid && errors.length === 0) {
    console.log(`PASS ${display}`)
    return true
  }
  if (!expectedValid && errors.length > 0) {
    console.log(`PASS rejected invalid fixture ${display}`)
    return true
  }
  if (!expectedValid) console.error(`FAIL invalid fixture unexpectedly passed: ${display}`)
  for (const error of errors) console.error(`FAIL ${display}: ${error}`)
  return false
}

const requested = process.argv[2]
if (requested) {
  const registerPath = resolve(projectRoot, requested)
  const errors = validateRegister(registerPath)
  for (const error of errors) console.error(`FAIL ${relative(projectRoot, registerPath)}: ${error}`)
  if (errors.length > 0) process.exitCode = 1
  else console.log(`PASS ${relative(projectRoot, registerPath)}`)
} else {
  let passed = true
  const main = resolve(projectRoot, 'docs/regulatory/register.json')
  const positive = resolve(projectRoot, 'docs/regulatory/fixtures/valid/register.json')
  passed = report(main, validateRegister(main), true) && passed
  passed = report(positive, validateRegister(positive), true) && passed

  const invalidDirectory = resolve(projectRoot, 'docs/regulatory/fixtures/invalid')
  const invalidFixtures = readdirSync(invalidDirectory)
    .filter((name) => name.endsWith('.json') && name !== 'pack.json')
    .map((name) => resolve(invalidDirectory, name))
  for (const fixture of invalidFixtures) passed = report(fixture, validateRegister(fixture), false) && passed
  if (!passed) process.exitCode = 1
}
