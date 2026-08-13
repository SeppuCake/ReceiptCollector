import { expect, test, type Page } from '@playwright/test'
import { syntheticReceipt } from './fixtures/syntheticReceipt'

function prohibitOutboundRequests(page: Page): string[] {
  const violations: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['http:', 'https:'].includes(url.protocol)) return
    if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) violations.push(request.url())
  })
  return violations
}

async function importSyntheticReceipt(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Add (a|your first) receipt/ }).first().click()
  await page.locator('input[type="file"]').nth(1).setInputFiles(syntheticReceipt)
  await expect(page.getByRole('dialog', { name: 'Check the important bits' })).toBeVisible()
}

test('capture, reload, reject duplicate, review, export, offline reload, and delete', async ({ page, context }) => {
  const outbound = prohibitOutboundRequests(page)
  await page.goto('/')

  await importSyntheticReceipt(page)
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await page.reload()
  await expect(page.getByRole('button', { name: /Unreviewed receipt/ })).toBeVisible()
  await page.getByRole('button', { name: /Unreviewed receipt/ }).click()

  await page.getByLabel('Merchant').fill('Kedai Ujian')
  await page.getByLabel('Purchase date').fill('2025-01-15')
  await page.getByLabel('Total').fill('12.34')
  await page.getByLabel('Category').selectOption('Groceries')
  await page.getByLabel('Paid with').selectOption('Cash')
  await page.getByRole('button', { name: 'Confirm expense' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.locator('aside').getByRole('button', { name: 'Settings & export' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export 1 confirmed receipt/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^receipt-collector-\d{4}-\d{2}\.csv$/)

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Kedai Ujian/ })).toBeVisible()
  await context.setOffline(false)

  await page.locator('aside').getByRole('button', { name: 'Add receipt' }).click()
  await page.locator('input[type="file"]').nth(1).setInputFiles(syntheticReceipt)
  await expect(page.getByRole('alert')).toContainText('already in your inbox')

  await page.locator('aside').getByRole('button', { name: /Receipt inbox/ }).click()
  await page.getByRole('button', { name: /Kedai Ujian/ }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Your receipt inbox is empty')).toBeVisible()

  expect(outbound).toEqual([])
})

test('mobile navigation and primary controls are keyboard operable', async ({ page }) => {
  const outbound = prohibitOutboundRequests(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const menuButton = page.getByRole('button', { name: 'Open menu' })
  await menuButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Close menu' }).first()).toBeVisible()

  const inboxButton = page.locator('aside').getByRole('button', { name: /Receipt inbox/ })
  await inboxButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Receipt inbox', exact: true })).toBeVisible()
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
  expect(outbound).toEqual([])
})
