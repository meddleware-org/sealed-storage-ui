import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountView } from './support/mount.js'

// SealedStorageView with its config mocked, so the active network's configuration can be driven and the gating notices asserted without a
// wallet, key-server committee, or Walrus endpoint. The notices sit outside the wallet prompt and follow `activeConfig`, so their presence
// is the wallet-independent gating signal.
const warnings = (w: Awaited<ReturnType<typeof mountView>>['wrapper']) => w.findAll('.mw-notice--warning')

afterEach(() => vi.resetModules())

describe('SealedStorageView network gating', () => {
  it('shows why sealing is unavailable on the active network', async () => {
    const t = await mountView({
      network: 'mainnet',
      address: null,
      problem: 'Sealed Storage is not available on mainnet: no sealed_storage deployment is recorded for it.',
    })
    expect(warnings(t.wrapper)).toHaveLength(1)
    expect(t.wrapper.text()).toContain('not available on mainnet')
  })

  it('shows a configuration problem', async () => {
    const t = await mountView({
      network: 'localnet',
      address: null,
      problem: 'Sealed Storage is not configured on localnet: set VITE_SEAL_SERVER_OBJECT_IDS_LOCALNET',
    })
    expect(t.wrapper.text()).toContain('VITE_SEAL_SERVER_OBJECT_IDS_LOCALNET')
  })

  it('hides the notice when configured', async () => {
    const t = await mountView({ network: 'testnet', address: null })
    expect(warnings(t.wrapper)).toHaveLength(0)
  })

  it('warns that the operator could decrypt when its own key server is in use', async () => {
    const t = await mountView({ network: 'mainnet', address: null, custody: 'operator' })
    expect(warnings(t.wrapper)).toHaveLength(1)
    expect(t.wrapper.text()).toContain("run by this site's operator, who could therefore decrypt it")
  })

  it('shows no custody notice for independent key servers', async () => {
    const t = await mountView({ network: 'mainnet', address: null, custody: 'independent' })
    expect(t.wrapper.text()).not.toContain('could therefore decrypt')
  })

  it('disables sealing, not the rest of the page, when it is unavailable', async () => {
    const t = await mountView({ network: 'mainnet', address: '0xowner', problem: 'unavailable' })
    const next = t.wrapper.findAll('button').find((b) => b.text() === 'Next')!
    expect(next.attributes('disabled')).toBeDefined()
    expect(t.wrapper.findAll('[role="tab"]')).toHaveLength(3)
  })
})
