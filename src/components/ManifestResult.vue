<script setup lang="ts">
// What sealing produced: the manifest (needed to decrypt; it holds no secrets), how long the ciphertext is kept, and, for an access-gate
// policy, the option to publish an on-chain pointer so the gate's pass-holders can find the content without the manifest being shared.
import { computed } from 'vue'
import { ExplorerLink, UiButton, UiCodeBlock } from '@meddleware/ui'
import { buildPublishSealedContentTransaction } from '@meddleware/sealed-storage-client'
import { safeFileName, suiExplorerUrl, triggerDownload } from '@meddleware/web-utils'
import { explorerNetwork } from '../config.js'
import { useOperation } from '../composables/useOperation.js'
import type { SealedResult } from '../types.js'
import { signAndExecute, useWallet } from '../wallet.js'

const props = defineProps<{ result: SealedResult }>()
const emit = defineEmits<{ published: [digest: string] }>()

const op = useOperation()
const { account } = useWallet()
const json = computed(() => JSON.stringify(props.result.manifest, null, 2))
const canPublish = computed(() => props.result.manifest.policyType === 'nft-gate')

function download(): void {
  const blob = new Blob([json.value], { type: 'application/json' })
  triggerDownload(blob, `${safeFileName(props.result.manifest.label, 'sealed')}.seal.json`)
}

// Publish an on-chain discovery pointer (access-gate content only).
function publish(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    const m = props.result.manifest
    if (m.policyType !== 'nft-gate' || !m.params?.gateId) throw new Error('On-chain publishing is available for access-gate content only.')
    if (!account.value) throw new Error('Connect your wallet to publish.')
    if (m.network !== config.network) throw new Error(`This manifest is for '${m.network}', but this app is on '${config.network}'.`)
    op.status.value = 'Publishing on-chain pointer — approve the transaction in your wallet…'
    const seal = config.seal
    if (!seal) throw new Error(config.problem ?? 'Sealed Storage is not available on this network.')
    const tx = buildPublishSealedContentTransaction(
      { publishedAt: seal.publishedAt, policyConfigId: seal.policyConfigId },
      { gateId: String(m.params.gateId), blobId: m.blobId, sealId: m.id, label: m.label ?? '' },
    )
    const { digest } = await signAndExecute(tx)
    if (!isCurrent()) return
    emit('published', digest)
    op.status.value = 'Published — gate pass-holders can now discover and unlock this content.'
  })
}
</script>

<template>
  <UiCodeBlock label="Manifest — save this; it is required to decrypt (it holds no secrets)" :code="json" />
  <p><UiButton variant="secondary" @click="download">Download manifest</UiButton></p>

  <p class="lifetime">
    <template v-if="result.stored.endEpoch !== undefined">
      Stored on Walrus through epoch <strong>{{ result.stored.endEpoch }}</strong> ({{ result.stored.epochs }} epochs requested).
    </template>
    <template v-else>Stored on Walrus for {{ result.stored.epochs }} epochs (the publisher did not report the end epoch).</template>
    After that the content is gone, although the key servers and the manifest still work. To keep it longer, extend your
    <code>Blob</code> object <code v-if="result.stored.blobObjectId">{{ result.stored.blobObjectId }}</code> before then in the
    <a href="https://sui-walrus-storage.meddleware.co.uk/" rel="noopener">Walrus asset manager</a> (My blobs).
  </p>

  <template v-if="canPublish">
    <p>
      Optional: publish an on-chain pointer so this gate's pass-holders can discover and unlock this content in the Unlock tab (no need to share
      the manifest).
    </p>
    <p>
      <UiButton :busy="op.busy.value" :disabled="!account" @click="publish">Publish discovery pointer</UiButton>
      <template v-if="!account"> Connect a wallet first.</template>
    </p>
    <p v-if="result.publishDigest">
      Published in transaction
      <ExplorerLink :href="suiExplorerUrl('txblock', result.publishDigest, explorerNetwork)" :value="result.publishDigest" :chars="[10, 0]" />.
    </p>
  </template>
</template>

<style scoped>
.lifetime {
  overflow-wrap: anywhere;
}
</style>
