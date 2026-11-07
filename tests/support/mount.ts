// SealedStorageView with its wiring mocked, for the tests that drive it: the network and the account are refs a test switches mid-operation,
// and every slow dependency is a mock a test settles by hand.
import { vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'

export const GATE = `0x${'a1'.repeat(32)}`
export const GATE_OWNER = `0x${'0b'.repeat(32)}`

export function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const nftProvider = {
  type: 'nft-gate',
  describe: () => ({
    type: 'nft-gate',
    label: 'Access-gate NFT',
    help: 'help',
    encryptFields: [{ name: 'gateId', label: 'Access gate ID', kind: 'objectId', required: true }],
    decryptFields: [],
  }),
}

export interface Setup {
  network: string
  address: string | null
  /** The page's query string, for the `?gate=` link. */
  search?: string
  problem?: string | null
  custody?: 'independent' | 'operator'
  providers?: unknown[]
  /** Accept any pasted manifest as valid (the schema guard is tested on its own). */
  trustManifests?: boolean
}

export async function mountView(setup: Setup = { network: 'testnet', address: '0xowner' }) {
  vi.resetModules()
  const network = ref(setup.network)
  const address = ref<string | null>(setup.address)
  const cfgFor = (n: string) => ({
    network: n,
    problem: setup.problem ?? null,
    custody: setup.custody ?? 'independent',
    threshold: 2,
    walrusEpochs: 5,
    walrusPublisher: `https://publisher.${n}.example`,
    walrusAggregator: `https://aggregator.${n}.example`,
    seal: setup.problem ? null : { originalId: '0x1', publishedAt: '0x1', policyConfigId: '0x2' },
  })
  const encrypt = vi.fn()
  const decrypt = vi.fn()
  const storeBlob = vi.fn()
  const readBlob = vi.fn()
  const gateOperatorsFor = vi.fn(async () => [GATE_OWNER])
  const discoverSealedContent = vi.fn()
  const signAndExecute = vi.fn()
  const resealCiphertext = vi.fn()
  vi.doMock('../../src/config.js', () => ({
    network,
    explorerNetwork: computed(() => 'testnet'),
    activeConfig: computed(() => cfgFor(network.value)),
  }))
  vi.doMock('../../src/wallet.js', () => ({
    useWallet: () => ({ account: computed(() => (address.value ? { address: address.value } : null)) }),
    getSuiClient: () => ({}),
    signPersonalMessage: vi.fn(),
    signAndExecute,
  }))
  vi.doMock('../../src/seal.js', () => ({
    registry: computed(() => ({ list: () => setup.providers ?? [nftProvider] })),
    getSealController: vi.fn(async () => ({ encrypt, decrypt })),
    clearSealSessions: vi.fn(),
    resealCiphertext,
  }))
  vi.doMock('../../src/walrus.js', () => ({ storeBlob, readBlob }))
  vi.doMock('../../src/sealed-content.js', () => ({ discoverSealedContent, gateOperatorsFor }))
  if (setup.trustManifests) {
    vi.doMock('../../src/manifest-guard.js', () => ({
      checkManifestForNetwork: (text: string) => {
        try {
          return { manifest: text.trim() ? JSON.parse(text) : null, error: null }
        } catch {
          return { manifest: null, error: 'Invalid manifest.' }
        }
      },
    }))
  }
  if (setup.search) window.history.replaceState({}, '', setup.search)
  const { default: SealedStorageView } = await import('../../src/components/SealedStorageView.vue')
  const { default: EncryptPanel } = await import('../../src/components/EncryptPanel.vue')
  const { default: UnlockPanel } = await import('../../src/components/UnlockPanel.vue')
  const { default: DecryptPanel } = await import('../../src/components/DecryptPanel.vue')
  const wrapper = mount(SealedStorageView, { global: { stubs: { WalletGuard: { template: '<div><slot /></div>' } } } })
  const panel = (c: unknown) => (wrapper.findComponent(c as never).vm as any)
  return {
    wrapper,
    encryptPanel: () => panel(EncryptPanel),
    unlockPanel: () => panel(UnlockPanel),
    decryptPanel: () => panel(DecryptPanel),
    network,
    address,
    encrypt,
    decrypt,
    storeBlob,
    readBlob,
    gateOperatorsFor,
    discoverSealedContent,
    signAndExecute,
    resealCiphertext,
  }
}

export function file() {
  return new File([new Uint8Array([1, 2, 3])], 'secret.txt')
}

/** The failure notice the view shows, if any. */
export const alertText = (wrapper: ReturnType<typeof mount>) => wrapper.find('[role="alert"]').text()
