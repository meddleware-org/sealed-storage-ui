import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountView } from './support/mount.js'

// SealedStorageView with its config mocked, so the active network's configuration can be driven and the gating notices asserted without a
// wallet, key-server committee, or Walrus endpoint. The notices sit outside the wallet prompt and follow `activeConfig`, so their presence
// is the wallet-independent gating signal.
const warnings = (w: Awaited<ReturnType<typeof mountView>>['wrapper']) => w.findAll('.mw-notice--warning')

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@meddleware/ui')
  vi.restoreAllMocks()
})

describe('SealedStorageView network gating', () => {
  it('shows why sealing is unavailable on the active network', async () => {
    const t = await mountView({
      network: 'mainnet',
      address: null,
      problem: 'Sealed Storage is not available on mainnet. Switch to testnet.',
    })
    expect(warnings(t.wrapper)).toHaveLength(1)
    expect(t.wrapper.text()).toContain('not available on mainnet. Switch to testnet.')
  })

  it('shows a configuration problem as what a person can do, naming no setting', async () => {
    const t = await mountView({
      network: 'mainnet',
      address: null,
      problem: 'Sealed Storage is not available here right now. Try again later or switch to testnet.',
    })
    expect(t.wrapper.text()).toContain('Try again later or switch to testnet.')
    expect(t.wrapper.text()).not.toMatch(/VITE_|operator/i)
  })

  it('renders a real configuration fault as plain words and sends the technical detail to the console', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    // a build whose threshold is more than the committee's total weight
    vi.doMock('@meddleware/ui', async (importOriginal) => {
      const ui = await importOriginal<typeof import('@meddleware/ui')>()
      return { ...ui, withRuntimeEnv: (e: Record<string, unknown>) => ({ ...e, VITE_SEAL_THRESHOLD_TESTNET: '9' }) }
    })
    const t = await mountView({ network: 'testnet', address: null, realConfig: true })
    expect(t.wrapper.text()).toContain('Sealed Storage is not available here right now. Try again later.')
    expect(t.wrapper.text()).not.toMatch(/VITE_|operator/i)
    expect(t.wrapper.html()).not.toMatch(/VITE_|operator/i)
    expect(logged).toHaveBeenCalledTimes(1)
    expect(logged.mock.calls[0][0]).toMatch(/VITE_SEAL_THRESHOLD_TESTNET/)
  })

  it('hides the notice when configured', async () => {
    const t = await mountView({ network: 'testnet', address: null })
    expect(warnings(t.wrapper)).toHaveLength(0)
  })

  it('warns that Meddleware could decrypt when its own key server is in use', async () => {
    const t = await mountView({ network: 'mainnet', address: null, custody: 'operator' })
    expect(warnings(t.wrapper)).toHaveLength(1)
    expect(t.wrapper.text()).toContain('run by Meddleware, who could therefore decrypt it')
    expect(t.wrapper.text()).not.toMatch(/operator/i)
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
