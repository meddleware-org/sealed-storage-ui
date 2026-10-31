import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import { createApp } from 'vue'
import { loadRuntimeConfig, useSeason } from '@meddleware/ui'
import { useNetwork } from '@meddleware/wallet-adapter'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids, the key servers and the Walrus endpoints all agree. (Embedded, the host's selector rules.)
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const built = env.VITE_NETWORK || 'testnet'
if (built === 'testnet' || built === 'mainnet') useNetwork().setNetwork(built)

useSeason()
// Machine-zone endpoints (the indexer, the Walrus relays) come from /runtime-config.json when the deployment
// serves one (ADR-0005); load it before any module that reads them is imported.
void loadRuntimeConfig().then(async () => {
  // End-to-end builds only: a mock wallet and a stub chain (`src/e2e.ts`). Both conditions are static, so no other build contains it.
  if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1') (await import('./e2e.js')).installE2e()
  const { default: App } = await import('./App.vue')
  createApp(App).mount('#app')
})
