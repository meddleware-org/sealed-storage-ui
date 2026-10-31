<script setup lang="ts">
// What the content is about to be sealed to, in full, before anything is stored: the policy, every parameter, the file, and how long
// the ciphertext is kept. For an access gate it also reads who operates the gate from the chain (its payment recipient), so the person
// sees whose pass-holders will be able to decrypt. (Shown only on the Confirm step, so the read happens when the person gets there.)
import { computed, ref, watch } from 'vue'
import { UiLiveStatus, UiNotice, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import type { SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { confirmRows } from '../confirm.js'
import { activeConfig } from '../config.js'
import type { FieldValues } from '../lib/params.js'
import { gateOperatorsFor } from '../sealed-content.js'

const props = defineProps<{
  provider: SealPolicyProvider | null
  values: FieldValues
  fileName: string | null
  label: string
  /** The access gate being sealed to, for the operator lookup; `null` for a policy that has none. */
  gateId: string | null
}>()

const rows = computed(() => (props.provider ? confirmRows(props.provider.describe().encryptFields, props.values) : []))

const operator = ref<{ state: 'loading' | 'ok' | 'error'; text: string } | null>(null)
const generation = createGeneration()
watch(
  [() => props.gateId, () => activeConfig.value.network],
  async ([gateId]) => {
    const isCurrent = generation.begin()
    operator.value = null
    if (!gateId) return
    const config = activeConfig.value
    operator.value = { state: 'loading', text: '' }
    try {
      const operators = await gateOperatorsFor(gateId, config)
      if (isCurrent()) operator.value = { state: 'ok', text: operators.join(', ') }
    } catch (e) {
      if (isCurrent()) operator.value = { state: 'error', text: errorMessage(e) }
    }
  },
  { immediate: true },
)
</script>

<template>
  <UiStatGrid>
    <UiStatRow label="Policy" align="left">{{ provider?.describe().label }}</UiStatRow>
    <UiStatRow v-for="row in rows" :key="row.label" :label="row.label" align="left">{{ row.value }}</UiStatRow>
    <UiStatRow v-if="operator?.state === 'ok'" label="Gate operator" align="left">{{ operator.text }}</UiStatRow>
    <UiStatRow label="File" align="left">{{ fileName ?? '—' }}</UiStatRow>
    <UiStatRow v-if="label" label="Label" align="left">{{ label }}</UiStatRow>
  </UiStatGrid>
  <UiLiveStatus label="Gate operator" :message="operator?.state === 'loading' ? 'Gate operator: reading from the chain…' : ''" />
  <p v-if="operator?.state === 'ok'">The gate operator receives its payments and may publish pointers for it.</p>
  <UiNotice v-else-if="operator?.state === 'error'" type="warning">
    This gate could not be read as an access gate of this network: {{ operator.text }}
  </UiNotice>
  <p>
    Stored on Walrus for <strong>{{ activeConfig.walrusEpochs }} epochs</strong> from the current one. After that the content cannot be
    recovered, even though the key servers still work, unless you extend the <code>Blob</code> object that is sent to your account.
  </p>
</template>
