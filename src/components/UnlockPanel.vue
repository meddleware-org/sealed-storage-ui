<script setup lang="ts">
// Unlock: find the content sealed to an access gate and decrypt it with a pass you hold, without anyone sharing a manifest.
import { ref, shallowRef, watch } from 'vue'
import { UiButton, UiCard, UiCheckField, UiEmptyState, UiStepper, UiTextField, type StepperStep } from '@meddleware/ui'
import { safeFileName, triggerDownload } from '@meddleware/web-utils'
import type { SealedContentPointer, SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { network } from '../config.js'
import { useGateSuggestions } from '../composables/useGateSuggestions.js'
import { useOperation } from '../composables/useOperation.js'
import { getSealController } from '../seal.js'
import { discoverSealedContent } from '../sealed-content.js'
import { readBlob } from '../walrus.js'
import { signPersonalMessage, useWallet } from '../wallet.js'
import GateIdPicker from './GateIdPicker.vue'

// The panel's inputs.
const props = defineProps<{
  providers: SealPolicyProvider[]
  /** This tab is the one showing (the gate suggestions are read only then). */
  active: boolean
  /** The gate id the page was opened with (`?gate=`), or null. */
  linkedGate: string | null
}>()

// The two steps: choose a gate, then unlock.
const STEPS: StepperStep[] = [
  { id: 'gate', label: 'Gate' },
  { id: 'unlock', label: 'Unlock' },
]

// The shared operation and the wallet account.
const op = useOperation()
const { account } = useWallet()

// The open step, the gate id, the pass id, whether the pass is soulbound and whether other publishers' content is listed.
const step = ref(0)
const gateId = ref(props.linkedGate ?? '')
// The pass the person holds.
const nftId = ref('')
const soulbound = ref(false)
// Seal gives confidentiality, not authenticity: by default only the gate owner's pointers are listed.
const includeOthers = ref(false)
const discovered = shallowRef<SealedContentPointer[]>([])
// The administered gates, read only while this tab is showing.
const gates = useGateSuggestions(() => (props.active ? (props.providers.find((p) => p.type === 'nft-gate') ?? null) : null))

// Everything shown belongs to the network it was found on.
watch(network, () => {
  discovered.value = []
  step.value = 0
})

/** find(): search the chain (or the read index) for content published for the gate; the first step moves on only when something was found. */
function find(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    discovered.value = []
    // A gate id is required before searching.
    if (!gateId.value) throw new Error('Enter a gate id to search.')
    op.status.value = 'Searching for sealed content…'
    // Look for pointers published for the gate (by its owner, unless the person asked for every publisher's).
    const found = await discoverSealedContent(gateId.value, { includeOthers: includeOthers.value, config })
    if (!isCurrent()) return
    discovered.value = found
    op.status.value = found.length ? `Found ${found.length} item(s).` : 'No sealed content published for this gate.'
    if (found.length) step.value = 1
  })
}

/** back(): return to the gate step and forget the results. */
function back(): void {
  step.value = 0
  discovered.value = []
}

/** unlock(item): fetch the ciphertext, ask the key servers for the keys (the wallet signs a session-key message) and download the plaintext. */
function unlock(item: SealedContentPointer): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    // The connected account decrypts; without one nothing is attempted.
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to decrypt.')
    // The pass id is required before unlocking.
    if (!nftId.value) throw new Error('Enter your pass ID.')
    op.status.value = 'Fetching ciphertext from Walrus…'
    // Fetch the ciphertext from Walrus.
    const ciphertext = await readBlob(item.blobId, config)
    if (!isCurrent()) return
    op.status.value = 'Requesting decryption keys — approve the signature in your wallet…'
    const plaintext = await (await getSealController(config)).decrypt(
      'nft-gate',
      { gateId: item.gateId, nftId: nftId.value, soulbound: soulbound.value },
      item.sealId,
      ciphertext,
      { address: owner, signPersonalMessage },
    )
    if (!isCurrent()) return
    // Hand the plaintext to the browser as a download.
    triggerDownload(new Blob([plaintext.slice().buffer as ArrayBuffer]), safeFileName(item.label, 'decrypted'))
    op.status.value = 'Decrypted — download started.'
  })
}
</script>

<template>
  <UiStepper v-model="step" :steps="STEPS" />

  <!-- Step 0: which gate -->
  <template v-if="step === 0">
    <p>Discover content sealed to an access gate and decrypt it with a pass you hold.</p>
    <!-- The gate id: picked from the wallet's gates or typed. -->
    <GateIdPicker
      id="seal-unlock-gate"
      v-model="gateId"
      v-model:manual="gates.manual.value"
      label="Access gate ID"
      :suggestions="gates.suggestions.value"
      :loading="gates.loading.value"
      placeholder="0x… gate object id"
    />
    <!-- Content from other addresses is unverified: Seal gives confidentiality, not authenticity. -->
    <UiCheckField v-model="includeOthers" label="Also list content published by other addresses (unverified: anyone can publish to a gate)" />
    <p><UiButton :busy="op.busy.value" :disabled="!gateId" @click="find">Find sealed content</UiButton></p>
  </template>

  <!-- Step 1: the results, and unlocking one -->
  <template v-else>
    <!-- Nothing found: say so. -->
    <UiEmptyState v-if="!discovered.length">No sealed content found for this gate.</UiEmptyState>
    <template v-else>
      <!-- The pass the person holds for this gate. -->
      <UiTextField id="seal-unlock-nft" v-model="nftId" label="Your pass ID *" placeholder="0x… the ID of your pass for this gate" required />
      <!-- A soulbound pass is checked differently by the policy. -->
      <UiCheckField v-model="soulbound" label="Pass is soulbound" />
      <ul class="found">
        <!-- One card per piece of content found. -->
        <UiCard v-for="item in discovered" :key="item.contentId" as="li" plain :level="3" :title="item.label || '(untitled)'">
          <!-- Content from other publishers is labelled: decrypting proves it was sealed to this gate, not who wrote it. -->
          <p v-if="includeOthers">Published by {{ item.publisher }}: decrypting proves it was sealed to this gate, not who wrote it.</p>
          <p class="blob">blob {{ item.blobId }}</p>
          <p>
            <UiButton :busy="op.busy.value" :disabled="!account || !nftId" @click="unlock(item)">Unlock &amp; download</UiButton>
            <template v-if="!account"> Connect a wallet to decrypt.</template>
          </p>
        </UiCard>
      </ul>
    </template>
    <p><UiButton variant="ghost" @click="back">Back</UiButton></p>
  </template>
</template>

<style scoped>
/* The found content as a plain column of cards. */
.found {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Long blob ids wrap instead of overflowing. */
.blob {
  overflow-wrap: anywhere;
}
</style>
