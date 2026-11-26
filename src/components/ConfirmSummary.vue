<script setup lang="ts">
// What the content is about to be sealed to, in full, before anything is stored: the policy, every parameter, the file, and how long
// the ciphertext is kept. For an access gate it also reads who owns the gate from the chain (its payment recipient), so the person
// sees whose pass-holders will be able to decrypt. (Shown only on the Confirm step, so the read happens when the person gets there.)
import { computed, ref, watch } from 'vue'
import { UiLiveStatus, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import type { SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { confirmRows } from '../confirm.js'
import { activeConfig } from '../config.js'
import type { FieldValues } from '../lib/params.js'
import { gateOperatorsFor } from '../sealed-content.js'

// The component's inputs.
const props = defineProps<{
  provider: SealPolicyProvider | null
  values: FieldValues
  fileName: string | null
  label: string
  /** The access gate being sealed to, for the gate-owner lookup; `null` for a policy that has none. */
  gateId: string | null
}>()

// One row per policy field the person filled in.
const rows = computed(() => (props.provider ? confirmRows(props.provider.describe().encryptFields, props.values) : []))

// The gate owner read from the chain, with its state.
const owner = ref<{ state: 'loading' | 'ok' | 'error'; text: string } | null>(null)
// A slower, older read never overwrites a newer one.
const generation = createGeneration()
// Read the owner whenever the gate or the network changes.
watch(
  [() => props.gateId, () => activeConfig.value.network],
  async ([gateId]) => {
    const isCurrent = generation.begin()
    owner.value = null
    if (!gateId) return
    // Read against the configuration current at this moment.
    const config = activeConfig.value
    owner.value = { state: 'loading', text: '' }
    try {
      const owners = await gateOperatorsFor(gateId, config)
      if (isCurrent()) owner.value = { state: 'ok', text: owners.join(', ') }
    } catch (e) {
      if (isCurrent()) owner.value = { state: 'error', text: errorMessage(e) }
    }
  },
  { immediate: true },
)
</script>

<template>
  <UiStatGrid>
    <!-- The policy first, then one row per field the person filled in, the gate owner (once read), the file and the label. -->
    <UiStatRow label="Policy" align="left">{{ provider?.describe().label }}</UiStatRow>
    <UiStatRow v-for="row in rows" :key="row.label" :label="row.label" align="left">{{ row.value }}</UiStatRow>
    <UiStatRow v-if="owner?.state === 'ok'" label="Gate owner" align="left">{{ owner.text }}</UiStatRow>
    <UiStatRow label="File" align="left">{{ fileName ?? '—' }}</UiStatRow>
    <UiStatRow v-if="label" label="Label" align="left">{{ label }}</UiStatRow>
  </UiStatGrid>
  <!-- The read is announced politely while it runs. -->
  <UiLiveStatus label="Gate owner" :message="owner?.state === 'loading' ? 'Gate owner: reading from the chain…' : ''" />
  <!-- Who receives the gate's payments and may publish pointers for it. -->
  <p v-if="owner?.state === 'ok'">The gate owner receives its payments and may publish pointers for it.</p>
  <!-- If the gate cannot be read as an access gate of this network, say so before anything is stored. -->
  <UiNotice v-else-if="owner?.state === 'error'" type="warning">
    This gate could not be read as an access gate of this network: {{ owner.text }}
  </UiNotice>
  <p>
    Stored on Walrus for <strong>{{ activeConfig.walrusEpochs }} epochs</strong> from the current one. After that the content cannot be
    recovered, even though the key servers still work, unless you extend the <code>Blob</code> object that is sent to your account.
  </p>
</template>
