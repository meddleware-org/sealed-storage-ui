// Configuration. The network is wallet-adapter's shared runtime selector (the standalone build
// selects VITE_NETWORK in main.ts; embedded, the host's selector rules). Everything network-specific
// is resolved for that network:
//   - package ids (sealed_storage, access_gate) come from the published `deployments` — never env;
//   - the key-server committee, threshold and Walrus endpoints are operator settings baked in as
//     VITE_*_{NET} build vars, with Mysten defaults where they exist.
import { computed } from 'vue'
import type { KeyServerConfig } from '@meddleware/sealed-storage-client'
import { SEAL_POLICIES_DEPLOYMENTS, type SealPoliciesDeployment } from '@meddleware/sealed-storage-client/deployments'
import { ACCESS_GATE_DEPLOYMENTS, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { useNetwork } from '@meddleware/wallet-adapter'
import { withRuntimeEnv } from '@meddleware/ui'
import type { SuiNetwork } from '@meddleware/web-utils'

type EnvSource = Record<string, string | undefined>
// Build-time values, with the runtime endpoint overrides (/runtime-config.json, ADR-0005) on top.
const env: EnvSource = withRuntimeEnv((import.meta as unknown as { env?: EnvSource }).env ?? {})

/** The active network (read-only ref). */
export const network = useNetwork().network

/** The network as the explorer links know it (a network the explorer does not serve links to testnet). */
export const explorerNetwork = computed<SuiNetwork>(() => (network.value === 'mainnet' ? 'mainnet' : 'testnet'))

/** An own-property lookup: a caller-supplied key such as `constructor` never resolves to a prototype member. */
function own<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined
}

function csv(v: string | undefined): string[] {
  return (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Key-server defaults (workspace ADR-0002). Testnet: Mysten's decentralized committee (via its
 * aggregator) plus Mysten's two Open-mode servers, threshold 2. Mainnet (D24): three keyless
 * Open-mode servers run by independent operators — Overclock, NodeInfra, H2O Nodes — at threshold 2,
 * so no single operator can decrypt and one may be down. No server needs an API key, so none is ever
 * configured in the bundle. A committee behind an aggregator counts as ONE server.
 */
const SERVER_DEFAULTS: Record<string, { ids: string[]; aggs: string[]; threshold: number }> = {
  testnet: {
    ids: [
      '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98',
      '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
      '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
    ],
    aggs: ['https://seal-aggregator-testnet.mystenlabs.com'],
    threshold: 2,
  },
  mainnet: {
    ids: [
      '0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6', // Overclock (Open)
      '0x1afb3a57211ceff8f6781757821847e3ddae73f64e78ec8cd9349914ad985475', // NodeInfra (Open)
      '0x4a65b4ff7ba8f4b538895ee35959f982a95f0db7e2a202ec989d261ea927286a', // H2O Nodes (Open)
    ],
    aggs: [],
    threshold: 2,
  },
}

/**
 * Walrus HTTP endpoints. Walrus runs no public publisher on mainnet (a publisher pays SUI + WAL
 * itself), so mainnet has no publisher default: set `VITE_WALRUS_PUBLISHER_MAINNET` to an
 * operator-run authenticated publisher.
 */
const WALRUS_DEFAULTS: Record<string, { publisher: string; aggregator: string }> = {
  testnet: {
    publisher: 'https://publisher.walrus-testnet.walrus.space',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space',
  },
  mainnet: { publisher: '', aggregator: 'https://aggregator.walrus-mainnet.walrus.space' },
}

/** Walrus accepts 1..53 storage epochs per store/extend. */
export const WALRUS_MAX_EPOCHS = 53

/** Default ciphertext lifetime in Walrus storage epochs. */
export const DEFAULT_WALRUS_EPOCHS = 5

/**
 * The storage lifetime in epochs from a raw `VITE_WALRUS_EPOCHS` value: a missing value is the
 * default; anything that is not an integer in 1..53 is an error (the publisher would refuse it).
 */
export function parseWalrusEpochs(raw: string | undefined): { epochs: number; error: string | null } {
  if (raw === undefined || raw.trim() === '') return { epochs: DEFAULT_WALRUS_EPOCHS, error: null }
  const n = Number(raw)
  if (!/^\d+$/.test(raw.trim()) || !Number.isInteger(n) || n < 1 || n > WALRUS_MAX_EPOCHS) {
    return { epochs: DEFAULT_WALRUS_EPOCHS, error: `VITE_WALRUS_EPOCHS must be an integer in [1, ${WALRUS_MAX_EPOCHS}]; got "${raw}"` }
  }
  return { epochs: n, error: null }
}

/**
 * The threshold error for a committee, or null when the pair is valid. A threshold no committee could
 * meet (or a non-integer one) is reported instead of failing at the first decrypt.
 */
export function thresholdError(threshold: number, servers: readonly { weight?: number }[]): string | null {
  const total = servers.reduce((sum, s) => sum + (s.weight ?? 1), 0)
  if (servers.length === 0) return null // no committee — reported as its own problem
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > total) {
    return `The Seal threshold must be an integer in [1, ${total}] for ${servers.length} configured server(s); got ${threshold}`
  }
  return null
}

/**
 * Who could decrypt content sealed on a network. `independent` (the default): key servers run by
 * parties other than this app's operator, at a threshold no single one meets. `operator`: the
 * operator's own key server is in use (the ADR-0002 fallback), so the operator could decrypt; the
 * view says so.
 */
export type KeyCustody = 'independent' | 'operator'

/** Everything sealing needs on one network. */
export interface SealConfig {
  network: string
  /** The `sealed_storage` deployment, or null where none is recorded. */
  seal: SealPoliciesDeployment | null
  /** The `access_gate` original id ('' where none is recorded; gate suggestions are then off). */
  accessGateOriginalId: string
  servers: KeyServerConfig[]
  threshold: number
  custody: KeyCustody
  walrusPublisher: string
  walrusAggregator: string
  /** Storage epochs for the ciphertext (`VITE_WALRUS_EPOCHS`, default 5). Meaningless when `problem` is set. */
  walrusEpochs: number
  /** Why sealing is unavailable on this network, or null when it is configured. */
  problem: string | null
}

/** Resolve the configuration for `net` (pure; `envSource` is injectable for tests). */
export function sealConfig(net: string, envSource: EnvSource = env): SealConfig {
  const NET = net.toUpperCase()
  const netEnv = (base: string) => envSource[`${base}_${NET}`]
  const seal = own(SEAL_POLICIES_DEPLOYMENTS as Record<string, SealPoliciesDeployment>, net) ?? null
  const accessGate = own(ACCESS_GATE_DEPLOYMENTS as Record<string, AccessGateDeployment>, net) ?? null

  const defaults = own(SERVER_DEFAULTS, net)
  const envIds = csv(netEnv('VITE_SEAL_SERVER_OBJECT_IDS'))
  const envAggs = csv(netEnv('VITE_SEAL_AGGREGATOR_URLS'))
  const ids = envIds.length ? envIds : (defaults?.ids ?? [])
  const aggs = envAggs.length ? envAggs : (defaults?.aggs ?? [])
  // Never an API key: a key in a VITE_* var ships in the public bundle (sealed-storage-ui audit I5).
  const servers: KeyServerConfig[] = ids.map((objectId, i) => ({ objectId, weight: 1, aggregatorUrl: aggs[i] }))
  const rawThreshold = netEnv('VITE_SEAL_THRESHOLD')
  const threshold = rawThreshold ? Number(rawThreshold) : (defaults?.threshold ?? 1)

  const rawCustody = netEnv('VITE_SEAL_KEY_CUSTODY') ?? 'independent'
  const custody: KeyCustody = rawCustody === 'operator' ? 'operator' : 'independent'
  const custodyError =
    rawCustody === 'independent' || rawCustody === 'operator'
      ? null
      : `VITE_SEAL_KEY_CUSTODY_${NET} must be "independent" or "operator"; got "${rawCustody}"`

  const walrus = own(WALRUS_DEFAULTS, net)
  const lifetime = parseWalrusEpochs(envSource.VITE_WALRUS_EPOCHS)
  const problem = custodyError ?? lifetime.error ?? (!seal
    ? `Sealed Storage is not available on ${net}: no sealed_storage deployment is recorded for it.`
    : servers.length === 0
      ? `Sealed Storage is not configured on ${net}: set VITE_SEAL_SERVER_OBJECT_IDS_${NET} (and VITE_SEAL_AGGREGATOR_URLS_${NET} for a committee).`
      : thresholdError(threshold, servers))

  return {
    network: net,
    seal,
    accessGateOriginalId: accessGate?.originalId ?? '',
    servers,
    threshold,
    custody,
    walrusPublisher: netEnv('VITE_WALRUS_PUBLISHER') || walrus?.publisher || '',
    walrusAggregator: netEnv('VITE_WALRUS_AGGREGATOR') || walrus?.aggregator || '',
    walrusEpochs: lifetime.epochs,
    problem,
  }
}

/**
 * The aggregator URL for a committee server on `net`, from the current configuration or the
 * defaults (independent servers publish their URL on-chain and need none). Used to reach the servers
 * an older ciphertext was sealed to.
 */
export function aggregatorUrlFor(net: string, objectId: string, envSource: EnvSource = env): string | undefined {
  const norm = (id: string) => `0x${id.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
  const fromConfig = sealConfig(net, envSource).servers.find((s) => norm(s.objectId) === norm(objectId))
  if (fromConfig?.aggregatorUrl) return fromConfig.aggregatorUrl
  const d = own(SERVER_DEFAULTS, net)
  const i = d ? d.ids.findIndex((id) => norm(id) === norm(objectId)) : -1
  return i >= 0 ? d?.aggs[i] : undefined
}

/** The configuration for the active network. */
export const activeConfig = computed(() => sealConfig(network.value))

/**
 * Largest ciphertext the app sends to the publisher. Public publishers cap requests at 10 MiB;
 * an operator-run publisher may allow more via VITE_WALRUS_MAX_UPLOAD_BYTES.
 */
export const WALRUS_MAX_UPLOAD_BYTES = Number(env.VITE_WALRUS_MAX_UPLOAD_BYTES || String(10 * 1024 * 1024))

/** Optional read-indexer for sealed-content discovery (display data; falls back to the full node). */
export const INDEXER_URL: string = env.VITE_INDEXER_URL || ''
