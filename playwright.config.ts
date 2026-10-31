import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// Browser tests of the BUILT app (`vite preview` of dist): Chromium locally, all five browser projects in CI (E2E_BROWSERS=all to run
// them locally). Every request that leaves localhost is refused in the specs (the Walrus endpoints are answered by the specs), so runs
// need no network. The screenshot capture (`npm run shots`) is for looking, not asserting.
// The e2e build (`--mode e2e`) registers a mock wallet, a stub chain and a stand-in Seal controller, so the connected screens can be checked offline.
export default definePlaywrightConfig({ port: 4291, command: 'npm run build:e2e && npx vite preview --port 4291 --strictPort' })
