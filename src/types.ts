import type { SealedManifest } from '@meddleware/sealed-storage-client'

/** How long the ciphertext is stored: the publisher's end epoch (when it reports one) and the epochs requested. */
export interface StoredInfo {
  endEpoch?: number
  epochs: number
  /** The `Blob` object sent to the owner; its holder can extend the lifetime. */
  blobObjectId?: string
}

/** What sealing (or re-sealing) produced, shown on the Encrypt tab's last step. */
export interface SealedResult {
  manifest: SealedManifest
  stored: StoredInfo
  /** The transaction that published the discovery pointer, once it was. */
  publishDigest: string | null
}
