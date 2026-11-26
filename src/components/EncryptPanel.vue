<script setup lang="ts">
// Encrypt: choose a policy, fill in its fields and a file, review what the content will be sealed to, then seal and store it. The
// policy picker and its fields come from the registry, so a new policy needs no change here.
// Vue, the shared UI components, the client's types and this app's own modules.
import { computed, ref, watch } from 'vue'
import { UiButton, UiCheckField, UiFileField, UiNotice, UiSelectField, UiStepper, UiTextField, type StepperStep } from '@meddleware/ui'
import type { SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { useGateSuggestions } from '../composables/useGateSuggestions.js'
import { useOperation } from '../composables/useOperation.js'
import { encryptParams, type FieldValues } from '../lib/params.js'
import { getSealController } from '../seal.js'
import type { SealedResult } from '../types.js'
import { storeBlob } from '../walrus.js'
import { useWallet } from '../wallet.js'
import ConfirmSummary from './ConfirmSummary.vue'
import GateIdPicker from './GateIdPicker.vue'
import ManifestResult from './ManifestResult.vue'
import PolicyField from './PolicyField.vue'

// The panel's inputs.
const props = defineProps<{
  providers: SealPolicyProvider[]
  /** The gate id the page was opened with (`?gate=`), or null. */
  linkedGate: string | null
  /** Sealing is unavailable on this network. */
  disabled: boolean
}>()
/** What sealing (or re-sealing, in the Decrypt tab) produced. */
const result = defineModel<SealedResult | null>('result', { default: null })

// The three steps: policy, details, confirm.
const STEPS: StepperStep[] = [
  { id: 'policy', label: 'Policy' },
  { id: 'details', label: 'Details' },
  { id: 'confirm', label: 'Confirm' },
]

// The shared operation and the wallet account.
const op = useOperation()
const { account } = useWallet()

// The open step, the chosen policy and the form's state.
const step = ref(0)
const type = ref(props.providers[0]?.type ?? '')
const provider = computed(() => props.providers.find((p) => p.type === type.value) ?? null)
const descriptor = computed(() => provider.value?.describe() ?? null)
const policyOptions = computed(() => props.providers.map((p) => [p.type, p.describe().label] as const))
const values = ref<FieldValues>({})
const file = ref<File | null>(null)
const label = ref('')
// The gate id lives inside the policy values; this is a typed view of it.
const gateId = computed({
  get: () => (typeof values.value.gateId === 'string' ? values.value.gateId : ''),
  set: (v: string) => {
    values.value = { ...values.value, gateId: v }
  },
})
// The administered gates, offered as choices only for the access-gate policy.
const gates = useGateSuggestions(() => (type.value === 'nft-gate' ? provider.value : null))

// A gate id that came from the page URL (?gate=), not from the person: sealing to it needs an explicit OK.
// A gate id that came from the page URL (?gate=), not from the person: sealing to it needs an explicit OK.
const linked = ref<string | null>(null)
const linkedConfirmed = ref(false)
if (props.linkedGate && props.providers.some((p) => p.type === 'nft-gate')) {
  type.value = 'nft-gate'
  gateId.value = props.linkedGate
  linked.value = props.linkedGate
}
// The confirmation is needed only while the gate is still the linked one.
const needsLinkConfirm = computed(() => linked.value !== null && type.value === 'nft-gate' && values.value.gateId === linked.value)
// Changing the gate withdraws the confirmation.
watch(gateId, () => {
  linkedConfirmed.value = false
})

// A result that arrives from elsewhere (a re-seal in the Decrypt tab) is shown at the last step.
// A result that arrives from elsewhere (a re-seal in the Decrypt tab) is shown at the last step.
watch(result, (r) => {
  if (r) step.value = 2
})

/** seal(): validate, encrypt in the browser, store the ciphertext on Walrus and record the manifest; every await is followed by a check that the operation is still current. */
function seal(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    result.value = null
    const p = provider.value
    if (!p) return
    const chosen = file.value
    if (!chosen) throw new Error('Choose a file to encrypt.')
    // The ciphertext's Blob object goes to the connected account.
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to store the ciphertext.')
    if (needsLinkConfirm.value && !linkedConfirmed.value) throw new Error('Confirm that you want to seal to the gate from the link.')
    const params = encryptParams(p.describe().encryptFields, values.value)
    op.status.value = 'Encrypting…'
    // Read the file into memory.
    const data = new Uint8Array(await chosen.arrayBuffer())
    if (!isCurrent()) return
    // Encrypt in the browser under the chosen policy; the plaintext never leaves it.
    const { id, ciphertext } = await (await getSealController(config)).encrypt(p.type, params, data)
    if (!isCurrent()) return
    op.status.value = 'Storing ciphertext on Walrus…'
    // Store only the ciphertext, sending its Blob object to the owner (so the owner, not the publisher, can extend it).
    const stored = await storeBlob(ciphertext, { sendObjectTo: owner, config })
    if (!isCurrent()) return
    // Record the manifest: everything needed to decrypt later, and nothing secret.
    result.value = {
      manifest: { policyType: p.type, id, blobId: stored.blobId, network: config.network, params, label: label.value || chosen.name },
      stored: { endEpoch: stored.endEpoch, epochs: config.walrusEpochs, blobObjectId: stored.blobObjectId },
      publishDigest: null,
    }
    op.status.value = 'Sealed. Keep the manifest — you need it to decrypt.'
    step.value = 2
  })
}
</script>

<template>
  <UiStepper v-model="step" :steps="STEPS" />

  <!-- Step 0: Policy -->
  <template v-if="step === 0">
    <!-- The policy picker, filled from the registry, so a new policy needs no change here. -->
    <UiSelectField id="seal-policy" v-model="type" label="Policy" :options="policyOptions" :disabled="disabled" />
    <p v-if="descriptor">{{ descriptor.help }}</p>
    <p><UiButton :disabled="disabled || !provider" @click="step++">Next</UiButton></p>
  </template>

  <!-- Step 1: the policy's fields, a label and the file -->
  <template v-else-if="step === 1">
    <template v-if="descriptor">
      <template v-for="f in descriptor.encryptFields" :key="f.name">
        <!-- The gate id is a picker over the wallet's own gates, or typed. -->
        <GateIdPicker
          v-if="f.name === 'gateId'"
          id="seal-field-gateId"
          v-model="gateId"
          v-model:manual="gates.manual.value"
          :label="f.label"
          :required="f.required"
          :suggestions="gates.suggestions.value"
          :loading="gates.loading.value"
          :placeholder="f.help"
        />
        <!-- Any other field, by the kind the provider describes. -->
        <PolicyField v-else v-model="values[f.name]" :field="f" :id="`seal-field-${f.name}`" />
      </template>
    </template>
    <UiTextField id="seal-label" v-model="label" label="Label (optional)" placeholder="A name to recognise this later" />
    <!-- The file to seal; it never leaves the browser unencrypted. -->
    <UiFileField id="seal-file" label="File" @select="file = $event" />
    <p>
      <UiButton variant="ghost" @click="step--">Back</UiButton>
      <UiButton :disabled="disabled || !file" @click="step++">Next</UiButton>
    </p>
  </template>

  <!-- Step 2: confirm, then the result -->
  <template v-else>
    <template v-if="!result">
      <!-- Everything the content will be sealed to, in full, before anything is stored. -->
      <ConfirmSummary :provider="provider" :values="values" :file-name="file?.name ?? null" :label="label" :gate-id="type === 'nft-gate' ? gateId || null : null" />
      <template v-if="needsLinkConfirm">
        <!-- A gate preselected by a link must be confirmed explicitly, because anyone holding a pass for it could decrypt. -->
        <UiNotice type="warning">
          This access gate was preselected by a link you followed, not chosen by you. Anyone who holds a pass for it will be able to decrypt
          this file. Check the gate id and its owner above.
        </UiNotice>
        <UiCheckField v-model="linkedConfirmed" label="I want to seal this file to the gate from the link" />
      </template>
      <p>
        <UiButton variant="ghost" @click="step--">Back</UiButton>
        <UiButton :busy="op.busy.value" :disabled="disabled || (needsLinkConfirm && !linkedConfirmed)" @click="seal">Encrypt &amp; store</UiButton>
      </p>
    </template>
    <!-- The manifest and the storage lifetime, once sealed. -->
    <ManifestResult v-else :result="result" @published="(digest) => (result = { ...result!, publishDigest: digest })" />
  </template>
</template>
