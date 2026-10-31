import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'
import { E2E_GATES } from '../src/e2e-data.js'

export const PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
export const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
export const BLOB_ID = 'A'.repeat(43)
export const BLOB_OBJECT = `0x${'b1'.repeat(32)}`
/** The Seal identity the stand-in controller gives every ciphertext. */
export const SEAL_ID = 'ab'.repeat(48)
export const END_EPOCH = 17

/** A manifest as the Encrypt tab would have produced it for the studio gate. */
export const MANIFEST = JSON.stringify({
  policyType: 'nft-gate',
  id: SEAL_ID,
  blobId: BLOB_ID,
  network: 'testnet',
  params: { gateId: E2E_GATES.studio },
  label: 'notes.txt',
})

/** The built app (the e2e build: a mock wallet, a stub chain, a stand-in Seal controller), with the Walrus endpoints answered in the page and every other request that leaves localhost refused. */
export async function launch(page: Page): Promise<void> {
  await offline(page)
  await page.route(`${PUBLISHER}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ newlyCreated: { blobObject: { id: BLOB_OBJECT, blobId: BLOB_ID }, resource: { endEpoch: END_EPOCH } } }),
    }),
  )
  await page.route(`${AGGREGATOR}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'secret contents' }))
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Sealed Storage' }).waitFor()
}

export const disconnected = launch

/** Connected, on the Encrypt tab's first step. */
export async function connected(page: Page): Promise<void> {
  await launch(page)
  await connectMockWallet(page)
  await page.getByRole('combobox', { name: 'Policy' }).waitFor()
}

/** The Encrypt tab's second step: the policy's fields. */
export async function details(page: Page): Promise<void> {
  await connected(page)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('File', { exact: true }).waitFor()
}

/** The third step: the studio gate and a file chosen, ready to confirm. */
export async function confirm(page: Page): Promise<void> {
  await details(page)
  await page.getByRole('combobox', { name: /Access gate ID/ }).selectOption({ label: 'Studio pass' })
  await page.getByLabel('Label (optional)').fill('notes')
  await page.getByLabel('File', { exact: true }).setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('secret contents') })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Encrypt & store' }).waitFor()
}

/** Sealed: the manifest and where the ciphertext is stored. */
export async function sealed(page: Page): Promise<void> {
  await confirm(page)
  await page.getByRole('button', { name: 'Encrypt & store' }).click()
  await page.getByRole('button', { name: 'Download manifest' }).waitFor()
}

/** The Decrypt tab with nothing pasted yet. */
export async function decrypt(page: Page): Promise<void> {
  await connected(page)
  await page.getByRole('tab', { name: 'Decrypt', exact: true }).click()
  await page.getByLabel('Manifest (paste JSON or upload)').waitFor()
}

/** The Decrypt tab's second step, for a pasted manifest. */
export async function decryptReady(page: Page): Promise<void> {
  await decrypt(page)
  await page.getByLabel('Manifest (paste JSON or upload)').fill(MANIFEST)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Decrypt', exact: true }).waitFor()
}

/** The Unlock tab's first step. */
export async function unlock(page: Page): Promise<void> {
  await connected(page)
  await page.getByRole('tab', { name: 'Unlock', exact: true }).click()
  await page.getByRole('button', { name: 'Find sealed content' }).waitFor()
}
