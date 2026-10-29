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
| `src/config.ts` | `network` (wallet-adapter selector); `sealConfig(net)` / `activeConfig`: ids from `deployments`, committee + threshold + Walrus endpoints from `VITE_*_{NET}`, and `problem` when sealing is unavailable |
| `src/seal.ts` | Per-network `registry` + lazy `SealController` (`originalId` / `publishedAt` from `deployments`) |
| `src/sealed-content.ts` | `discoverSealedContent` over sealed-storage-client `listSealedContent` (optional indexer) |
| `src/wallet.ts` | Shim over `@meddleware/wallet-adapter` for the selected network; re-exports `useWallet` / `getSuiClient` / `signPersonalMessage` / `signAndExecute` |
| `src/walrus.ts` | `storeBlob` (returns blob id + `endEpoch`) / `readBlob` over walrus-storage-client `/http`; take the config an operation started with |
| `src/operation-scope.ts` | Tokens that bind an async operation to the network/account it started on; `SealedStorageView` invalidates them on a switch and every `await` is followed by `isCurrent()` |
| `src/confirm.ts` | Rows for the Encrypt Confirm step (every policy parameter, unlock time in local + UTC) |
| `src/components/SealedStorageView.vue` | Core tool UI (Encrypt/Decrypt/Unlock tabs, generic policy form, manifest, publish pointer). **Scoped** styles so it embeds without the global stylesheet. Exported from `src/index.ts`. |
| `src/index.ts` | Library entry — exports `SealedStorageView` for the dashboard to render inline |
| `src/App.vue` | Standalone shell only: `AppHeader` (+ network badge, `ColorModeControl`) + `<SealedStorageView>` + `AppFooter` |
| `src/styles.css` | Standalone-only globals (body/#app/h1); imported by `main.ts`. Component styles live scoped in `SealedStorageView.vue` — do NOT move them back here (a global import would restyle a host's body/#app/inputs). |

## Dual app + library

This package is **both** a standalone SPA (`App.vue` + `main.ts`, `vite build`) and a library
(`src/index.ts` exports `SealedStorageView`, resolved via `"exports"`). The dashboard imports `SealedStorageView` and
wraps it in its own shell + shared wallet. `SealedStorageView` carries its own **scoped** styles, so no
consumer needs sealed-storage-ui's `styles.css`. Keep the tool UI shell-free in `SealedStorageView.vue`; `App.vue` must
remain a thin shell.

## Network gating

The network is wallet-adapter's shared runtime selector (the standalone `main.ts` selects
`VITE_NETWORK`). Sealing is enabled while `activeConfig.problem` is null, which needs:

- a `sealed_storage` deployment recorded for the network (in sealed-storage-client's `deployments`);
- key servers (defaults on testnet and mainnet, or `VITE_SEAL_SERVER_OBJECT_IDS_{NET}`);
- a valid threshold.

Otherwise the view shows the reason and disables sealing. A network switch clears what was shown
for the previous network, and registries and controllers are kept per network.

Mainnet specifics (2026-09-29, workspace grounding log D4):

- The default key servers are three keyless Open-mode servers run by independent operators —
  Overclock, NodeInfra, H2O Nodes — at threshold 2 (workspace ADR-0002, D24): no single operator can
  decrypt and one may be down. `config.ts` never configures an API key; a test enforces it.
- `VITE_SEAL_KEY_CUSTODY_{NET}=operator` marks the self-hosted fallback (the operator could decrypt);
  the view then shows that notice. Any other value than `independent`/`operator` disables sealing.
- There is no default mainnet Walrus publisher; storing fails with a clear error until
  `VITE_WALRUS_PUBLISHER_MAINNET` names an operator-run publisher.
- A threshold outside `[1, total server weight]` disables sealing on that network with the reason.

## Storage and discovery safety

- Publisher uploads are `permanent=true`, use `send_object_to=<connected address>` (the user owns
  the `Blob` object), are capped at `VITE_WALRUS_MAX_UPLOAD_BYTES`, require https and time out.
- Reads use `strict_consistency_check=true`.
- Discovery is sealed-storage-client's `listSealedContent`: `SealedContentPublished` decoded from BCS at the
  deployment's original id, newest first with a page budget, gate ids compared normalised; from
  the read-indexer when `VITE_INDEXER_URL` is set (display data; falls back to the full node).
- Seal gives confidentiality, not authenticity, so discovery lists only the gate operator's pointers
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
- Do not hardcode or env-configure package ids; they come from `deployments`. Operator settings
  are read per network via `sealConfig` in `src/config.ts`.

---

## Deferred documentation — NOT for the `docs.` website (planned here per Part 0.4)

> Captured for the future **`meddleware.dev`** subdomain and white-label offering; excluded
> from the user-facing `docs.` site (which covers encrypt/store/decrypt for end users only).

### `dev.` — developer integration (to write later)

- **Embed `SealedStorageView`** (`import { SealedStorageView } from '@meddleware/sealed-storage-ui'`) with the shared
  `@meddleware/wallet-adapter`; the registry-driven policy picker means new policies need no change
  here. The SDK-level story (controller, providers, manifest) lives in `@meddleware/sealed-storage-client`; the
  on-chain policy contracts in `sealed_storage` (`sealed-storage-sui`).

### White-label operator path (to write later)

- Deploying against an operator's **own `sealed_storage` package + key-server committee**: the
  `VITE_SEAL_*` build args (committee ids, aggregator URLs, threshold) and the published
  `deployments` the package ids come from; branding via design-tokens + `AppHeader`.
