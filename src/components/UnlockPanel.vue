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

const props = defineProps<{
  providers: SealPolicyProvider[]
  /** This tab is the one showing (the gate suggestions are read only then). */
  active: boolean
  /** The gate id the page was opened with (`?gate=`), or null. */
  linkedGate: string | null
}>()

const STEPS: StepperStep[] = [
  { id: 'gate', label: 'Gate' },
  { id: 'unlock', label: 'Unlock' },
]

const op = useOperation()
const { account } = useWallet()

const step = ref(0)
const gateId = ref(props.linkedGate ?? '')
const nftId = ref('')
const soulbound = ref(false)
// Seal gives confidentiality, not authenticity: by default only the gate owner's pointers are listed.
const includeOthers = ref(false)
const discovered = shallowRef<SealedContentPointer[]>([])
const gates = useGateSuggestions(() => (props.active ? (props.providers.find((p) => p.type === 'nft-gate') ?? null) : null))

// Everything shown belongs to the network it was found on.
watch(network, () => {
  discovered.value = []
  step.value = 0
})

function find(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    discovered.value = []
    if (!gateId.value) throw new Error('Enter a gate id to search.')
    op.status.value = 'Searching for sealed content…'
    const found = await discoverSealedContent(gateId.value, { includeOthers: includeOthers.value, config })
    if (!isCurrent()) return
    discovered.value = found
    op.status.value = found.length ? `Found ${found.length} item(s).` : 'No sealed content published for this gate.'
    if (found.length) step.value = 1
  })
}

function back(): void {
  step.value = 0
  discovered.value = []
}

function unlock(item: SealedContentPointer): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to decrypt.')
    if (!nftId.value) throw new Error('Enter your pass NFT id.')
    op.status.value = 'Fetching ciphertext from Walrus…'
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
    <GateIdPicker
      id="seal-unlock-gate"
      v-model="gateId"
      v-model:manual="gates.manual.value"
      label="Access gate ID"
      :suggestions="gates.suggestions.value"
      :loading="gates.loading.value"
      placeholder="0x… gate object id"
    />
    <UiCheckField v-model="includeOthers" label="Also list content published by other addresses (unverified: anyone can publish to a gate)" />
    <p><UiButton :busy="op.busy.value" :disabled="!gateId" @click="find">Find sealed content</UiButton></p>
  </template>

  <!-- Step 1: the results, and unlocking one -->
  <template v-else>
    <UiEmptyState v-if="!discovered.length">No sealed content found for this gate.</UiEmptyState>
    <template v-else>
      <UiTextField id="seal-unlock-nft" v-model="nftId" label="Your pass NFT ID *" placeholder="0x… your AccessNFT for this gate" required />
      <UiCheckField v-model="soulbound" label="Pass is soulbound" />
      <ul class="found">
        <UiCard v-for="item in discovered" :key="item.contentId" as="li" plain :level="3" :title="item.label || '(untitled)'">
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
.found {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}
.blob {
  overflow-wrap: anywhere;
}
</style>
