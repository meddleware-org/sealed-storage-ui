// What a person reads when Sealed Storage cannot be used: plain words, the networks to switch to taken from the deployment records.
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('@meddleware/sealed-storage-client/deployments')
  vi.resetModules()
})

/** The availability messages as they read when the records hold exactly these networks. */
async function withRecords(networks: string[]) {
  vi.resetModules()
  vi.doMock('@meddleware/sealed-storage-client/deployments', () => ({
    SEAL_POLICIES_DEPLOYMENTS: Object.fromEntries(networks.map((n) => [n, { originalId: '0x1', publishedAt: '0x1', policyConfigId: '0x2' }])),
  }))
  return import('../src/availability.js')
}

describe('availability messages', () => {
  it('offer the other network that has a recorded deployment', async () => {
    const m = await withRecords(['testnet'])
    expect(m.notAvailableOn('mainnet')).toBe('Sealed Storage is not available on mainnet. Switch to testnet.')
    expect(m.notAvailableNow('mainnet')).toBe('Sealed Storage is not available here right now. Try again later or switch to testnet.')
  })

  it('never offer the network the person is on, and drop the suggestion where there is no other', async () => {
    const m = await withRecords(['testnet'])
    expect(m.otherDeployedNetworks('testnet')).toEqual([])
    expect(m.notAvailableNow('testnet')).toBe('Sealed Storage is not available here right now. Try again later.')
    expect(m.notAvailableOn('testnet')).toBe('Sealed Storage is not available on testnet.')
  })

  it('follow the records: once mainnet has a deployment it is offered from testnet', async () => {
    const m = await withRecords(['testnet', 'mainnet'])
    expect(m.notAvailableNow('testnet')).toBe('Sealed Storage is not available here right now. Try again later or switch to mainnet.')
    expect(m.notAvailableOn('localnet')).toBe('Sealed Storage is not available on localnet. Switch to testnet or mainnet.')
  })

  it('name no setting, script, file or deployment', async () => {
    const m = await withRecords(['testnet'])
    for (const text of [m.notAvailableOn('mainnet'), m.notAvailableNow('mainnet')]) expect(text).not.toMatch(/VITE_|operator|deployment|sealed_storage|configur/i)
  })
})
