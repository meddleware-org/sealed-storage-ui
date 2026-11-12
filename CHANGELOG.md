# Changelog

All notable changes to `@meddleware/sealed-storage-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [0.0.49] - 2026-11-12

### Changed

- The standalone page shows the Meddleware mark beside "Sealed Storage" in the header (`@meddleware/ui` ^0.1.41), and the browser tab, home-screen and web-manifest icons are the shared brand icon set. The app keeps no icon of its own: `public/favicon.svg` and the `<link rel="icon">` in `index.html` are removed, and `meddlewareApp` (`@meddleware/frontend-config` ^0.0.8, `name: 'Sealed Storage'`) emits `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and `site.webmanifest` and injects the links.
- No third-party fonts, scripts, styles, images or analytics: the only outside calls are the Sui, Seal and Walrus endpoints the tool exists to use. CI workflows set `DO_NOT_TRACK=1`.
- Internal: `@meddleware/web-utils` ^0.0.4. New tests: the mark in the header, no icon of the app's own, and (over the built `dist/`, run in CI after the build) the icon set once per page, no font file or font host, no third-party load and no origin beyond this site, the explorers and the protocol endpoints.

## [0.0.48] - 2026-11-07

### Changed

- When Sealed Storage cannot be used, the page says what a person can do instead of naming build settings: "Sealed Storage is not available on <network>. Switch to testnet." where the network has no recorded `sealed_storage` deployment (the networks offered come from the deployment records), and "Sealed Storage is not available here right now. Try again later or switch to testnet." when the site's own settings are wrong or incomplete (a `VITE_*` variable, a missing Walrus publisher). The technical cause is written to the console with `console.error` (`problemCause`, `configCause`) instead.
- A network that has a deployment but no Walrus publisher is now reported as unavailable up front (it used to fail only after the person had chosen a file, with a message naming the variable). A network with no deployment says so whatever its other settings are.
- The Confirm step labels the person who owns the gate "Gate owner" (it said "Gate operator"); the link warning says "its owner"; the notice for a site that runs its own key server says Meddleware (it said "this site's operator"). The package author and licence holder are spelled "Meddleware"; the page has a description.
- The standalone page is the shared `AppToolShell` of `@meddleware/ui` ^0.1.40; the network comes from `selectBuiltNetwork` and `useNetwork().explorerNetwork` of `@meddleware/wallet-adapter` ^0.0.22, so the peer range is now `>=0.0.22 <0.2.0`. `SealedStorageView` is exported unchanged.
- Internal: Vite, Vitest and TypeScript configuration come from `@meddleware/frontend-config` ^0.0.7 (`meddlewareApp`, `vueTestConfig`, the `vue-app` tsconfig base; the e2e Seal stand-in alias keeps its mode and flag condition); the audit gate and the licence notices run its `mw-audit-gate` and `mw-third-party-licenses` (the local copies are deleted); `mw-sync --check` and an inline-script check against the Content-Security-Policy (`check:csp`, also in the Dockerfile) run in CI; `@meddleware/web-utils` ^0.0.3.
- Tests for the shell, the plain availability messages, the console cause, a mainnet record without a publisher, and the wording of every template and the page head.

## [0.0.47] - 2026-11-06

### Changed

- Takes `@meddleware/ui` ^0.1.39 (the tab list items use `role="none"`) and the Dependabot merges of 2026-11-06: image bases `static-server` 0.1.12 and a refreshed `node` build image, and newer dev tools.

## [0.0.46] - 2026-11-05

### Security

- CI and the image build scan the production bundle for the e2e harness (`check-prod-bundle` from `@meddleware/frontend-config`), CI proves a production build with `VITE_E2E=1` is refused, and `src/e2e*.ts` is no longer in the published package. The Seal stand-in controller (`src/e2e-controller.ts`, which does no real encryption) is aliased only when the build mode is `e2e` **and** `VITE_E2E` is set, and its markers are in the scan.

### Changed

- Dependency alignment: `@meddleware/ui` ^0.1.38 (form-field edge contrast, sticky-offset and focus-not-obscured fixes), `@meddleware/design-tokens` ^0.1.13, `@meddleware/web-utils` ^0.0.2 and `@meddleware/frontend-config` ^0.0.2 (the shared sweep now also checks that focus is not hidden behind fixed content).

## [0.0.45] - 2026-10-31

- Panels split from the view, shared operation scope

## [0.0.44] - 2026-10-30

- Dependency updates (minor and patch groups) and workflow action bumps. No source change.

## [0.0.43] - 2026-10-30

- Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages.

## [0.0.42] - 2026-10-24

### Changed

- Text names the Move package `sealed_storage` (ADR-0004).
- Runtime endpoint config: the indexer can be overridden by a same-origin `/runtime-config.json` (`@meddleware/ui` 0.1.34; workspace ADR-0005).
- Ships its own `robots.txt` and `llms.txt`.

## [0.0.41] - 2026-10-24

### Changed

- Renamed from `seal-ui` to `sealed-storage-ui` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`). No code change beyond names, paths, hostnames and dependency names; the history below keeps the old names.

## [0.0.40] - 2026-10-22

### Changed

- Dependencies: walrus-client ^0.0.30 (flow passes the real challenge expiry; nft-gate-client 0.0.18 rules), walrus-relay ^0.1.33, access-gate-client ^0.0.10 (stale indexer fallback); image base static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943)

## [0.0.39] - 2026-10-19

### Changed

- `@meddleware/walrus-client` ^0.0.29 (relay tip ceiling re-derived from the workspace cost model, D57); dependency updates and the Node 26 baseline merged since 0.0.38

## [0.0.38] - 2026-10-18

### Added

- The Confirm step lists every parameter the content is sealed to (the gate id or the unlock time in local time and UTC) and the gate operator read from the chain; a gate preselected by a `?gate=` link needs an explicit confirmation before **Encrypt & store** is enabled
- The ciphertext's storage lifetime is shown: epochs on the Confirm step and in the trust panel, the publisher's end epoch and `Blob` object id on the result, with the way to extend it

### Changed

- Dependencies: seal-client ^0.0.20, walrus-client ^0.0.28, access-gate-client ^0.0.9, design-tokens ^0.1.10; image base static-server 0.1.8
- `VITE_WALRUS_EPOCHS` must be an integer in 1..53 (anything else disables sealing with the reason)
- The npm release workflow runs the full CI workflow (including the unit tests) before publishing
- The two public testnet key-server build values are passed from repository variables, not secrets; `.env*` (except `.env.example`) is git-ignored

### Fixed

- Primary buttons draw their label in `--accent-contrast` (white on the light dark-theme accent was 2.4-3.0:1)
- An encrypt, re-seal, decrypt, publish or discovery still running when the network or account changes is bound to the state it started in and dropped on completion, so it no longer labels a manifest with the new network, stores on the new network's publisher or sends the `Blob` object to another account
- Caller-keyed configuration lookups use `Object.hasOwn`; an unjustified `as never` cast is removed

## [0.0.37] - 2026-10-09

### Changed

- Release gate: the release runs the full CI workflow, the image is scanned (fixable CRITICAL/HIGH fail) before it is signed, third-party licence notices are served at /THIRD_PARTY_LICENSES and the lockfile ships in the image for SBOM tools

## [0.0.36] - 2026-10-09

### Changed

- Image base static-server 0.1.7 (Go 1.26.9) and an explicit non-root USER; merged tooling updates; walrus-client ^0.0.27 (owned blobs list again)

## [0.0.35] - 2026-10-09

### Changed

- Depends on wallet-adapter ^0.0.17 (chain-id check, look-alike wallet warning, single local-URL rule)

## [0.0.34] - 2026-10-09

### Changed

- Image base moved to static-server 0.1.6 (OpenRoot, dotfile refusal)

## [0.0.33] - 2026-10-09

### Changed

- Manifest check validates the policy type and params against the network's registry (seal-client 0.0.19 `parseSealedManifest(text, registry)`); depends on access-gate-client ^0.0.8, seal-client ^0.0.19, ui ^0.1.31, design-tokens ^0.1.9, eslint-config ^0.0.2

## [0.0.32] - 2026-10-08

### Changed

- Operator-only discovery by default (opt-in for other publishers), refuse non-linked gates when sealing, publisher result handling; seal-client 0.0.16, access-gate-client 0.0.6, walrus-client 0.0.26

## [0.0.31] - 2026-10-03

### Changed

- seal-client 0.0.15, walrus-client 0.0.25, access-gate-client 0.0.4, ui 0.1.30, design-tokens 0.1.8.

## [0.0.30] - 2026-10-02

- **What you should know before sealing** (always shown): the key-server threshold, that the
  `seal_policies` package can still be upgraded until it is made immutable (changing access to sealed
  content), that released keys cannot be taken back, and that labels and gates are public.
- `@meddleware/seal-client` 0.0.14 (every policy verifies its identity layout; approve PTBs hold only
  `seal_approve*` calls) and `@meddleware/walrus-client` 0.0.24 (blob reads capped at 100 MiB).

## [0.0.29] - 2026-10-02

- `@meddleware/access-gate-client` 0.0.3 and `@meddleware/seal-client` 0.0.13: gate reads fail closed
  on a malformed object, and sealed-content discovery reads the indexer only over https.

## [0.0.28] - 2026-10-02

- `@meddleware/walrus-client` 0.0.22 (relay challenge requests time out).
- Ships the brand favicon (`/favicon.svg`); the old `/favicon.ico` link pointed at a missing file.

## [0.0.27] - 2026-10-02

- **Mainnet key servers** (workspace ADR-0002, D24): three keyless Open-mode servers run by
  independent operators — Overclock, NodeInfra, H2O Nodes — at threshold 2, replacing the planned
  Enoki committee. Mainnet sealing still waits for the mainnet `seal_policies` package.
- **No API key path.** `VITE_SEAL_AGGREGATOR_API_KEY_{NET}` is gone; a key in a `VITE_*` var would ship
  in the bundle. A test proves no server is ever configured with one.
- **Custody notice.** `VITE_SEAL_KEY_CUSTODY_{NET}` (`independent` by default, or `operator` for the
  self-hosted fallback) — with `operator`, the view says the site's operator could decrypt.
- **Re-seal** (Decrypt tab): decrypts content with the key servers it was sealed to and seals it again
  for the current ones, producing a new manifest (`@meddleware/seal-client` 0.0.12).
- The publish workflow passes the mainnet server ids, threshold and custody variables, so switching
  servers is a repository-variable change.

## [0.0.26] - 2026-10-02

- Targets the version-gated `seal_policies` (testnet `0x61c4aa…`) through `@meddleware/seal-client`
  0.0.11: the controller and the sealed-content publish pass the shared `PolicyConfig`.
  `@meddleware/access-gate-client` `^0.0.2` (version-gated `access_gate` `0xa55789…`).
- Testnet content sealed under the superseded `0x42cc18…` package (test data) no longer decrypts
  here: its ciphertexts name that package, which the controller refuses.

## [0.0.25] - 2026-10-01

- `@meddleware/walrus-client` range `>=0.0.21 <0.2.0` (was `^0.0.20`, an exact pin on 0.0.x), so a
  host such as the dashboard shares one copy.

## [0.0.24] - 2026-10-01

- Runs on static-server 0.1.3 (per-response CSP script nonce for Cloudflare JavaScript
  Detections, HSTS, Permissions-Policy).
- `@meddleware/seal-client` 0.0.10: calls target seal_policies v2 (`0x8fcf9c39…15cb`); identities
  still use the original id, so existing ciphertexts decrypt unchanged.

## [0.0.12] - 2026-09-17

### Added

- `VITE_DOCS_URL` build-time env var — configures the documentation link rendered in the app
  footer. Defaults to `https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/`.
- `homepage` in `package.json` — links to the Sealed Storage docs section on npmjs.com.

## [0.1.0] - 2026-09-02

### Added

- Initial release. Sealed Storage SPA:
  - Encrypt a file under a registry-driven policy (nft-gate, time-lock), store the ciphertext on
    Walrus (HTTP publisher), and download a portable manifest.
  - Decrypt from a manifest: fetch ciphertext, mint a Seal SessionKey via one wallet signature, and
    download the plaintext.
  - Testnet-first with a mainnet-pending notice (Seal committee mode is testnet-only).
