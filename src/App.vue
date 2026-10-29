<script setup lang="ts">
// Standalone shell for the Sealed Storage SPA: app header + footer wrapping the core tool view.
// The core UI lives in SealedStorageView.vue (also exported for inline embedding in the dashboard).
import { AppHeader, AppFooter, ColorModeControl, useColorMode } from '@meddleware/ui'
import { network } from './config.js'
import SealedStorageView from './components/SealedStorageView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/'
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://meddleware.dev/sui/sealed-storage/'
</script>

<template>
  <div class="app">
    <AppHeader variant="dark">
      <template #brand>
        <h1 class="brand-title">🔒 Sealed Storage</h1>
      </template>
      <template #actions>
        <span class="badge">{{ network }}</span>
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <main class="app__content">
      <SealedStorageView />
    </main>

    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Centre the tool at the shared tool-content width when running standalone. The dashboard
   supplies its own width container, so this lives in the shell, not SealedStorageView. */
.app__content {
  flex: 1;
  width: 100%;
  max-width: var(--mw-tool-content-max);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 1.5rem 1.25rem 4rem;
}

.badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--border);
}

/* The app title is the page's h1; keep the header's own type styles. */
.brand-title {
  font: inherit;
  margin: 0;
}
</style>
