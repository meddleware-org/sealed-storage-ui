import { describe, it, expect, vi } from 'vitest'

// Capture the config the app hands to SealController (the real one needs a live committee).
const { configs } = vi.hoisted(() => ({ configs: [] as Record<string, unknown>[] }))
vi.mock('@meddleware/sealed-storage-client/controller', () => ({
  SealController: class {
    constructor(cfg: Record<string, unknown>) {
      configs.push(cfg)
    }
  },
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({}) }))

// The controller is built from the recorded deployment, the committee and the threshold.
describe('getSealController', () => {
  // Passes the deployment ids, including the PolicyConfig version gate.
  it('passes the deployment ids, including the PolicyConfig version gate', async () => {
    const { getSealController } = await import('../src/seal.js')
    const { activeConfig } = await import('../src/config.js')
    await getSealController()
    const seal = activeConfig.value.seal!
    expect(configs[0]).toMatchObject({
      originalId: seal.originalId,
      publishedAt: seal.publishedAt,
      policyConfigId: seal.policyConfigId,
    })
    expect(seal.policyConfigId).toMatch(/^0x[0-9a-f]{64}$/)
  })
})
