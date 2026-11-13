import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SEAL_COMMITTEES } from '@meddleware/sealed-storage-client/deployments'

// A recording SealController: the test sees which servers each instance targets and what it was
// asked to decrypt or encrypt. The header helpers are driven per test.
const { instances, info, sameServers } = vi.hoisted(() => ({
  instances: [] as { cfg: Record<string, unknown>; calls: unknown[][]; cleared: boolean }[],
  info: { value: null as unknown },
  sameServers: { value: false },
}))
vi.mock('@meddleware/sealed-storage-client/controller', () => ({
  SealController: class {
    rec: { cfg: Record<string, unknown>; calls: unknown[][]; cleared: boolean }
    constructor(cfg: Record<string, unknown>) {
      this.rec = { cfg, calls: [], cleared: false }
      instances.push(this.rec)
    }
    async decrypt(...args: unknown[]) {
      this.rec.calls.push(['decrypt', ...args])
      return new Uint8Array([7, 7])
    }
    async encrypt(...args: unknown[]) {
      this.rec.calls.push(['encrypt', ...args])
      return { id: 'new-id', ciphertext: new Uint8Array([9]) }
    }
    clearSession() {
      this.rec.cleared = true
    }
  },
  describeCiphertext: () => info.value,
  sealedUnderServers: () => sameServers.value,
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({}) }))

// The testnet committee's aggregator entry: its id is the client's record, typed nowhere else (FU-0062).
const COMMITTEE = SEAL_COMMITTEES.testnet.servers[0].objectId
const OLD_OPEN = `0x${'ab'.repeat(32)}`
const signer = { address: '0xabc', signPersonalMessage: vi.fn(async () => ({ signature: 's' })) }

beforeEach(() => {
  instances.length = 0
  vi.resetModules()
})

describe('resealCiphertext', () => {
  it('does nothing when the content is already sealed to the current servers', async () => {
    sameServers.value = true
    info.value = { id: 'aa', packageId: '0x1', threshold: 2, servers: [] }
    const { resealCiphertext } = await import('../src/seal.js')
    expect(await resealCiphertext('time-lock', {}, {}, 'aa', new Uint8Array([1]), signer)).toBeNull()
    expect(instances).toHaveLength(0)
  })

  it('decrypts with the recorded servers and threshold, then encrypts with the current ones', async () => {
    sameServers.value = false
    info.value = {
      id: 'aa',
      packageId: '0x1',
      threshold: 1,
      servers: [
        { objectId: COMMITTEE, weight: 1 },
        { objectId: OLD_OPEN, weight: 1 },
      ],
    }
    const { resealCiphertext } = await import('../src/seal.js')
    const out = await resealCiphertext('nft-gate', { gateId: '0xg', nftId: '0xn' }, { gateId: '0xg' }, 'aa', new Uint8Array([1]), signer)
    expect(out).toEqual({ id: 'new-id', ciphertext: new Uint8Array([9]) })

    const [original, current] = instances
    expect(original.cfg).toMatchObject({
      threshold: 1,
      serverConfigs: [
        // A known committee gets its aggregator; an unknown independent server publishes its URL on-chain.
        { objectId: COMMITTEE, weight: 1, aggregatorUrl: 'https://seal-aggregator-testnet.mystenlabs.com' },
        { objectId: OLD_OPEN, weight: 1, aggregatorUrl: undefined },
      ],
    })
    expect(original.calls).toEqual([['decrypt', 'nft-gate', { gateId: '0xg', nftId: '0xn' }, 'aa', new Uint8Array([1]), signer]])
    expect(original.cleared).toBe(true)
    // The current controller encrypts the plaintext under the encrypt-time params only.
    expect(current.calls).toEqual([['encrypt', 'nft-gate', { gateId: '0xg' }, new Uint8Array([7, 7])]])
    expect(current.cfg).toMatchObject({ threshold: 2 })
  })
})
