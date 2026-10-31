<script setup lang="ts">
// A gate id: chosen from the gates the connected wallet administers when there are any, typed otherwise (or by choice). A value that is
// not among the suggestions (one that came from a link) is shown as text, so it is never hidden behind an empty picker.
import { computed } from 'vue'
import { UiButton, UiLiveStatus, UiSelectField, UiTextField } from '@meddleware/ui'
import type { FieldSuggestion } from '@meddleware/sealed-storage-client'

const props = defineProps<{
  id: string
  label: string
  required?: boolean
  suggestions: readonly FieldSuggestion[]
  loading: boolean
  /** Shown in the empty text field. */
  placeholder?: string
}>()
const model = defineModel<string>({ default: '' })
const manual = defineModel<boolean>('manual', { default: false })

const options = computed(() => props.suggestions.map((s) => [s.value, s.label] as const))
const foreign = computed(() => model.value !== '' && !props.suggestions.some((s) => s.value === model.value))
const picker = computed(() => !props.loading && props.suggestions.length > 0 && !manual.value && !foreign.value)
const canSwitch = computed(() => !props.loading && props.suggestions.length > 0)
const text = computed(() => (props.required ? `${props.label} *` : props.label))

function switchTo(typed: boolean): void {
  manual.value = typed
  model.value = ''
}
</script>

<template>
  <UiLiveStatus :label="`${label}: your gates`" :message="loading ? 'Loading your gates…' : ''" />
  <UiSelectField v-if="picker" :id="id" v-model="model" :label="text" :options="options" placeholder="Select a gate…" :required="required" />
  <UiTextField v-else :id="id" v-model="model" :label="text" :placeholder="placeholder" :required="required" :disabled="loading" />
  <UiButton v-if="canSwitch && picker" variant="link" size="sm" @click="switchTo(true)">Enter ID manually</UiButton>
  <UiButton v-else-if="canSwitch" variant="link" size="sm" @click="switchTo(false)">← Back to picker</UiButton>
</template>
