import { describe, it, expect, vi } from 'vitest'
import { computed, ref } from 'vue'

// F11: the network can be switched while the original servers' wallet prompt is open. The re-seal
// then must not encrypt the decrypted plaintext for the other network's key servers.
// The test switches the network from inside the mocked decrypt, and counts how many encryptions happen.
const { switchNetwork, encrypted } = vi.hoisted(() => ({ switchNetwork: { fn: () => {} }, encrypted: { count: 0 } }))

vi.mock('@meddleware/sealed-storage-client/controller', () => ({
  SealController: class {
    async decrypt() {
      switchNetwork.fn()
      return new Uint8Array([7])
    }
    async encrypt() {
      encrypted.count++
      return { id: 'new', ciphertext: new Uint8Array([9]) }
    }
    clearSession() {}
  },
  describeCiphertext: () => ({ id: 'aa', packageId: '0x1', threshold: 1, servers: [] }),
  sealedUnderServers: () => false,
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({}) }))

const network = ref('testnet')
vi.mock('../src/config.js', () => ({
  activeConfig: computed(() => ({
    network: network.value,
    problem: null,
    threshold: 2,
    servers: [],
    accessGateOriginalId: '',
    seal: { originalId: '0x1', publishedAt: '0x1', policyConfigId: '0x2' },
  })),
  aggregatorUrlFor: () => undefined,
}))

// After the wallet prompt the network is checked again: nothing is sealed or stored on another network.
describe('resealCiphertext across a network switch', () => {
  // Refuses to encrypt for the new network after the decrypt prompt.
  it('refuses to encrypt for the new network after the decrypt prompt', async () => {
    const { resealCiphertext } = await import('../src/seal.js')
    switchNetwork.fn = () => {
      network.value = 'mainnet'
    }
    await expect(
      resealCiphertext('time-lock', {}, {}, 'aa', new Uint8Array([1]), { address: '0xa', signPersonalMessage: vi.fn() }),
    ).rejects.toThrow(/network changed during the re-seal/)
    expect(encrypted.count).toBe(0)
  })
})
