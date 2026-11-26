import { describe, it, expect, vi, afterEach } from 'vitest'
import { computed } from 'vue'

// Discovery delegates to sealed-storage-client's listSealedContent (tested there); this checks the wrapper
// passes the active deployment, the gate, the cap and the optional indexer.
const { listSealedContent, gateOperators, isEventHistoryPruned } = vi.hoisted(() => ({
  listSealedContent: vi.fn(),
  gateOperators: vi.fn(async () => ['0xop']),
  isEventHistoryPruned: vi.fn((e: unknown) => e instanceof Error && e.name === 'EventHistoryPrunedError'),
}))

/** load(cfg, indexer): load the wrapper against a mocked configuration and client. */
async function load(cfg: Record<string, unknown>, indexer = '') {
  vi.resetModules()
  vi.doMock('@meddleware/sealed-storage-client', () => ({ listSealedContent, gateOperators, isEventHistoryPruned }))
  vi.doMock('../src/wallet.js', () => ({ getSuiClient: () => ({ client: true }) }))
  vi.doMock('../src/config.js', () => ({ activeConfig: computed(() => cfg), INDEXER_URL: indexer }))
  return import('../src/sealed-content.js')
}

// Forget the mocks between tests.
afterEach(() => {
  listSealedContent.mockReset()
  vi.resetModules()
})

// What is listed and how: the deployment, the gate, the cap, the publishers and the optional index.
describe('discoverSealedContent', () => {
  // Lists the gate\.
  it('lists the gate\'s pointers at the deployment\'s original id', async () => {
    listSealedContent.mockResolvedValue({ pointers: [{ label: 'a' }], cursor: null, source: 'rpc' })
    const { discoverSealedContent, MAX_DISCOVERED } = await load({ network: 'testnet', seal: { originalId: '0x42', publishedAt: '0x43' } })
    expect(await discoverSealedContent('0xgate')).toEqual([{ label: 'a' }])
    expect(listSealedContent).toHaveBeenCalledWith({ client: true }, { originalId: '0x42', gateId: '0xgate', limit: MAX_DISCOVERED, indexer: undefined, publishers: ['0xop'] })
  })

  // Lists only the gate operators\.
  it('lists only the gate operators\' pointers by default, and everyone\'s only on request', async () => {
    listSealedContent.mockResolvedValue({ pointers: [], cursor: null, source: 'rpc' })
    const { discoverSealedContent } = await load({ network: 'testnet', accessGateOriginalId: '0xa5', seal: { originalId: '0x42', publishedAt: '0x43' } })
    await discoverSealedContent('0xgate')
    expect(gateOperators).toHaveBeenCalledWith({ client: true }, '0xgate', '0xa5')
    expect(listSealedContent.mock.calls[0][1].publishers).toEqual(['0xop'])
    listSealedContent.mockClear()
    gateOperators.mockClear()
    await discoverSealedContent('0xgate', { includeOthers: true })
    expect(gateOperators).not.toHaveBeenCalled()
    expect(listSealedContent.mock.calls[0][1]).not.toHaveProperty('publishers')
  })

  // Says in plain words that older content cannot be listed when the node has pruned the history, and logs the node\.
  it('says in plain words that older content cannot be listed when the node has pruned the history, and logs the node\'s answer', async () => {
    const pruned = Object.assign(new Error('The network node no longer keeps events this old.'), { name: 'EventHistoryPrunedError', cause: new Error('below earliest available') })
    listSealedContent.mockRejectedValueOnce(pruned)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { discoverSealedContent, HISTORY_PRUNED } = await load({ network: 'testnet', seal: { originalId: '0x42', publishedAt: '0x43' } })
    await expect(discoverSealedContent('0xgate')).rejects.toThrow(HISTORY_PRUNED)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(HISTORY_PRUNED).not.toMatch(/VITE_|operator|deployment|indexer|configur|node\b/i)
    warn.mockRestore()
  })

  it('fails closed when the operators cannot be resolved', async () => {
    gateOperators.mockRejectedValueOnce(new Error('not a Gate'))
    const { discoverSealedContent } = await load({ network: 'testnet', accessGateOriginalId: '0xa5', seal: { originalId: '0x42', publishedAt: '0x43' } })
    await expect(discoverSealedContent('0xgate')).rejects.toThrow('not a Gate')
    expect(listSealedContent).not.toHaveBeenCalled()
  })

  it('reads the indexer for the active network when configured', async () => {
    listSealedContent.mockResolvedValue({ pointers: [], cursor: null, source: 'indexer' })
    const { discoverSealedContent } = await load({ network: 'testnet', seal: { originalId: '0x42', publishedAt: '0x42' } }, 'https://i.example')
    await discoverSealedContent('0xgate')
    expect(listSealedContent.mock.calls[0][1].indexer).toEqual({ url: 'https://i.example', network: 'testnet' })
  })

  it('explains a network without a deployment', async () => {
    const { discoverSealedContent } = await load({ network: 'mainnet', seal: null, problem: 'not available on mainnet' })
    await expect(discoverSealedContent('0xgate')).rejects.toThrow('not available on mainnet')
  })

  it('uses the configuration it is given, not the active one (a switch mid-flight)', async () => {
    listSealedContent.mockResolvedValue({ pointers: [], cursor: null, source: 'rpc' })
    const { discoverSealedContent } = await load({ network: 'mainnet', accessGateOriginalId: '0xmain', seal: { originalId: '0xmainpkg', publishedAt: '0x1' } })
    await discoverSealedContent('0xgate', {
      config: { network: 'testnet', accessGateOriginalId: '0xa5', seal: { originalId: '0x42', publishedAt: '0x43' } } as never,
    })
    expect(gateOperators).toHaveBeenCalledWith({ client: true }, '0xgate', '0xa5')
    expect(listSealedContent.mock.calls[0][1].originalId).toBe('0x42')
  })
})

// The gate owner shown on the Confirm step is read from the deployment's access_gate package.
describe('gateOperatorsFor', () => {
  it('reads the gate operator for the Confirm step from the deployment\'s access_gate package', async () => {
    const { gateOperatorsFor } = await load({ network: 'testnet', accessGateOriginalId: '0xa5', seal: { originalId: '0x42', publishedAt: '0x43' } })
    expect(await gateOperatorsFor('0xgate')).toEqual(['0xop'])
    expect(gateOperators).toHaveBeenCalledWith({ client: true }, '0xgate', '0xa5')
  })
})
