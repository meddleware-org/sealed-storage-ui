# CLAUDE.md — @meddleware/sealed-storage-ui

## What this app is

A standalone Vue 3 SPA for **Sealed Storage**: client-side Seal encryption + access-gated,
decentralised Walrus storage on Sui. Encrypt a file under a policy, store the ciphertext on Walrus,
and later decrypt it if the on-chain policy allows.

## Architectural invariants

- **No on-chain logic here — extend the domain client.** `suiBoundary()` from
  `@meddleware/eslint-config` (the last entry in `eslint.config.ts`) forbids, in `src/` outside
  `src/wallet.ts`: value imports of `@mysten/sui/{grpc,client,transactions}` (type-only imports are
  fine; `@mysten/sui/jsonRpc` is banned outright), building transactions and chain reads. URL
  bindings on native elements must go through `safeHref`, `safeIcon`, `suiExplorerUrl` or
  `walruscanBlobUrl`. Do not disable it — move the logic into the domain client instead.
- **Thin app, on-chain truth.** No policy logic here — all of it is in `@meddleware/sealed-storage-client`
  (the registry + `SealController`) and the `sealed_storage` Move package. This app only wires config,
  wallet, and storage.
- **Registry-driven UI.** The policy picker and its form fields come from
  `registry.list()` + `provider.describe()`. Adding a policy type needs **no change here** — register
  a provider in `@meddleware/sealed-storage-client` and it appears automatically.
- **No server secrets, no key server.** Decryption keys come from a threshold committee of
  independent key servers (config-supplied). This app never holds key material. We deliberately do
  not run our own key server: it would let us decrypt users' data (workspace
  `docs/architecture/ADR-0002-seal-key-servers.md`, which also covers the mainnet options).
- **Storage is opaque HTTP.** Ciphertext is stored/read via the Walrus HTTP publisher/aggregator
  (`src/walrus.ts`, a thin wrapper over `@meddleware/walrus-storage-client/http`) — no `@mysten/walrus`
  SDK, no wasm. Routing uploads through the Meddleware relay
  (to capture tip/commission) is a documented future enhancement.
- **Wallet-agnostic + shared.** Wallet access goes through `src/wallet.ts`, a thin shim over the
  shared `@meddleware/wallet-adapter` singleton (client and executor for the selected network). The wallet is needed
  only to decrypt (sign the SessionKey personal message) and to publish a discovery pointer. The
  singleton means that when `SealedStorageView` is embedded in the dashboard alongside other tool views,
  they all share one connection. Do not reintroduce a local wallet-standard implementation.
  Declare `@meddleware/wallet-adapter` as a peerDependency (`>=0.0.12 <0.2.0`, plus a devDependency):
  the host's single copy must satisfy every embedded tool, or each gets its own connection.

## Key files

| File | Purpose |
| --- | --- |
| `src/config.ts` | `network` and `explorerNetwork` (both wallet-adapter's `useNetwork()`); `sealConfig(net)` / `activeConfig`: ids from `deployments`, the testnet committee (ids, weights, aggregator, threshold) from sealed-storage-client's `SEAL_COMMITTEES` (never typed here, FU-0062; the mainnet providers' ids stay in `SERVER_DEFAULTS` until they move into `SEAL_COMMITTEES.mainnet` at the mainnet publication), `VITE_*_{NET}` overrides + Walrus endpoints, `problem` (plain words for a person) and `problemCause` (the technical cause, `configCause`, logged with `console.error`) when sealing is unavailable |
| `src/availability.ts` | The two messages a person reads when a network cannot be used (`notAvailableOn`: no recorded deployment; `notAvailableNow`: a setting the person cannot change). The networks to switch to come from the `deployments` records |
| `src/seal.ts` | Per-network `registry` + lazy `SealController` (`originalId` / `publishedAt` from `deployments`) |
| `src/sealed-content.ts` | `discoverSealedContent` over sealed-storage-client `listSealedContent` (optional indexer) |
| `src/wallet.ts` | `createToolWallet({ requiredFeatures: ['sui:signPersonalMessage', 'sui:signTransaction'] })`: `useWallet` / `getSuiClient` / `signPersonalMessage` / `signAndExecute` |
| `src/walrus.ts` | `storeBlob` (returns blob id + `endEpoch`) / `readBlob` over walrus-storage-client `/http`; take the config an operation started with |
| `src/composables/useOperation.ts` | The one operation a view runs at a time (progress, failure), shared by the panels through `provide`/`inject`. Binds it to the network/account it started on (web-utils `createOperationScope`): the view invalidates it on a switch and every `await` in a task is followed by `isCurrent()` |
| `src/composables/useGateSuggestions.ts` | The gates the wallet administers, asked again on a change of account, network or provider (an older answer is ignored) |
| `src/lib/params.ts` | The policy parameters from a form (`encryptParams`, `decryptParams`): one definition of "required" for Encrypt, Decrypt and Re-seal |
| `src/confirm.ts` | Rows for the Encrypt Confirm step (every policy parameter, unlock time in local + UTC) |
| `src/components/SealedStorageView.vue` | Core tool UI: the tabs, the trust note, the running operation's progress and failure, the result of sealing. Exported from `src/index.ts`. |
| `src/components/EncryptPanel.vue`, `DecryptPanel.vue`, `UnlockPanel.vue` | One panel per tab (the wizard steps of each). Re-sealing is part of Decrypt; its result is handed to the view, which shows it on the Encrypt tab |
| `src/components/ConfirmSummary.vue`, `ManifestResult.vue`, `GateIdPicker.vue`, `PolicyField.vue` | The Confirm step (and the gate owner read), the manifest + lifetime + publish, a gate id (picker or typed), one policy field by kind |
| `src/index.ts` | Library entry — exports `SealedStorageView` for the dashboard to render inline |
| `src/App.vue` | Standalone shell only: `AppToolShell` (title and the company mark, docs/dev links) with the network badge in its `actions` slot, around `<SealedStorageView>` |
| `src/e2e.ts`, `src/e2e-data.ts`, `src/e2e-controller.ts` | End-to-end build only (`--mode e2e`): the mock wallet and a stub chain with two gates; the Seal controller is swapped for a stand-in by a Vite alias (`vite.config.ts`), because sealing for real needs a live committee. `main.ts` loads `e2e.ts` behind two static conditions, so no other build contains any of it |

## End-to-end build

`npm run build:e2e` (`VITE_E2E=1 vite build --mode e2e`) is what `npm run test:e2e` serves: the mock wallet shows up in the wallet dialog like an extension, the
stub chain holds two gates the account administers, the stand-in controller "seals" and "unseals" without key servers, and the specs answer the Walrus
publisher and aggregator in the page. So every step of every tab is checked and photographed offline, including the sealed result and the decrypt download.
`vite.config.ts` (`meddlewareApp`) refuses `VITE_E2E` in any other mode.

## Shared tooling

`@meddleware/frontend-config` supplies the Vite and Vitest configuration (`meddlewareApp`, `vueTestConfig`), the tsconfig base, and the `mw-*` bins: `mw-audit-gate`, `mw-third-party-licenses`, `mw-check-csp-inline` (`npm run check:csp`, also in the Dockerfile) and `mw-sync` (`npx mw-sync --check` in CI keeps dependabot.yml, .dockerignore, the postcss/stylelint configs, the audit allowlist and the Dockerfile CSP equal to the `chain` profile; `--write` repairs them). The `"meddleware"` key in package.json declares the kind, CSP profile and Lighthouse use. `meddlewareApp({ name: 'Sealed Storage' })` also emits the brand icon set (favicon, apple-touch-icon, 192/512 icons, `site.webmanifest`) and injects the links, so the app keeps no `public/favicon.*` and no icon `<link>` (`mw-sync --check` fails on the former); `tests/dist.test.ts` (run in CI after the build with `REQUIRE_DIST=1`) checks the icon set, that no font file, font host or third-party load is in `dist/`, and that every origin named is this site, an explorer or a Sui/Seal/Walrus endpoint. The only app-specific part of `vite.config.ts` is the e2e stand-in alias for the Seal controller (mode **and** flag).

## Dual app + library

This package is **both** a standalone SPA (`App.vue` + `main.ts`, `vite build`) and a library
(`src/index.ts` exports `SealedStorageView`, resolved via `"exports"`). The dashboard imports `SealedStorageView` and
wraps it in its own shell + shared wallet. The components bring their own CSS (through `@meddleware/ui`) and the app has no global stylesheet, so a host
needs only the design tokens and ui's `reset.css`. Keep the tool UI shell-free in `SealedStorageView.vue`; `App.vue` must remain a thin shell.

## Network gating

The network is wallet-adapter's shared runtime selector (the standalone `main.ts` selects
`VITE_NETWORK`). Sealing is enabled while `activeConfig.problem` is null, which needs:

- a `sealed_storage` deployment recorded for the network (in sealed-storage-client's `deployments`);
- key servers (testnet: the client's `SEAL_COMMITTEES.testnet`; mainnet: this app's defaults until the client's record has them; or `VITE_SEAL_SERVER_OBJECT_IDS_{NET}`);
- a valid threshold;
- a Walrus publisher (sealing stores the ciphertext).

Otherwise the view shows the reason and disables sealing. What a person reads is plain (words in
`src/availability.ts`): "not available on <network>" where no deployment is recorded (and the networks that have one
to switch to, from the records), "not available here right now" for a setting only the build can change. The
variable names stay in `problemCause`, which `config.ts` logs once with `console.error` (D117). A network switch clears what was shown
for the previous network, and registries and controllers are kept per network.

Mainnet specifics (2026-09-29, workspace grounding log D4):

- The default key servers are three keyless Open-mode servers run by independent operators —
  Overclock, NodeInfra, H2O Nodes — at threshold 2 (workspace ADR-0002, D24): no single operator can
  decrypt and one may be down. `config.ts` never configures an API key; a test enforces it.
- `VITE_SEAL_KEY_CUSTODY_{NET}=operator` marks the self-hosted fallback (Meddleware could decrypt;
  the setting's value keeps its name); the view then shows that notice. Any other value than `independent`/`operator` disables sealing.
- There is no default mainnet Walrus publisher; a network that has a deployment but no publisher
  reports itself unavailable (cause in the console) until `VITE_WALRUS_PUBLISHER_MAINNET` names an
  authenticated publisher. A network with no recorded deployment says so, whatever the settings.
- A threshold outside `[1, total server weight]` disables sealing on that network with the reason.

## Storage and discovery safety

- Publisher uploads are `permanent=true`, use `send_object_to=<connected address>` (the user owns
  the `Blob` object), are capped at `VITE_WALRUS_MAX_UPLOAD_BYTES`, require https and time out.
- Reads use `strict_consistency_check=true`.
- Discovery is sealed-storage-client's `listSealedContent`: `SealedContentPublished` decoded from BCS at the
  deployment's original id, newest first with a page budget, gate ids compared normalised; from
  the read-indexer when `VITE_INDEXER_URL` is set (display data; falls back to the full node).
- Seal gives confidentiality, not authenticity, so discovery lists only the gate owner's pointers
  by default (`gateOperators` -> `listSealedContent({ publishers })`); the Unlock tab has an explicit
  opt-in for other publishers, labelled unverified. `encrypt` refuses a gate that is not a `Gate` of
  the linked `access_gate` package (`accessGateOriginalId`).
- The discovery pointer is built by sealed-storage-client (`buildPublishSealedContentTransaction`) at the
  latest `publishedAt`; this app constructs no transactions itself.
- Download filenames derived from on-chain labels are sanitised.
- Cached SessionKeys are dropped whenever the wallet disconnects or switches account.

## Dependency order

`@meddleware/sealed-storage-client` must be published before the Docker image (or a plain `npm install`) can
build. For local dev: `cd ../sealed-storage-client && npm link`, then `npm link @meddleware/sealed-storage-client` here
(or set the dependency to `file:../sealed-storage-client` temporarily).

## What NOT to do

- Do not add policy-specific logic here — it belongs in `@meddleware/sealed-storage-client` + `sealed_storage`.
- Do not hold or derive decryption keys; the committee does that.
- Do not hardcode or env-configure package ids; they come from `deployments`. Deployment settings
  are read per network via `sealConfig` in `src/config.ts`.
- Do not show a person a build variable, a script or "operator" (D117): put the words in `src/availability.ts`
  and the cause in `problemCause`. `tests/wording.test.ts` holds every template to it.

---

## Deferred documentation — NOT for the `docs.` website (planned here per Part 0.4)

> Captured for the future **`meddleware.dev`** subdomain and white-label offering; excluded
> from the user-facing `docs.` site (which covers encrypt/store/decrypt for end users only).

### `dev.` — developer integration (to write later)

- **Embed `SealedStorageView`** (`import { SealedStorageView } from '@meddleware/sealed-storage-ui'`) with the shared
  `@meddleware/wallet-adapter`; the registry-driven policy picker means new policies need no change
  here. The SDK-level story (controller, providers, manifest) lives in `@meddleware/sealed-storage-client`; the
  on-chain policy contracts in `sealed_storage` (`sealed-storage-sui`).

### White-label path (to write later)

- Deploying against a team's **own `sealed_storage` package + key-server committee**: the
  `VITE_SEAL_*` build args (committee ids, aggregator URLs, threshold) and the published
  `deployments` the package ids come from; branding via design-tokens + `AppHeader`.
