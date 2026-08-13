import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const preview = spawn(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173'],
  { cwd: root, stdio: 'ignore', windowsHide: true },
)

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

async function waitForPreview() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited with code ${preview.exitCode}`)
    try {
      const response = await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(1_000) })
      if (response.ok) return
    } catch {
      // The local server is still starting.
    }
    await delay(250)
  }
  throw new Error('Timed out waiting for the loopback Vite preview server.')
}

async function run() {
  await waitForPreview()
  const playwright = spawn(
    process.execPath,
    [resolve(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', resolve(root, 'playwright.config.ts')],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  )
  return await new Promise((resolveExit, reject) => {
    playwright.once('error', reject)
    playwright.once('exit', (code, signal) => {
      if (signal) reject(new Error(`Playwright exited on signal ${signal}`))
      else resolveExit(code ?? 1)
    })
  })
}

let exitCode = 1
try {
  exitCode = await run()
} catch (error) {
  console.error(error)
} finally {
  preview.kill()
}
process.exitCode = exitCode
