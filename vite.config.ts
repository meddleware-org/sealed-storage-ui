import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// @mysten/seal is pure JS (no wasm). Ciphertext storage uses the Walrus HTTP publisher/aggregator
// (plain fetch), so no @mysten/walrus wasm to exclude here. The end-to-end build (`--mode e2e`) includes a mock wallet and a stand-in
// Seal controller; nothing else may (meddlewareApp refuses VITE_E2E in another mode).
//
// The e2e build seals nothing for real (that needs a live key-server committee): the controller module is swapped for a stand-in. Like
// the harness in `main.ts` it needs the mode AND the flag, and `npm run check:bundle` looks for the stand-in in every production build.
const standIn = fileURLToPath(new URL('./src/e2e-controller.ts', import.meta.url))

export default defineConfig((env) => {
  const alias: Record<string, string> =
    env.mode === 'e2e' && process.env.VITE_E2E === '1' ? { '@meddleware/sealed-storage-client/controller': standIn } : {}
  return meddlewareApp({ plugins: [vue()], config: { resolve: { alias } } })(env)
})
