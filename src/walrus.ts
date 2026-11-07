// Ciphertext storage via the Walrus HTTP publisher/aggregator (@meddleware/walrus-storage-client/http). The
// blob is opaque (already Seal-encrypted), so no wallet, wasm or @mysten/walrus is involved. This
// module only applies a network's endpoints and the app's limits. Callers that await across a
// network switch pass the configuration they started with, so a late call never reaches the new
// network's publisher.
import { readBlob as readViaAggregator, storeBlobViaPublisher } from '@meddleware/walrus-storage-client/http'
import { notAvailableNow } from './availability.js'
import { activeConfig, WALRUS_MAX_UPLOAD_BYTES, type SealConfig } from './config.js'

/** A stored ciphertext: its blob id and, when the publisher reports it, the last epoch it is stored for. */
export interface StoredBlob {
  blobId: string
  /** Last storage epoch (inclusive): the content is unrecoverable after it unless the Blob object is extended. */
  endEpoch?: number
  /** The `Blob` object sent to the owner; its holder can extend the lifetime. */
  blobObjectId?: string
}

/**
 * Store the ciphertext as a permanent blob whose `Blob` object goes to `sendObjectTo` (the user, not
 * the publisher), for `cfg.walrusEpochs` epochs. Returns the blob id and end epoch.
 */
export async function storeBlob(
  bytes: Uint8Array,
  opts: { sendObjectTo: string; config?: Pick<SealConfig, 'network' | 'walrusPublisher' | 'walrusEpochs'> },
): Promise<StoredBlob> {
  const cfg = opts.config ?? activeConfig.value
  if (!cfg.walrusPublisher) {
    // Nothing a person can change: they read "not available right now"; the cause is for the developer.
    console.error(
      `sealed-storage-ui: no Walrus publisher is configured for ${cfg.network}. Walrus runs no public mainnet publisher; ` +
        `set VITE_WALRUS_PUBLISHER_${cfg.network.toUpperCase()} to an authenticated publisher.`,
    )
    throw new Error(notAvailableNow(cfg.network))
  }
  const stored = await storeBlobViaPublisher(bytes, {
    publisher: cfg.walrusPublisher,
    epochs: cfg.walrusEpochs,
    sendObjectTo: opts.sendObjectTo,
    maxBytes: WALRUS_MAX_UPLOAD_BYTES,
  })
  // Ciphertext carries a random Seal identity, so it cannot already be stored; if a publisher says it
  // is, the user would own no Blob object to extend, so refuse rather than hand back a dead pointer.
  if (stored.kind !== 'newlyCreated') {
    throw new Error('The publisher reported this blob as already stored, so no Blob object was created for you. Try again.')
  }
  return { blobId: stored.blobId, endEpoch: stored.endEpoch, blobObjectId: stored.blobObjectId }
}

/** Read the ciphertext back, with the aggregator's strict consistency check. */
export function readBlob(
  blobId: string,
  config: Pick<SealConfig, 'network' | 'walrusAggregator'> = activeConfig.value,
): Promise<Uint8Array> {
  if (!config.walrusAggregator) {
    console.error(`sealed-storage-ui: no Walrus aggregator is configured for ${config.network}.`)
    throw new Error(notAvailableNow(config.network))
  }
  return readViaAggregator(blobId, { aggregator: config.walrusAggregator })
}
