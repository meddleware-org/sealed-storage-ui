import { afterEach, describe, it, expect, vi } from 'vitest'
import { thresholdError } from '../src/config.js'

describe('thresholdError', () => {
  const one = [{ weight: 1 }]
  const three = [{ weight: 1 }, { weight: 1 }, { weight: 1 }]

  it('accepts a threshold within the total server weight', () => {
    expect(thresholdError(1, one)).toBeNull()
    expect(thresholdError(2, three)).toBeNull()
  })

  it('rejects the old mainnet default of 5 against a single committee', () => {
    expect(thresholdError(5, one)).toMatch(/\[1, 1\]/)
  })

  it('rejects zero, fractions and NaN', () => {
    expect(thresholdError(0, three)).not.toBeNull()
    expect(thresholdError(1.5, three)).not.toBeNull()
    expect(thresholdError(Number.NaN, three)).not.toBeNull()
  })
})

describe('sealConfig', () => {
  it('takes the package ids from the deployments and the testnet committee defaults', async () => {
    const { sealConfig } = await import('../src/config.js')
    const { sealPoliciesDeployment } = await import('@meddleware/sealed-storage-client/deployments')
    const { accessGateDeployment } = await import('@meddleware/access-gate-client/deployments')
    const c = sealConfig('testnet', {})
    expect(c.seal).toEqual(sealPoliciesDeployment('testnet'))
    expect(c.accessGateOriginalId).toBe(accessGateDeployment('testnet').originalId)
    expect(c.servers).toHaveLength(3)
    expect(c.servers[0].aggregatorUrl).toBe('https://seal-aggregator-testnet.mystenlabs.com')
    expect(c.threshold).toBe(2)
    expect(c.walrusPublisher).toBe('https://publisher.walrus-testnet.walrus.space')
    expect(c.problem).toBeNull()
  })

  it("takes the testnet committee from sealed-storage-client's SEAL_COMMITTEES, typing none of it (FU-0062)", async () => {
    const { sealConfig, aggregatorUrlFor } = await import('../src/config.js')
    const { SEAL_COMMITTEES, committeeServerConfigs } = await import('@meddleware/sealed-storage-client')
    const record = SEAL_COMMITTEES.testnet
    const c = sealConfig('testnet', {})
    expect(c.servers).toEqual(committeeServerConfigs(record))
    expect(c.servers.map((x) => x.objectId)).toEqual(record.servers.map((x) => x.objectId))
    expect(c.servers.map((x) => x.weight)).toEqual(record.servers.map((x) => x.weight))
    expect(c.threshold).toBe(record.threshold)
    expect(c.threshold).toBe(2)
    // the aggregator of the committee entry, and no other server has one
    expect(c.servers.map((x) => x.aggregatorUrl)).toEqual(record.servers.map((x) => x.url))
    for (const s of record.servers) expect(aggregatorUrlFor('testnet', s.objectId, {})).toBe(s.url)
    expect(aggregatorUrlFor('testnet', record.servers[0].objectId.toUpperCase().replace('0X', '0x'), {})).toBe(record.servers[0].url)
  })

  it('keeps the build\'s aggregator URLs by position over the committee ids', async () => {
    const { sealConfig } = await import('../src/config.js')
    const c = sealConfig('testnet', { VITE_SEAL_AGGREGATOR_URLS_TESTNET: 'https://a.example,https://b.example' })
    expect(c.servers.map((x) => x.aggregatorUrl)).toEqual(['https://a.example', 'https://b.example', undefined])
  })

  it('says plainly that a network without a recorded sealed_storage deployment is not available, and offers the networks that have one', async () => {
    const { sealConfig } = await import('../src/config.js')
    const { SEAL_POLICIES_DEPLOYMENTS } = await import('@meddleware/sealed-storage-client/deployments')
    const c = sealConfig('mainnet', {})
    expect(c.seal).toBeNull()
    // The records decide: this holds only while mainnet has no recorded deployment, and the suggestion is a network that has one.
    expect(Object.keys(SEAL_POLICIES_DEPLOYMENTS)).not.toContain('mainnet')
    expect(c.problem).toBe('Sealed Storage is not available on mainnet. Switch to testnet.')
    expect(c.problemCause).toBeNull() // nothing is misconfigured: it is simply not offered there
    expect(c.problem).not.toMatch(/VITE_|sealed_storage|deployment|operator/i)
    expect(c.walrusPublisher).toBe('') // no public mainnet publisher
  })

  it('does not hide a missing deployment behind a bad setting', async () => {
    const { sealConfig } = await import('../src/config.js')
    const c = sealConfig('mainnet', { VITE_SEAL_THRESHOLD_MAINNET: '9', VITE_WALRUS_EPOCHS: 'many' })
    expect(c.problem).toBe('Sealed Storage is not available on mainnet. Switch to testnet.')
  })

  it('reads per-network overrides of servers and threshold', async () => {
    const { sealConfig } = await import('../src/config.js')
    const c = sealConfig('testnet', {
      VITE_SEAL_SERVER_OBJECT_IDS_TESTNET: '0xa,0xb',
      VITE_SEAL_AGGREGATOR_URLS_TESTNET: 'https://agg.example',
      VITE_SEAL_THRESHOLD_TESTNET: '1',
      VITE_WALRUS_PUBLISHER_TESTNET: 'https://pub.example',
    })
    expect(c.servers).toEqual([
      { objectId: '0xa', weight: 1, aggregatorUrl: 'https://agg.example' },
      { objectId: '0xb', weight: 1, aggregatorUrl: undefined },
    ])
    expect(c.threshold).toBe(1)
    expect(c.walrusPublisher).toBe('https://pub.example')
  })

  it('reports a threshold the committee cannot meet: a person reads "not available right now", the cause names the variable', async () => {
    const { sealConfig } = await import('../src/config.js')
    const c = sealConfig('testnet', { VITE_SEAL_THRESHOLD_TESTNET: '5' })
    // testnet is the only network with a recorded deployment, so there is no other network to switch to
    expect(c.problem).toBe('Sealed Storage is not available here right now. Try again later.')
    expect(c.problemCause).toMatch(/\[1, 3\].*VITE_SEAL_THRESHOLD_TESTNET/)
  })

  it('reports a network with no deployment', async () => {
    const { sealConfig } = await import('../src/config.js')
    expect(sealConfig('localnet', {}).problem).toBe('Sealed Storage is not available on localnet. Switch to testnet.')
  })

  it('mainnet defaults to three independent Open-mode servers at threshold 2 (ADR-0002, D24)', async () => {
    const { sealConfig } = await import('../src/config.js')
    const c = sealConfig('mainnet', {})
    expect(c.servers.map((x) => x.objectId)).toEqual([
      '0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6',
      '0x1afb3a57211ceff8f6781757821847e3ddae73f64e78ec8cd9349914ad985475',
      '0x4a65b4ff7ba8f4b538895ee35959f982a95f0db7e2a202ec989d261ea927286a',
    ])
    expect(c.servers.every((x) => x.aggregatorUrl === undefined)).toBe(true)
    expect(c.threshold).toBe(2)
    expect(c.custody).toBe('independent')
  })

  it('never configures an API key, even when one is supplied (it would ship in the bundle)', async () => {
    const { sealConfig } = await import('../src/config.js')
    for (const net of ['testnet', 'mainnet']) {
      const NET = net.toUpperCase()
      const c = sealConfig(net, { [`VITE_SEAL_AGGREGATOR_API_KEY_${NET}`]: 'leaked' })
      for (const server of c.servers) {
        expect(server).not.toHaveProperty('apiKey')
        expect(server).not.toHaveProperty('apiKeyName')
      }
    }
  })

  it('reports operator custody and rejects an unknown custody value', async () => {
    const { sealConfig } = await import('../src/config.js')
    const op = sealConfig('testnet', { VITE_SEAL_KEY_CUSTODY_TESTNET: 'operator' })
    expect(op.custody).toBe('operator')
    expect(op.problem).toBeNull()
    expect(sealConfig('testnet', {}).custody).toBe('independent')
    const bad = sealConfig('testnet', { VITE_SEAL_KEY_CUSTODY_TESTNET: 'mine' })
    expect(bad.problem).toMatch(/not available here right now/)
    expect(bad.problem).not.toMatch(/VITE_/)
    expect(bad.problemCause).toMatch(/VITE_SEAL_KEY_CUSTODY_TESTNET must be "independent" or "operator"/)
  })
})

describe('parseWalrusEpochs', () => {
  it('defaults to 5 when unset or empty (an unset Docker build arg is the empty string)', async () => {
    const { parseWalrusEpochs } = await import('../src/config.js')
    expect(parseWalrusEpochs(undefined)).toEqual({ epochs: 5, error: null })
    expect(parseWalrusEpochs('')).toEqual({ epochs: 5, error: null })
  })

  it('accepts integers in 1..53', async () => {
    const { parseWalrusEpochs } = await import('../src/config.js')
    expect(parseWalrusEpochs('1').epochs).toBe(1)
    expect(parseWalrusEpochs('53')).toEqual({ epochs: 53, error: null })
  })

  it('rejects zero, too many, fractions, signs and text', async () => {
    const { parseWalrusEpochs } = await import('../src/config.js')
    for (const bad of ['0', '54', '2.5', '-3', '1e1', 'ten', '0x5']) {
      expect(parseWalrusEpochs(bad).error, bad).toMatch(/integer in \[1, 53\]/)
    }
  })
})

describe('sealConfig lifetime and lookups', () => {
  it('carries the requested epochs, and reports an invalid value as a problem', async () => {
    const { sealConfig } = await import('../src/config.js')
    expect(sealConfig('testnet', {}).walrusEpochs).toBe(5)
    expect(sealConfig('testnet', { VITE_WALRUS_EPOCHS: '12' }).walrusEpochs).toBe(12)
    const bad = sealConfig('testnet', { VITE_WALRUS_EPOCHS: '99' })
    expect(bad.problem).toMatch(/not available here right now/)
    expect(bad.problemCause).toMatch(/VITE_WALRUS_EPOCHS/)
  })

  it('never resolves a prototype member for a caller-supplied network name', async () => {
    const { sealConfig, aggregatorUrlFor } = await import('../src/config.js')
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const c = sealConfig(name, {})
      expect(c.seal, name).toBeNull()
      expect(c.servers, name).toEqual([])
      expect(c.walrusPublisher, name).toBe('')
      expect(c.accessGateOriginalId, name).toBe('')
      expect(aggregatorUrlFor(name, '0x1', {}), name).toBeUndefined()
    }
  })
})

describe('configCause', () => {
  const ok = { network: 'mainnet', rawCustody: 'independent', epochsError: null, servers: [{ weight: 1 }, { weight: 1 }, { weight: 1 }], threshold: 2, walrusPublisher: 'https://pub.example' }

  it('is null for a usable configuration', async () => {
    const { configCause } = await import('../src/config.js')
    expect(configCause(ok)).toBeNull()
    expect(configCause({ ...ok, rawCustody: 'operator' })).toBeNull()
  })

  it('names the setting behind each fault, for the console', async () => {
    const { configCause } = await import('../src/config.js')
    expect(configCause({ ...ok, rawCustody: 'mine' })).toMatch(/VITE_SEAL_KEY_CUSTODY_MAINNET/)
    expect(configCause({ ...ok, epochsError: 'VITE_WALRUS_EPOCHS must be an integer in [1, 53]; got "0"' })).toMatch(/VITE_WALRUS_EPOCHS/)
    expect(configCause({ ...ok, servers: [] })).toMatch(/VITE_SEAL_SERVER_OBJECT_IDS_MAINNET/)
    expect(configCause({ ...ok, threshold: 4 })).toMatch(/\[1, 3\].*VITE_SEAL_THRESHOLD_MAINNET/)
    expect(configCause({ ...ok, walrusPublisher: '' })).toMatch(/VITE_WALRUS_PUBLISHER_MAINNET/)
  })

  it('checks the first fault in a fixed order', async () => {
    const { configCause } = await import('../src/config.js')
    expect(configCause({ ...ok, rawCustody: 'mine', servers: [], walrusPublisher: '' })).toMatch(/CUSTODY/)
  })
})

describe('once mainnet has a recorded deployment (the records decide, not this app)', () => {
  async function withMainnetRecord() {
    vi.resetModules()
    vi.doMock('@meddleware/sealed-storage-client/deployments', () => ({
      SEAL_POLICIES_DEPLOYMENTS: {
        testnet: { originalId: '0x1', publishedAt: '0x1', policyConfigId: '0x2' },
        mainnet: { originalId: '0x3', publishedAt: '0x3', policyConfigId: '0x4' },
      },
    }))
    return import('../src/config.js')
  }
  afterEach(() => {
    vi.doUnmock('@meddleware/sealed-storage-client/deployments')
    vi.resetModules()
  })

  it('stays unavailable, in plain words, until a Walrus publisher is configured (Walrus runs no public mainnet publisher)', async () => {
    const { sealConfig } = await withMainnetRecord()
    const c = sealConfig('mainnet', {})
    expect(c.seal).not.toBeNull()
    expect(c.problem).toBe('Sealed Storage is not available here right now. Try again later or switch to testnet.')
    expect(c.problemCause).toMatch(/VITE_WALRUS_PUBLISHER_MAINNET/)
  })

  it('is available with a publisher, on the three independent key servers', async () => {
    const { sealConfig } = await withMainnetRecord()
    const c = sealConfig('mainnet', { VITE_WALRUS_PUBLISHER_MAINNET: 'https://pub.example' })
    expect(c.problem).toBeNull()
    expect(c.problemCause).toBeNull()
    expect(c.servers).toHaveLength(3)
  })

  it('logs the technical cause for the developer once, when the active network cannot be served', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    await withMainnetRecord()
    const { useNetwork } = await import('@meddleware/wallet-adapter')
    const { nextTick } = await import('vue')
    useNetwork().setNetwork('testnet')
    await nextTick()
    expect(logged).not.toHaveBeenCalled()
    useNetwork().setNetwork('mainnet')
    await nextTick()
    useNetwork().setNetwork('testnet')
    useNetwork().setNetwork('mainnet')
    await nextTick()
    expect(logged).toHaveBeenCalledTimes(1)
    expect(logged.mock.calls[0]?.[0]).toContain('VITE_WALRUS_PUBLISHER_MAINNET')
    useNetwork().setNetwork('testnet')
    logged.mockRestore()
  })
})
