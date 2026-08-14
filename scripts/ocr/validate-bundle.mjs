import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const forbidden = [
  'cdn.jsdelivr.net',
  'tessdata.projectnaptha.com',
  'supabase.co',
  'azurewebsites.net',
]

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  }))).flat()
}

const expectedModels = new Map([
  ['eng.traineddata', '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'],
  ['msa.traineddata', 'e41a3e5febfec50c90371eb1cbb17a48b10cad387900e3420b1f134c1b766cba'],
])

for (const [file, expected] of expectedModels) {
  const bytes = await readFile(resolve(root, 'dist/ocr/models', file))
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== expected) throw new Error(`Built OCR model checksum mismatch: ${file}`)
}

for (const relative of [
  'dist/ocr/runtime/worker.min.js',
  'dist/ocr/runtime/core/tesseract-core-lstm.wasm.js',
  'dist/ocr/runtime/core/tesseract-core-simd-lstm.wasm.js',
  'dist/ocr/runtime/core/tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  if ((await stat(resolve(root, relative))).size === 0) throw new Error(`Built OCR asset is empty: ${relative}`)
}

for (const file of await filesUnder(resolve(root, 'dist'))) {
  if (/\.traineddata$/i.test(file)) continue
  const content = (await readFile(file)).toString('utf8').toLowerCase()
  const match = forbidden.find((value) => content.includes(value))
  if (match) throw new Error(`Forbidden runtime endpoint ${match} found in ${file}`)
}

console.log('Built OCR assets and offline endpoint policy validated.')
