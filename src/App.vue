<script setup lang="ts">
// Standalone shell for the Sealed Storage SPA: the shared tool shell (header, colour mode, footer) around the core tool view.
// The core UI lives in SealedStorageView.vue (also exported for inline embedding in the dashboard).
// The shared tool shell and badge, the active network and the tool view.
import { AppToolShell, UiBadge } from '@meddleware/ui'
import { network } from './config.js'
import SealedStorageView from './components/SealedStorageView.vue'

// Where the shell's links point: the user and developer documentation, when the build names them.
const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
const DEV_URL = import.meta.env.VITE_DEV_URL || undefined
</script>

<template>
  <AppToolShell title="Sealed Storage" slug="sealed-storage" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions>
      <UiBadge :symbol="false">{{ network }}</UiBadge>
    </template>

    <!-- The tool itself; the dashboard embeds the same view. -->
    <SealedStorageView />
  </AppToolShell>
</template>
