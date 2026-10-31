<script setup lang="ts">
// One input of a policy form, by the kind of field the provider describes: a checkbox, a date and time in the person's own time zone
// (held as an ISO instant), or text.
import { computed } from 'vue'
import { UiCheckField, UiDateTimeField, UiTextField } from '@meddleware/ui'
import { browserZone } from '@meddleware/web-utils'
import type { FieldSpec } from '@meddleware/sealed-storage-client'

const props = defineProps<{
  field: FieldSpec
  id: string
  /** The form's value: text, an ISO instant, or a checkbox state. */
  modelValue: string | boolean | undefined
  /** Shown in an empty text field (default: the field's own help). */
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | boolean] }>()

const label = computed(() => props.field.label)
const text = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : ''),
  set: (v: string) => emit('update:modelValue', v),
})
const checked = computed({
  get: () => props.modelValue === true,
  set: (v: boolean) => emit('update:modelValue', v),
})
const instant = computed({
  get: () => (typeof props.modelValue === 'string' && props.modelValue !== '' ? props.modelValue : null),
  set: (v: string | null) => emit('update:modelValue', v ?? ''),
})
</script>

<template>
  <UiCheckField v-if="field.kind === 'boolean'" v-model="checked" :label="label" />
  <UiDateTimeField v-else-if="field.kind === 'datetime'" :id="id" v-model="instant" :label="label" :zone="browserZone()" :hint="field.help" />
  <UiTextField v-else :id="id" v-model="text" :label="field.required ? `${label} *` : label" :placeholder="placeholder ?? field.help" :required="field.required" />
</template>
