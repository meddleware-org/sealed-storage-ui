// Smoke tests of the built app (the e2e build: a mock wallet, a stub chain, a stand-in Seal controller): the shell mounts without an
// uncaught error, and each tab does its job end to end against the stand-ins: seal and store, publish a pointer, decrypt.
import { expect, test } from '@playwright/test'
import { E2E_GATES, E2E_GATE_OWNER } from '../src/e2e-data.js'
import { BLOB_ID, BLOB_OBJECT, END_EPOCH, MANIFEST, confirm, decryptReady, disconnected, sealed, unlock } from './open.js'

test('mounts, shows its landmarks and the tabs, and asks for a wallet first', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await disconnected(page)
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sealed Storage')
  for (const name of ['Encrypt', 'Decrypt', 'Unlock']) await expect(page.getByRole('tab', { name, exact: true })).toBeVisible()
  await expect(page.getByText('Connect a Sui wallet to encrypt and decrypt sealed content.').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the Confirm step shows everything the content is sealed to, including who owns the gate', async ({ page }) => {
  await confirm(page)
  await expect(page.getByText('Studio pass').first()).toHaveCount(0) // the picker is gone; the id is what is sealed to
  const summary = page.getByRole('term').first()
  await expect(summary).toBeVisible()
  await expect(page.getByText(E2E_GATES.studio)).toBeVisible()
  await expect(page.getByText('Gate owner', { exact: true })).toBeVisible()
  await expect(page.getByText(E2E_GATE_OWNER)).toBeVisible()
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText(/Stored on Walrus for 5 epochs/)).toBeVisible()
})

test('sealing stores the ciphertext, shows the manifest and the lifetime, and publishes a pointer', async ({ page }) => {
  await sealed(page)
  const manifest = page.getByRole('figure').getByRole('code')
  await expect(manifest).toContainText(BLOB_ID)
  await expect(manifest).toContainText('"network": "testnet"')
  await expect(page.getByText(`through epoch ${END_EPOCH}`)).toBeVisible()
  await expect(page.getByText(BLOB_OBJECT)).toBeVisible()
  await expect(page.getByText('Sealed. Keep the manifest — you need it to decrypt.')).toBeVisible()

  await page.getByRole('button', { name: 'Publish discovery pointer' }).click()
  await expect(page.getByRole('link', { name: /^E2Eaaaaaaa/ })).toBeVisible()
  await expect(page.getByText('Published — gate pass-holders can now discover and unlock this content.')).toBeVisible()
})

test('decrypting reads the ciphertext back, asks the wallet to sign, and offers the file', async ({ page }) => {
  await decryptReady(page)
  await page.getByLabel('Your pass NFT *').fill(`0x${'d4'.repeat(32)}`)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Decrypt', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('notes.txt')
  await expect(page.getByText('Decrypted — download started.')).toBeVisible()
})

test('a manifest for another network is refused with the reason', async ({ page }) => {
  await decryptReady(page)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByLabel('Manifest (paste JSON or upload)').fill(MANIFEST.replace('"testnet"', '"mainnet"'))
  await expect(page.getByText(/is for 'mainnet', but this app is on 'testnet'/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
})

test('the Unlock tab offers the gates this account administers', async ({ page }) => {
  await unlock(page)
  const options = page.getByRole('combobox', { name: 'Access gate ID' }).getByRole('option')
  await expect(options).toHaveText(['Select a gate…', 'Studio pass', 'Open pass'])
})
