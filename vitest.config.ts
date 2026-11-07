import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

// Unit + component tests. The Vue plugin compiles SFCs for @vue/test-utils mounts; jsdom provides the DOM those mounts render into.
// Pure-logic tests (manifest-guard) run under the same config. The real-browser gate lives in e2e/ (Playwright).
export default defineConfig(vueTestConfig({ plugins: [vue()] }))
