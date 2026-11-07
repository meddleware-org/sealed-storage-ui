<script setup lang="ts">
// Standalone shell for the Sealed Storage SPA: the shared tool shell (header, colour mode, footer) around the core tool view.
// The core UI lives in SealedStorageView.vue (also exported for inline embedding in the dashboard).
import { AppToolShell, UiBadge } from '@meddleware/ui'
import { network } from './config.js'
import SealedStorageView from './components/SealedStorageView.vue'

const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
const DEV_URL = import.meta.env.VITE_DEV_URL || undefined
</script>

<template>
  <AppToolShell title="Sealed Storage" slug="sealed-storage" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions>
      <UiBadge :symbol="false">{{ network }}</UiBadge>
    </template>

    <SealedStorageView />
  </AppToolShell>
</template>
