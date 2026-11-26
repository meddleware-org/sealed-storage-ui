// The manifest check (src/manifest-guard.ts): a valid same-network manifest is accepted, and a malformed, incomplete or other-network one is refused with a reason a
// person can read; with the policy registry, an unknown policy or bad parameters fail here and not at transaction time.
import { describe, it, expect } from 'vitest'
import { createDefaultRegistry } from '@meddleware/sealed-storage-client'
import { checkManifestForNetwork } from '../src/manifest-guard.js'

const valid = {
  policyType: 'nft-gate',
  id: 'abcd',
  blobId: 'blob1',
  network: 'testnet',
  params: { gateId: '0x1' },
}

// Accepted and refused manifests.
describe('checkManifestForNetwork', () => {
  // Accepts a valid same-network manifest.
  it('accepts a valid same-network manifest', () => {
    const r = checkManifestForNetwork(JSON.stringify(valid), 'testnet')
    expect(r.error).toBeNull()
    expect(r.manifest?.blobId).toBe('blob1')
  })

  // Returns nulls for empty/whitespace input.
  it('returns nulls for empty/whitespace input', () => {
    const r = checkManifestForNetwork('   ', 'testnet')
    expect(r.manifest).toBeNull()
    expect(r.error).toBeNull()
  })

  // Rejects a cross-network manifest with an explanatory error naming both networks.
  it('rejects a cross-network manifest with an explanatory error naming both networks', () => {
    const r = checkManifestForNetwork(JSON.stringify({ ...valid, network: 'mainnet' }), 'testnet')
    expect(r.manifest).toBeNull()
    expect(r.error).toMatch(/mainnet/)
    expect(r.error).toMatch(/testnet/)
  })

  it('rejects malformed JSON', () => {
    const r = checkManifestForNetwork('{ not json', 'testnet')
    expect(r.manifest).toBeNull()
    expect(r.error).toBeTruthy()
  })

  it('rejects a manifest missing required fields', () => {
    const r = checkManifestForNetwork(JSON.stringify({ policyType: 'x' }), 'testnet')
    expect(r.manifest).toBeNull()
    expect(r.error).toBeTruthy()
  })

  // The registry check: the policy must be registered and its parameters must parse.
  describe('with the network policy registry', () => {
    const registry = createDefaultRegistry('0x2')

    it('accepts a manifest whose policy and params the registry understands', () => {
      const r = checkManifestForNetwork(JSON.stringify(valid), 'testnet', registry)
      expect(r.error).toBeNull()
      expect(r.manifest?.policyType).toBe('nft-gate')
    })

    it('rejects an unregistered policy type before any transaction is built', () => {
      const r = checkManifestForNetwork(JSON.stringify({ ...valid, policyType: 'mystery' }), 'testnet', registry)
      expect(r.manifest).toBeNull()
      expect(r.error).toBeTruthy()
    })

    it('reports a network mismatch before a policy error', () => {
      const r = checkManifestForNetwork(JSON.stringify({ ...valid, policyType: 'mystery', network: 'mainnet' }), 'testnet', registry)
      expect(r.error).toMatch(/mainnet/)
    })
  })
})
