import { expect, test, type Page } from '@playwright/test'

function prohibitOutboundRequests(page: Page): string[] {
  const violations: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['http:', 'https:'].includes(url.protocol)) return
    if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) violations.push(request.url())
  })
  return violations
}

async function makeSyntheticReceipt(page: Page, path: string, merchant: string, total: string): Promise<void> {
  await page.setContent(`
    <style>
      body { margin: 0; background: white; color: black; font-family: Arial, sans-serif; }
      #receipt { box-sizing: border-box; width: 1200px; height: 900px; padding: 80px; background: white; }
      h1 { margin: 0 0 70px; font-size: 72px; letter-spacing: 2px; }
      p { margin: 30px 0; font-size: 55px; font-weight: 700; }
    </style>
    <main id="receipt">
      <h1>${merchant}</h1>
      <p>DATE: 15/01/2025</p>
      <p>SUBTOTAL RM 11.60</p>
      <p>SST RM 0.74</p>
      <p>GRAND TOTAL RM ${total}</p>
    </main>
  `)
  await page.locator('#receipt').screenshot({ path })
}

async function openImportedReceipt(page: Page, path: string): Promise<void> {
  await page.getByRole('button', { name: /Add(?: a| your first)? receipt/ }).first().click()
  await page.locator('input[type="file"]').nth(1).setInputFiles(path)
  await expect(page.getByRole('dialog', { name: 'Check the important bits' })).toBeVisible()
}

async function waitForOcr(page: Page): Promise<void> {
  await expect(page.getByText('OCR suggestion — please verify', { exact: true })).toBeVisible({ timeout: 120_000 })
}

test('real bundled OCR prefills fields locally and still requires human confirmation', async ({ page, context }, testInfo) => {
  const firstReceipt = testInfo.outputPath('synthetic-ocr-receipt.png')
  const secondReceipt = testInfo.outputPath('synthetic-offline-ocr-receipt.png')
  await makeSyntheticReceipt(page, firstReceipt, 'KEDAI UJIAN MAJU', '12.34')
  await makeSyntheticReceipt(page, secondReceipt, 'KEDAI LUAR TALIAN', '22.34')

  const outbound = prohibitOutboundRequests(page)
  await page.goto('/')
  await openImportedReceipt(page, firstReceipt)
  await waitForOcr(page)
  await expect(page.getByLabel('Merchant')).toHaveValue('KEDAI UJIAN MAJU')
  await expect(page.getByLabel('Purchase date')).toHaveValue('2025-01-15')
  await expect(page.getByLabel('Total')).toHaveValue('12.34')
  await expect(page.getByLabel('Tax')).toHaveValue('0.74')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.locator('.status-pill', { hasText: 'Needs review' })).toBeVisible()

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await openImportedReceipt(page, secondReceipt)
  await page.getByLabel('Merchant').fill('USER CHECKED MERCHANT')
  await waitForOcr(page)
  await expect(page.getByLabel('Merchant')).toHaveValue('USER CHECKED MERCHANT')
  await expect(page.getByLabel('Total')).toHaveValue('22.34')
  await context.setOffline(false)

  expect(outbound).toEqual([])
})
