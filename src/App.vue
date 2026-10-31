<script setup lang="ts">
// Standalone shell for the Sealed Storage SPA: app header + footer wrapping the core tool view.
// The core UI lives in SealedStorageView.vue (also exported for inline embedding in the dashboard).
import { AppFooter, AppHeader, ColorModeControl, CopyrightLine, UiAppShell, UiBadge, useColorMode } from '@meddleware/ui'
import { network } from './config.js'
import SealedStorageView from './components/SealedStorageView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/sealed-storage/'
</script>

<template>
  <UiAppShell contained>
    <template #header>
      <AppHeader variant="dark">
        <template #brand><span aria-hidden="true">🔒</span> Sealed Storage</template>
        <template #actions>
          <UiBadge :symbol="false">{{ network }}</UiBadge>
          <ColorModeControl :model-value="mode" @update:model-value="set" />
        </template>
      </AppHeader>
    </template>

    <h1 class="mw-visually-hidden">Sealed Storage</h1>
    <SealedStorageView />

    <template #footer>
      <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </AppFooter>
    </template>
  </UiAppShell>
</template>
