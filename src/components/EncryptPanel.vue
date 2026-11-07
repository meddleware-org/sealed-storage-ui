<script setup lang="ts">
// Encrypt: choose a policy, fill in its fields and a file, review what the content will be sealed to, then seal and store it. The
// policy picker and its fields come from the registry, so a new policy needs no change here.
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

const props = defineProps<{
  providers: SealPolicyProvider[]
  /** The gate id the page was opened with (`?gate=`), or null. */
  linkedGate: string | null
  /** Sealing is unavailable on this network. */
  disabled: boolean
}>()
/** What sealing (or re-sealing, in the Decrypt tab) produced. */
const result = defineModel<SealedResult | null>('result', { default: null })

const STEPS: StepperStep[] = [
  { id: 'policy', label: 'Policy' },
  { id: 'details', label: 'Details' },
  { id: 'confirm', label: 'Confirm' },
]

const op = useOperation()
const { account } = useWallet()

const step = ref(0)
const type = ref(props.providers[0]?.type ?? '')
const provider = computed(() => props.providers.find((p) => p.type === type.value) ?? null)
const descriptor = computed(() => provider.value?.describe() ?? null)
const policyOptions = computed(() => props.providers.map((p) => [p.type, p.describe().label] as const))
const values = ref<FieldValues>({})
const file = ref<File | null>(null)
const label = ref('')
const gateId = computed({
  get: () => (typeof values.value.gateId === 'string' ? values.value.gateId : ''),
  set: (v: string) => {
    values.value = { ...values.value, gateId: v }
  },
})
const gates = useGateSuggestions(() => (type.value === 'nft-gate' ? provider.value : null))

// A gate id that came from the page URL (?gate=), not from the person: sealing to it needs an explicit OK.
const linked = ref<string | null>(null)
const linkedConfirmed = ref(false)
if (props.linkedGate && props.providers.some((p) => p.type === 'nft-gate')) {
  type.value = 'nft-gate'
  gateId.value = props.linkedGate
  linked.value = props.linkedGate
}
const needsLinkConfirm = computed(() => linked.value !== null && type.value === 'nft-gate' && values.value.gateId === linked.value)
watch(gateId, () => {
  linkedConfirmed.value = false
})

// A result that arrives from elsewhere (a re-seal in the Decrypt tab) is shown at the last step.
watch(result, (r) => {
  if (r) step.value = 2
})

function seal(): Promise<void> {
  return op.run(async ({ isCurrent, config }) => {
    result.value = null
    const p = provider.value
    if (!p) return
    const chosen = file.value
    if (!chosen) throw new Error('Choose a file to encrypt.')
    const owner = account.value?.address
    if (!owner) throw new Error('Connect your wallet to store the ciphertext.')
    if (needsLinkConfirm.value && !linkedConfirmed.value) throw new Error('Confirm that you want to seal to the gate from the link.')
    const params = encryptParams(p.describe().encryptFields, values.value)
    op.status.value = 'Encrypting…'
    const data = new Uint8Array(await chosen.arrayBuffer())
    if (!isCurrent()) return
    const { id, ciphertext } = await (await getSealController(config)).encrypt(p.type, params, data)
    if (!isCurrent()) return
    op.status.value = 'Storing ciphertext on Walrus…'
    const stored = await storeBlob(ciphertext, { sendObjectTo: owner, config })
    if (!isCurrent()) return
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
    <UiSelectField id="seal-policy" v-model="type" label="Policy" :options="policyOptions" :disabled="disabled" />
    <p v-if="descriptor">{{ descriptor.help }}</p>
    <p><UiButton :disabled="disabled || !provider" @click="step++">Next</UiButton></p>
  </template>

  <!-- Step 1: the policy's fields, a label and the file -->
  <template v-else-if="step === 1">
    <template v-if="descriptor">
      <template v-for="f in descriptor.encryptFields" :key="f.name">
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
        <PolicyField v-else v-model="values[f.name]" :field="f" :id="`seal-field-${f.name}`" />
      </template>
    </template>
    <UiTextField id="seal-label" v-model="label" label="Label (optional)" placeholder="A name to recognise this later" />
    <UiFileField id="seal-file" label="File" @select="file = $event" />
    <p>
      <UiButton variant="ghost" @click="step--">Back</UiButton>
      <UiButton :disabled="disabled || !file" @click="step++">Next</UiButton>
    </p>
  </template>

  <!-- Step 2: confirm, then the result -->
  <template v-else>
    <template v-if="!result">
      <ConfirmSummary :provider="provider" :values="values" :file-name="file?.name ?? null" :label="label" :gate-id="type === 'nft-gate' ? gateId || null : null" />
      <template v-if="needsLinkConfirm">
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
    <ManifestResult v-else :result="result" @published="(digest) => (result = { ...result!, publishDigest: digest })" />
  </template>
</template>
