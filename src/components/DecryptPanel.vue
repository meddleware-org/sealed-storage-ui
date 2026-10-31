<script setup lang="ts">
// Decrypt: paste or load a manifest, give the policy what it asks for, and decrypt the content to a download. Re-sealing, for moving
// content onto the current key servers, lives here too: it decrypts with the servers the content was sealed to and seals it again.
import { computed, ref } from 'vue'
import { UiButton, UiFileField, UiNotice, UiStepper, UiTextField, type StepperStep } from '@meddleware/ui'
import { safeFileName, triggerDownload } from '@meddleware/web-utils'
import type { FieldSpec, SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { network } from '../config.js'
import { useOperation } from '../composables/useOperation.js'
import { checkManifestForNetwork } from '../manifest-guard.js'
import { decryptParams, type FieldValues } from '../lib/params.js'
import { getSealController, registry, resealCiphertext } from '../seal.js'
import type { SealedResult } from '../types.js'
import { readBlob, storeBlob } from '../walrus.js'
import { signPersonalMessage, useWallet } from '../wallet.js'
import PolicyField from './PolicyField.vue'

const props = defineProps<{ providers: SealPolicyProvider[]; disabled: boolean }>()
const emit = defineEmits<{ resealed: [result: SealedResult] }>()

const STEPS: StepperStep[] = [
  { id: 'manifest', label: 'Manifest' },
  { id: 'decrypt', label: 'Decrypt' },
]

const op = useOperation()
const { account } = useWallet()

const step = ref(0)
const manifestText = ref('')
const values = ref<FieldValues>({})
// The pasted or loaded manifest goes through the shared schema guard (rejects malformed shapes) AND must target the network this app is on:
// a manifest sealed on another network references a package and committee that do not exist here and can never decrypt. The error is
// shown next to the input so a rejection explains itself.
const check = computed(() => checkManifestForNetwork(manifestText.value, network.value, registry.value))
const manifest = computed(() => check.value.manifest)
const provider = computed(() => (manifest.value ? (props.providers.find((p) => p.type === manifest.value?.policyType) ?? null) : null))
const descriptor = computed(() => provider.value?.describe() ?? null)

async function onFile(f: File | null): Promise<void> {
  if (f) manifestText.value = await f.text()
}

/** A text field shows the value the manifest already holds, so the person sees what is being decrypted against. */
function placeholderFor(f: FieldSpec): string | undefined {
  const held = manifest.value?.params?.[f.name]
  return held != null ? String(held) : f.help
}

function decrypt(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    const m = manifest.value
    const p = provider.value
    if (!m || !p) throw new Error('Paste or upload a valid manifest.')
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to decrypt.')
    const params = decryptParams(p.describe().decryptFields, m.params, values.value)
    op.status.value = 'Fetching ciphertext from Walrus…'
    const ciphertext = await readBlob(m.blobId, config)
    if (!isCurrent()) return
    op.status.value = 'Requesting decryption keys — approve the signature in your wallet…'
    const plaintext = await (await getSealController(config)).decrypt(m.policyType, params, m.id, ciphertext, { address: owner, signPersonalMessage })
    if (!isCurrent()) return
    triggerDownload(new Blob([plaintext.slice().buffer as ArrayBuffer]), safeFileName(m.label, 'decrypted'))
    op.status.value = 'Decrypted — download started.'
  })
}

// Content can only be decrypted by the key servers it was sealed to. Re-sealing decrypts it with those servers and encrypts it again for the
// current ones, so it survives a change of providers (workspace ADR-0002). The result is a new blob and manifest; the old ones keep needing
// the old servers.
function reseal(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    const m = manifest.value
    const p = provider.value
    if (!m || !p) throw new Error('Paste or upload a valid manifest.')
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to re-seal.')
    const encryptWith: Record<string, unknown> = { ...(m.params ?? {}) }
    const decryptWith = decryptParams(p.describe().decryptFields, encryptWith, values.value)
    op.status.value = 'Fetching ciphertext from Walrus…'
    const ciphertext = await readBlob(m.blobId, config)
    if (!isCurrent()) return
    op.status.value = 'Requesting keys from the original key servers — approve the signature in your wallet…'
    const resealed = await resealCiphertext(m.policyType, decryptWith, encryptWith, m.id, ciphertext, { address: owner, signPersonalMessage })
    if (!isCurrent()) return
    if (!resealed) {
      op.status.value = 'This content is already sealed to the current key servers; nothing to do.'
      return
    }
    op.status.value = 'Storing the re-sealed ciphertext on Walrus…'
    const stored = await storeBlob(resealed.ciphertext, { sendObjectTo: owner, config })
    if (!isCurrent()) return
    emit('resealed', {
      manifest: { policyType: m.policyType, id: resealed.id, blobId: stored.blobId, network: config.network, params: encryptWith, label: m.label },
      stored: { endEpoch: stored.endEpoch, epochs: config.walrusEpochs, blobObjectId: stored.blobObjectId },
      publishDigest: null,
    })
    op.status.value = 'Re-sealed. Download the new manifest; the old one still needs the old key servers.'
  })
}
</script>

<template>
  <UiStepper v-model="step" :steps="STEPS" />

  <!-- Step 0: the manifest -->
  <template v-if="step === 0">
    <UiTextField id="seal-manifest" v-model="manifestText" label="Manifest (paste JSON or upload)" :rows="6" placeholder='{ "policyType": "...", "id": "...", "blobId": "..." }' />
    <UiFileField id="seal-manifest-file" label="Or upload a manifest file" accept="application/json,.json" @select="onFile" />
    <UiNotice v-if="check.error" type="error" :message="check.error" />
    <UiNotice v-else-if="manifestText.trim() && !manifest" type="error" message="Unrecognised or invalid manifest." />
    <p><UiButton :disabled="!manifest" @click="step++">Next</UiButton></p>
  </template>

  <!-- Step 1: what the policy asks for, then decrypt -->
  <template v-else>
    <template v-if="descriptor">
      <p>Policy: {{ descriptor.label }} — {{ descriptor.help }}</p>
      <PolicyField v-for="f in descriptor.decryptFields" :key="f.name" v-model="values[f.name]" :field="f" :id="`seal-decrypt-${f.name}`" :placeholder="placeholderFor(f)" />
    </template>
    <p>
      <UiButton variant="ghost" @click="step--">Back</UiButton>
      <UiButton :busy="op.busy.value" :disabled="!provider" @click="decrypt">Decrypt</UiButton>
    </p>
    <p>
      Moving to new key servers? Re-sealing decrypts this content with the servers it was sealed to and seals it again for the current ones,
      producing a new manifest.
    </p>
    <p><UiButton variant="secondary" :disabled="op.busy.value || disabled || !provider" @click="reseal">Re-seal for the current key servers</UiButton></p>
  </template>
</template>
