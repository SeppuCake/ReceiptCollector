import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const runtime = resolve(root, 'public/ocr/runtime')
const coreTarget = resolve(runtime, 'core')
const modelRoot = resolve(root, 'public/ocr/models')

const expectedModels = new Map([
  ['eng.traineddata', '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'],
  ['msa.traineddata', 'e41a3e5febfec50c90371eb1cbb17a48b10cad387900e3420b1f134c1b766cba'],
])

await mkdir(coreTarget, { recursive: true })

for (const [file, expected] of expectedModels) {
  const bytes = await readFile(resolve(modelRoot, file))
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== expected) throw new Error(`OCR model checksum mismatch: ${file}`)
}

let worker = await readFile(resolve(root, 'node_modules/tesseract.js/dist/worker.min.js'), 'utf8')
worker = worker
  .replaceAll('https://cdn.jsdelivr.net', '/ocr/runtime/blocked-cdn')
  .replaceAll('https://tessdata.projectnaptha.com', '/ocr/runtime/blocked-model-host')
if (/https:\/\/(?:cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)/.test(worker)) {
  throw new Error('An OCR CDN URL remains in the local worker.')
}
await writeFile(resolve(runtime, 'worker.min.js'), worker)

for (const file of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  await copyFile(resolve(root, 'node_modules/tesseract.js-core', file), resolve(coreTarget, file))
}

await mkdir(resolve(runtime, 'licenses'), { recursive: true })
await copyFile(resolve(root, 'node_modules/tesseract.js/LICENSE.md'), resolve(runtime, 'licenses/tesseract-js-Apache-2.0.txt'))
await copyFile(resolve(root, 'node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt'), resolve(runtime, 'licenses/worker-third-party.txt'))

console.log('Local OCR assets prepared and model checksums verified.')
