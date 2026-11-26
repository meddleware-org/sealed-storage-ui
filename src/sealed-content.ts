// Discover on-chain SealedContent pointers for a gate with sealed-storage-client's `listSealedContent`
// (exact event type at the deployment's original id; BCS-decoded). Reads the read-indexer when
// VITE_INDEXER_URL is set — display data only, falling back to the full node.
import { gateOperators, isEventHistoryPruned, listSealedContent, type SealedContentPointer } from '@meddleware/sealed-storage-client'
import { getSuiClient } from './wallet.js'
import { activeConfig, INDEXER_URL, type SealConfig } from './config.js'

/** What the person reads when the network no longer keeps events this old and the index could not supply them. */
export const HISTORY_PRUNED = 'Older sealed content cannot be listed right now, so some may be missing. Try again later.'

/** Most pointers listed for one gate. */
export const MAX_DISCOVERED = 200

/**
 * Published pointers for `gateId` on `config` (default: the active network), newest first.
 *
 * Seal gives confidentiality, not authenticity: anyone can seal content to a gate and publish a
 * pointer for it, and a pass holder decrypts it successfully. So by default only the gate
 * gate owner's pointers are listed (`gateOperators`); `includeOthers` lists every publisher's, for the
 * view to label as unverified.
 */
export async function discoverSealedContent(
  gateId: string,
  opts: { includeOthers?: boolean; config?: SealConfig } = {},
): Promise<SealedContentPointer[]> {
  const cfg = opts.config ?? activeConfig.value
  if (!cfg.seal) throw new Error(cfg.problem ?? `Sealed Storage is not available on ${cfg.network}.`)
  const client = getSuiClient()
  const publishers = opts.includeOthers
    ? undefined
    : await gateOperators(client, gateId, cfg.accessGateOriginalId)
  try {
    const page = await listSealedContent(client, {
      originalId: cfg.seal.originalId,
      gateId,
      limit: MAX_DISCOVERED,
      indexer: INDEXER_URL ? { url: INDEXER_URL, network: cfg.network } : undefined,
      ...(publishers ? { publishers } : {}),
    })
    return page.pointers
  } catch (e) {
    // A node that has pruned the history asked for is a known condition: the person reads plain words, and the node's answer (the cause)
    // goes to the console.
    if (isEventHistoryPruned(e)) {
      console.warn('sealed-storage-ui: the node has pruned the event history', (e as { cause?: unknown }).cause ?? e)
      throw new Error(HISTORY_PRUNED, { cause: e })
    }
    throw e
  }
}

/**
 * The addresses that author a gate's sealed content (its `payment_recipient`), for showing who the
 * content is being sealed to. Read from the chain; throws when `gateId` is not a Gate of this
 * deployment's `access_gate` package.
 */
export async function gateOperatorsFor(gateId: string, config: SealConfig = activeConfig.value): Promise<string[]> {
  return gateOperators(getSuiClient(), gateId, config.accessGateOriginalId)
}
