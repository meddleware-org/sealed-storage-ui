import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assertE2eOnlyInE2eMode, themeInit, viteTarget } from '@meddleware/frontend-config/vite'

// @mysten/seal is pure JS (no wasm). Ciphertext storage uses the Walrus HTTP publisher/aggregator
// (plain fetch), so no @mysten/walrus wasm to exclude here.
export default defineConfig(({ mode }) => {
  // The end-to-end build (`--mode e2e`) includes a mock wallet and a stand-in Seal controller; nothing else may.
  assertE2eOnlyInE2eMode(mode)
  // The e2e build seals nothing for real (that needs a live key-server committee): the controller module is swapped for a stand-in.
  const alias: Record<string, string> =
    mode === 'e2e' ? { '@meddleware/sealed-storage-client/controller': fileURLToPath(new URL('./src/e2e-controller.ts', import.meta.url)) } : {}
  return {
    build: { target: viteTarget() },
    plugins: [vue(), themeInit({ default: 'dark' })],
    resolve: { alias },
    optimizeDeps: {
      // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton; if it
      // were pre-bundled, its .vue files (served raw) would load a second copy of the singleton in dev.
      exclude: ['@meddleware/wallet-adapter'],
    },
  }
})
