import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { inlineMeddleware } from '@meddleware/frontend-config/vitest'

// Unit + component tests. The Vue plugin compiles SFCs for @vue/test-utils mounts; jsdom provides
// the DOM those mounts render into. Pure-logic tests (manifest-guard) run under the same config.
export default defineConfig({
  plugins: [vue()],
  // Keep @vue/test-utils and the compiled SFCs on a single Vue runtime.
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
    // @meddleware/ui imports its own .css (each component brings its CSS), which Node cannot import: process it through Vite.
    server: { deps: { inline: inlineMeddleware } },
  },
})
