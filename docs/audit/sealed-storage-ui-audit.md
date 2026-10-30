# Security Audit — `sealed-storage-ui`

**Classification:** Internal security review
**Project:** `repos/sealed-storage-ui` — `@meddleware/sealed-storage-ui`, Vue 3 SPA and library for sealing content to Sui policies with Seal and storing it on Walrus (`sui-sealed-storage.meddleware.co.uk`; embedded in the dashboard)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_SEAL.md (2026-09-30) + AUDIT_TEMPLATE_WALRUS.md (2026-09-30) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
Not triggered: AUTH (no credential is held or issued; the SessionKey is sealed-storage-client's, in memory, and no API key exists), OPS (no script signs on a real chain), PROXY, WORKERS, GO, RUST, SITE, PLATFORM (the cluster is audited with the workspace).
**Seal SDK:** `@mysten/seal` 1.4.19 (peer of `@meddleware/sealed-storage-client` 0.0.20, `^1.4.18`; one copy)
**Key-server mode:** testnet: Mysten committee via its aggregator + two Mysten Open-mode servers (the aggregator counts as one server); mainnet: three keyless Open-mode independent servers (ADR-0002, D24)
**Key servers per network:** testnet `0xb012378c…1e98` (committee, aggregator `seal-aggregator-testnet.mystenlabs.com`), `0x73d05d62…db75`, `0xf5d14a81…23c8` (Mysten Open); mainnet `0x145540d9…08b6` (Overclock), `0x1afb3a57…5475` (NodeInfra), `0x4a65b4ff…286a` (H2O Nodes); overridable per network by build variables, never with an API key
**Threshold:** 2 on both networks (weights counted; validated by `thresholdError`)   **verifyKeyServers:** sealed-storage-client switches it off as soon as any server uses an aggregator, so off on testnet and on for the mainnet set   **checkShareConsistency:** on (sealed-storage-client default)
**Key custody notice:** `VITE_SEAL_KEY_CUSTODY_{NET}` (`independent` | `operator`); operator mode shows a warning; any other value disables sealing
**Policy package:** testnet `seal_policies` `0x0c8f7349…773d` (original = published-at; republished 2026-10-09, links `access_gate` `0xd7ddaa94…`), `PolicyConfig` `0xee0403ba…7d1a`, from sealed-storage-client 0.0.20 `deployments`; UpgradeCap with the deploy key until the multisig transfer and burn in CUSTODY.md (`OPERATOR_TASKS.md` "Mainnet release custody"); the superseded `0x61c4aa…` (and older) are immutable, and content sealed under them no longer decrypts (decision: legacy namespaces unsupported); mainnet: not published, sealing shows "unavailable"
**Walrus SDK:** none; ciphertext goes through the HTTP publisher and aggregator (`@meddleware/walrus-storage-client/http` 0.0.28); no wasm
**Package config source:** `deployments` of sealed-storage-client and access-gate-client (never env)
**Upload relays:** none (the Meddleware relay is a documented future option)
**Aggregator / publisher hosts:** testnet publisher `publisher.walrus-testnet.walrus.space`, aggregator `aggregator.walrus-testnet.walrus.space`; mainnet aggregator `aggregator.walrus-mainnet.walrus.space`, publisher none (Walrus runs no public mainnet publisher; storing fails with a clear message)
**Tip ceiling:** n/a (publisher pays)   **Epoch default / maximum:** 5 (`VITE_WALRUS_EPOCHS`, validated as an integer in 1..53) / 53, shown on the Confirm step and the result with the publisher's end epoch (F12)
**Deletable default:** permanent (`permanent=true` in the walrus-storage-client call); the `Blob` object is sent to the user's address (`send_object_to`), who controls its lifetime
**Sui SDK:** `@mysten/sui ^2.33.2` (installed 2.35.0, one copy; `npm ls` single version)   **Transport:** gRPC through wallet-adapter
**Networks:** testnet (live); mainnet shows "unavailable" until `seal_policies` is published there; localnet likewise
**On-chain packages consumed:** `seal_policies` (above) and the `access_gate` original id `0xd7ddaa94…88c9` through access-gate-client 0.0.9 `deployments` (gate suggestions, linked-gate check); call targets `publishedAt`, identities and events `originalId`; never configuration
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.12, TypeScript 6.0.3, vitest 5.0.3
**Hosting:** container image on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard (`SealedStorageView`, scoped styles, no shell chrome)
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only), `VITE_SEAL_SERVER_OBJECT_IDS_{NET}` / `VITE_SEAL_AGGREGATOR_URLS_{NET}` / `VITE_SEAL_THRESHOLD_{NET}` / `VITE_SEAL_KEY_CUSTODY_{NET}` (committee, per network), `VITE_WALRUS_PUBLISHER_{NET}` / `VITE_WALRUS_AGGREGATOR_{NET}` (storage hosts), `VITE_WALRUS_EPOCHS`, `VITE_WALRUS_MAX_UPLOAD_BYTES` (limits), `VITE_INDEXER_URL` (discovery read), `VITE_DOCS_URL` / `VITE_DEV_URL` (footer links); all public, none secret, none selects an on-chain package id; `.env.example` lists them all
**Images:** `quay.io/meddleware-org/sealed-storage-ui:0.0.38@sha256:a000ba2e460ab839d1dbefecec43057518a1a1d0670fdc04a49d9c431419d174` (Docker Hub mirror, same digest; cosign keyless signature verified 2026-10-18 against the workflow-anchored identity, `verify-digests.sh` 16/16; SPDX SBOM attestation, build provenance). Superseded 0.0.37 was `sha256:7e919894…1b86`
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000`
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/sealed-storage-ui/overlays/default`; digest from `config/images.yaml`
**Build args:** `CSP`, `VITE_NETWORK` and the `VITE_SEAL_*`, `VITE_WALRUS_*`, `VITE_INDEXER_URL` variables above — none secret, none a test switch (F15: the two public values are passed from a repository variable, falling back to the existing secret)
**Deployment status:** npm v0.0.38 (2026-10-18); image `quay.io/meddleware-org/sealed-storage-ui` serving `sui-sealed-storage.meddleware.co.uk` at 0.0.38 (`sha256:a000ba2e…d174`; release tag `v0.0.38` = `907df8d`; released, signature verified and deployed 2026-10-18, rollout succeeded; 0.0.37 `sha256:7e919894…` was deployed 2026-10-09; the live bundle carries `seal_policies` `0x0c8f7349…`, `PolicyConfig` `0xee0403ba…`, `access_gate` `0xd7ddaa94…` and no superseded id, checked 2026-10-18; live headers re-checked 2026-10-18); embedded in dashboard 0.1.85
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-02 · re-verified 2026-10-09 · fix wave 2026-10-18 (0.0.38, released and deployed); 0.0.43 re-verified 2026-10-30 (Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages)
**Reviewer:** Internal review
**Severity ceiling:** Medium — confidentiality comes from Seal and the on-chain policy; the app chooses the policy, identity and storage and presents what users are sealing to, so a defect can mislead or deny, not disclose on its own.
**Status:** fix wave 2026-10-18 (0.0.38; released and deployed 2026-10-18, signature verified, rollout succeeded); re-verified 2026-10-09

---

## Executive summary

The UI over sealed-storage-client and walrus-storage-client: pick a policy (nft-gate, time lock), encrypt in the
browser, store the ciphertext on Walrus through a publisher, publish a discovery pointer, and later
discover, fetch and decrypt. Mainnet key servers are three independent Open-mode operators at
threshold 2 (D24); re-sealing onto a new server set is built in (`describeCiphertext`). The app holds
no keys and no on-chain logic of its own (the `suiBoundary` lint is clean), has no `v-html` and no
browser storage, and keeps SessionKeys in memory (sealed-storage-client).

First-pass findings are resolved or adjudicated. Earlier passes found:

- **F6 (Low, RESOLVED 0.0.30)** — SEAL-M8 requires telling users that the policy package's
  UpgradeCap holder can change access to content already sealed; the app did not. A **What you should
  know before sealing** panel now states it, with the threshold, permanent key release and public
  labels.

Fix wave 2026-10-18 (0.0.38; 72 unit tests, type-check and all three linters green, audit gate 1 allowlisted
/ 0 open; dependencies: sealed-storage-client 0.0.20, walrus-storage-client 0.0.28, access-gate-client 0.0.9, design-tokens 0.1.10;
runtime base static-server 0.1.8).

Re-verified 2026-10-09 (0.0.37; 37 unit tests, type-check and all three linters green, audit gate
1 allowlisted / 0 open; live site `sui-sealed-storage.meddleware.co.uk` and its bundle read the same day):

- **F7 (Low, RESOLVED 0.0.32–0.0.33)** — seal gives confidentiality, not authenticity. Discovery now
  lists only the gate operator's pointers (others opt-in and labelled unverified), sealing refuses a
  gate of another `access_gate` package (and, in sealed-storage-client 0.0.18, a transferable-pass gate), and a
  pasted manifest is checked against the network's policy registry.
- **F8 (Low, RESOLVED 0.0.34–0.0.37)** — the image release now runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES` (HTTP 200 live), runs as an explicit `USER 65534:65534` on static-server 0.1.7,
  and the pod sets `automountServiceAccountToken: false`.
- The known CI gap found in the sibling web apps **was present here**: **F9 (Low, RESOLVED)**
  `node-ci.yml` did not run the unit tests (it does since `6d0aa5d`), and since 0.0.37 the image release
  `verify` job called it instead of its own `npm test` step; the npm job's `verify` now calls it too (0.0.38).
- The newly applicable lens checks found further defects, **all fixed in 0.0.38 (fix wave 2026-10-18)**:
  **F10 (Low, RESOLVED)** the primary buttons drew white text on `--accent`, 2.4–3.0:1 in the dark theme
  (now `var(--accent-contrast)`); **F11 (Low, RESOLVED)** an encrypt, re-seal or discovery still running when
  the network or account changed finished against the new state (now bound to the state it started in and
  dropped on a switch); **F12 (Low, RESOLVED)** the ciphertext's storage lifetime is shown with the
  publisher's end epoch and the extension path; **F13 (Low, RESOLVED)** the Confirm step lists the sealed-to
  parameters and the gate operator, and a gate preselected by a link needs an explicit confirmation;
  **F14 (Info, RESOLVED)** two TypeScript hygiene points; **F15 (Info, RESOLVED)** repository hygiene.
- design-tokens F10 (`color: var(--warning)` as text): not present here; the warning notice is a fixed
  `#d29922` tint behind `currentColor` text (not a text colour).
- Accepted or maintainer items: **F16** blanket `connect-src https:` (ACCEPTED-RISK), **F17** the npm
  job's gate was a subset of CI (RESOLVED 0.0.38: it calls `node-ci.yml`), **F18** the cosign identity pinned the repository, not the workflow (RESOLVED 2026-10-18: the workspace `verify-digests.sh` default is now workflow-anchored), **F19**
  registry mirror and credential inventory (DEFERRED, maintainer).

Library fixes reach the app: every policy verifies its identity layout and approve PTBs hold only
`seal_approve*` calls (sealed-storage-client F10, F11); blob reads are capped and publisher responses are bounded
(walrus-storage-client F10); discovery reads the indexer only over https (sealed-storage-client F12); the republished
`seal_policies` `0x0c8f7349…` linking the republished `access_gate` (sealed-storage-client 0.0.19). sealed-storage-client's live
testnet suite passed against the new packages on 2026-10-09; the end-to-end seal and decrypt in this UI is
not browser-tested here (C.2).

The severity ceiling stays Medium.

## Threat model / trust boundaries

**Trust anchor:** t of the configured key servers, each dry-running `seal_approve` on-chain.

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| User | wallet, passes, content | seal, store, decrypt | wallet confirmation; policies on-chain |
| Key servers | master shares | release or withhold; t together can decrypt | threshold; independent operators (mainnet); notice for operator custody |
| Policy UpgradeCap holder | package upgrades | change access to existing content | disclosed (F6); CUSTODY.md transfer and burn plan |
| Walrus publisher / aggregator | bytes | store or serve wrong bytes; stop storing at expiry | AES-GCM (tampering fails); strict consistency read; read cap; bounded response; the lifetime and end epoch are shown, with the extension path (F12) |
| Pointer / manifest supplier | labels, ids | mislabel; point at another identity; publish to any gate | operator-only listing by default (F7); manifest validation (F1); identity checks in sealed-storage-client |
| Indexer | pointer rows | list pointers | display only; https |
| Whoever controls the build environment | the key-server set, threshold, publisher and indexer URLs (public `VITE_*`) | seal to servers they choose | public values, no package id or API key can be configured (I1); custody notice (I2) |
| Link author (`?gate=`) | a preselected gate in the Encrypt form | steer a user to seal to a gate they control | the gate id is visible in the form and repeated on the Confirm step with the gate operator read from the chain; a link-preselected gate needs an explicit confirmation (F13) |
| Embedding host (dashboard) | the page around `SealedStorageView`, the shared wallet | switch account or network under the view | session clearing (I6), synchronous network/account watcher; in-flight operations are bound to the state they started in and drop their result on a switch (F11) |
| Base-image publisher, registry, CI publish job | image layers, what is signed | ship altered bytes | digest pinning, Trivy before cosign, keyless signature, SBOM and provenance (F8) |

### On-chain dependency matrix

| Object / package | ID (original-id · published-at) | Sourced from | Used as | If stale, wrong or attacker-supplied | Fails open / closed |
| --- | --- | --- | --- | --- | --- |
| `seal_policies` package, testnet | `0x0c8f7349…773d` · same (fresh publication 2026-10-09) | sealed-storage-client 0.0.19 `deployments` | identity namespace (`originalId`); `seal_approve*` and `publish` target (`publishedAt`) | ciphertext bound to another namespace never decrypts; superseded packages are refused | closed: no deployment ⇒ sealing disabled with the reason |
| `PolicyConfig`, testnet | `0xee0403ba…7d1a` | same | argument of every approve and publish | a stale version gate rejects calls | closed |
| `access_gate` package, testnet | `0xd7ddaa94…88c9` | access-gate-client 0.0.8 `deployments` | gate type filter for suggestions and the linked-gate check | a gate of another package could be sealed to (never unlockable) | closed: `assertLinkedGate` refuses it (F7) |
| `SealedContent` events | defined at `seal_policies` `originalId` | sealed-storage-client | discovery | look-alike events | closed (exact type, BCS decode) |
| Key servers | object ids (build/config) | `config.ts` defaults or `VITE_SEAL_SERVER_OBJECT_IDS_{NET}` | committee | wrong servers ⇒ cannot decrypt, or a wrong custody claim | closed on threshold errors; custody notice (I2) |
| mainnet | none recorded | — | — | — | closed (notice, sealing disabled) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.0.38):** `src/**` (`SealedStorageView.vue`, `seal.ts`, `walrus.ts`, `config.ts`, `manifest-guard.ts`, `confirm.ts`, `operation-scope.ts`,
  `sealed-content.ts`, `wallet.ts`, `App.vue`, `main.ts`, `styles.css`), `index.html`, `public/`,
  `Dockerfile`, `.dockerignore`, workflows, `.github/audit-gate.mjs`, `.github/dependabot.yml`,
  `scripts/third-party-licenses.mjs`, `SECURITY.md`; the manifests in `post-bootstrap/sealed-storage-ui/`
  (read-only).
- **Out of scope:** sealed-storage-client, walrus-storage-client, access-gate-client (own audits); key servers.
- **Environment (2026-10-18):** `npm test` 72/72 (12 files, vitest 5.0.3); `vue-tsc`; stylelint, eslint
  (+ vuejs-a11y), html-validate; production build; audit gate (1 allowlisted advisory, 0 open);
  `npm pack --dry-run` (19 files, source and changelog only); live headers and bundle of
  `sui-sealed-storage.meddleware.co.uk`. sealed-storage-client's live testnet suite exercises the same encrypt/decrypt path
  against the new packages (PASS 2026-10-09).

## Findings

### F1 — Manifest schema and network validated before decrypt

**Severity:** Low   **Disposition:** RESOLVED — `checkManifestForNetwork`; tests in
`manifest-guard.test.ts` (the first pass cited `sealed-storage-view.gating.test.ts`, which tests the gating notices).
**Remediation / evidence (2026-10-09):** since 0.0.33 (`972cea7`) the check also takes the network's
policy registry (sealed-storage-client 0.0.19 `parseSealedManifest(text, registry)`): the identity must be
even-length hex, the policy type must be registered and its params must parse and are narrowed to the
known keys, so a bad manifest fails at import, not at transaction build time. Tested: cross-network
message, malformed JSON, missing fields, unregistered policy type, network mismatch reported before a
policy error.

### F2 — Ciphertext trusts the Walrus endpoint

**Severity:** Low   **Disposition:** ADJUDICATED — AES-256-GCM makes tampering fail decryption; the
aggregator read uses `strict_consistency_check`; availability depends on Walrus (SECURITY.md).
**Remediation / evidence (2026-10-09):** the HTTP helpers refuse a non-https endpoint and redirects, cap
the read at 100 MiB and the publisher response at 64 KiB, require a valid blob id, and `storeBlob` refuses
an `alreadyCertified` answer (the user would own no Blob object to extend). Tested (`walrus.test.ts`).
Residual: the write side is not read back, so a publisher that returns a blob id for other bytes shows up
only at the first decrypt; accepted for a testnet publisher, and the user can read the blob back through
the aggregator.

### F3 — Attacker-supplied `params` as an input placeholder

**Severity:** Info   **Disposition:** ACCEPTED-RISK — text only, never HTML. Re-verified 2026-10-09: the
placeholder is `String(manifest.params[name])` bound as an attribute value; the registry now narrows
`params` to known keys on import (F1).

### F4 — No `SECURITY.md`

**Severity:** Low   **Disposition:** RESOLVED. Re-read 2026-10-09: present; its invariants (no keys held,
sealing fails closed per network, no secret in `VITE_*`, custody disclosed, no HTML sinks) match the code
and this audit; supported versions: latest only.

### F5 — Verified-clean properties

**Severity:** Positive — no API key in any build (mainnet servers are keyless; a config test proves no
key header); `verifyKeyServers` on where no aggregator is used; mainnet sealing refuses until the
policy package exists; decrypted files download through a sanitised file name; SessionKeys cleared on
disconnect and account switch (`clearSession`); discovery decoded from BCS at the original id.
Re-verified 2026-10-09: `config.test.ts` (never an API key; mainnet three servers at threshold 2; a
threshold no committee can meet is reported), `safeFileName` (word characters, dots and dashes, 100
characters, no leading dot), the plaintext `Blob` is downloaded, never rendered, and `clearSealSessions` is
called on disconnect and on an account change (`SealedStorageView.vue`; the clearing itself is tested in
sealed-storage-client).

### F6 — Policy upgradeability not disclosed

**Severity:** Low   **Disposition:** RESOLVED (0.0.30, `f1b8c77`)
**Where:** `src/components/SealedStorageView.vue`
**Issue:** SEAL-M8 — users were not told that until the `seal_policies` UpgradeCap is burned, its
holder can change who may decrypt existing content (the testnet cap is live).
**Impact:** users could seal data believing access was fixed.
**Remediation / evidence:** an always-present `<details>` panel lists the threshold (from the active
config), the upgradeability, permanent release and public labels; sealed-storage-client's `SECURITY.md` carries
the same text (sealed-storage-client F13). Re-verified 2026-10-09: the panel is still present and its wording is
still true — the republished testnet package's UpgradeCap is with the deploy key; multisig transfer and
burn are the pre-mainnet `CUSTODY.md` process (`OPERATOR_TASKS.md` "Mainnet release custody").

### F7 — Seal gives confidentiality, not authenticity: pointers, gates and manifests

**Severity:** Low   **Disposition:** RESOLVED (0.0.32 `603e0ed`, 0.0.33 `972cea7`; sealed-storage-client 0.0.16–0.0.19)
**Where:** `src/sealed-content.ts`, `src/seal.ts` (`accessGateOriginalId`), `src/manifest-guard.ts`,
`src/walrus.ts`
**Issue:** anyone can seal content to a gate and publish a pointer for it, and a pass holder decrypts it
successfully; the Unlock tab listed every publisher's pointers. A gate of another `access_gate` package
could be sealed to and never unlocked, and a transferable pass acts as membership for whoever holds it
once frozen or shared.
**Impact:** misleading content under a trusted gate's name; content sealed to a dead or effectively public
gate.
**Remediation / evidence:** `discoverSealedContent` lists only `gateOperators(...)` pointers by default
(an unresolvable operator set fails closed) and `includeOthers` is an unticked option that labels each
item "Published by …: decrypting proves it was sealed to this gate, not who wrote it"; the controller is
built with `accessGateOriginalId`, so `encrypt` refuses a gate of another package and (sealed-storage-client 0.0.18,
no `allowTransferableGates`) a transferable one; manifests are checked against the registry (F1).
Tested: `sealed-content.test.ts` (operators only, fail closed, indexer, no deployment),
`seal-controller.test.ts` (ids and `PolicyConfig` passed), `manifest-guard.test.ts`.

### F8 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.0.34 `de4467a`, 0.0.36 `0d2871b`, 0.0.37 `1c9a03e`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/sealed-storage-ui/base/deployment.yaml`
**Issue:** the image release was gated by a subset of CI, the published image was not scanned before
signing, the lockfile was not in the image (the SBOM saw only the base), no third-party licence texts were
served with the bundled npm code, the runtime user was only inherited from the base, and the base carried
Go 1.26.7 stdlib advisories.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` and the build jobs `need` it (it lacks the unit
tests, F9); the public job runs Trivy on the pushed digest (CRITICAL/HIGH, fixable only, `exit-code: 1`)
before `cosign sign`, then an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with
no `continue-on-error`; the Dockerfile runs `npm run licenses` and copies `package-lock.json` to
`/usr/share/doc/sealed-storage-ui/`; `/THIRD_PARTY_LICENSES` returns HTTP 200 on the live site and CI runs
`check:licenses`; the runtime base is static-server 0.1.7 (Go 1.26.9) at the 2026-10-09 review (0.1.8 in 0.0.38) with an explicit
`USER 65534:65534`; the pod sets `automountServiceAccountToken: false`, `runAsNonRoot` uid 65534,
read-only root, no privilege escalation, all capabilities dropped, `RuntimeDefault` seccomp, probes and
limits, and a default-deny NetworkPolicy with an ingress allowance; the digest is identical in
`config/images.yaml` and the overlay; all images cosign-verified 2026-10-09 (`verify-digests.sh`, 16/16).
Not run: a Trivy *config* scan of the Dockerfile and manifests (the image scan runs at release).

### F9 — Unit tests are not run by CI or by the release gate

**Severity:** Low   **Disposition:** RESOLVED (`node-ci.yml` runs `npm test` since `6d0aa5d`; `npm-publish.yml` `verify` calls `node-ci.yml` in 0.0.38, commit `4531836`)
**Where:** `.github/workflows/node-ci.yml` (no `npm test` step); `docker-publish.yml` `verify` calls it
**Issue:** CI runs the audit gate, type-check, the three linters, the build and the licence check, but not
the 37 unit tests. Until 0.0.36 the image release's own `verify` job ran `npm test`; 0.0.37 (`1c9a03e`)
replaced it with a call to `node-ci.yml` (F8) and so dropped the tests from the image gate; the comment in
`docker-publish.yml` ("type-check, lint, tests, build, licences") is wrong. Only the npm job's `verify`
still runs them. TS lens: every test project that exists runs in CI.
**Impact:** a regression in the config, gating, manifest, storage or discovery logic could merge and be
released as an image without any gate failing.
**Remediation / evidence:** `node-ci.yml` has a `Unit tests` step (`npm test`) since `6d0aa5d` (verified by
reading the workflow 2026-10-18); both release workflows now call it — `docker-publish.yml` `verify` (0.0.37)
and `npm-publish.yml` `verify` (0.0.38, replacing its own subset job) — so the tests gate the image and
the package. The `docker-publish.yml` comment ("type-check, lint, tests, build, licences") is now true.

### F10 — Primary buttons draw white text on the accent colour

**Severity:** Low   **Disposition:** RESOLVED (0.0.38, commit `4531836`; `tests/primary-button-contrast.test.ts`)
**Where:** `src/components/SealedStorageView.vue:788` (`button.primary { background: var(--accent, #c0503f); color: #fff }`)
**Issue:** in the dark theme `--accent` is a light stop (`#e07850`, or the season's 300/400 stop) and the
design-tokens role for text on it is `--accent-contrast` (`#201b19`). Hard-coded `#fff` gives 3.01:1 with
the default accent and 2.4–2.5:1 with the spring, summer, autumn and winter accents, against the 4.5:1 AA
text minimum (computed from design-tokens 0.1.9; light-theme combinations pass, 5.1–6.8:1). Every primary
action (Next, Encrypt & store, Decrypt, Publish, Find, Unlock) uses it, and the standalone app defaults to
the dark theme.
**Impact:** the main buttons are hard to read for low-vision users in the dark theme. The label is also
the button's accessible name, so nothing is hidden. Not browser-checked per theme and season: the
`@meddleware/ui` gallery axe gate covers the shared components only.
**Remediation / evidence:** `button.primary` now uses `color: var(--accent-contrast, #fff)` (design-tokens
0.1.10 defines the role for both themes and every season; its `check:contrast` measures that pairing).
`tests/primary-button-contrast.test.ts` pins the rule, forbids a hard-coded white label and checks the role
exists in the installed tokens. No browser/axe suite exists in this repository, so a per-theme, per-season
render check stays with the tokens package. `button.link` and `.muted` use `--accent` and `--muted` as text
and pass in both themes (4.7–8.4:1).

### F11 — In-flight operations finish against the new network or account

**Severity:** Low   **Disposition:** RESOLVED (0.0.38, commit `4531836`; `tests/sealed-storage-view.operations.test.ts`, `tests/reseal-network.test.ts`, `tests/operation-scope.test.ts`)
**Where:** `src/components/SealedStorageView.vue` (`performEncrypt`, `performReseal`, `performDiscover`; the
`watch(network)` and account watchers)
**Issue:** a network switch clears `manifest`, `discovered` and the status, but an operation that is
already awaiting is not cancelled and not bound to the state it started in. `performEncrypt` reads
`network.value` and `account.value?.address` after its awaits: the manifest is labelled with the network
at completion although the ciphertext was sealed by the previous network's controller and stored on its
publisher, and `sendObjectTo` is the account at completion. `performDiscover` and `performReseal` assign
their results the same way. VUE lens *Shared-wallet state*: results that arrive after a switch are
discarded.
**Impact:** a switch during a seal can produce a manifest that names the wrong network (the import check
then rejects it on the right one, F1) and a Blob object sent to another of the user's accounts. No key or
funds are at risk; the content is still decryptable only under its own namespace.
**Remediation / evidence:** every operation (`performEncrypt`, `performDecrypt`, `performReseal`,
`performPublish`, `performDiscover`, `performUnlock`) takes a token from `src/operation-scope.ts`, captures
the `SealConfig` and owner address at the start, and checks `isCurrent()` after every await; a synchronous
watcher on the network and the account address invalidates the scope, releases `busy`, clears the previous
network's manifest/results and tells the user the operation was discarded. A discarded operation shows no
result and no error. The config is passed down (`getSealController(cfg)`, `storeBlob({ config })`,
`readBlob(id, cfg)`, `discoverSealedContent({ config })`) so a late call never reaches the new network's
publisher or servers; `resealCiphertext` refuses to encrypt for another network after the original servers'
prompt; the manifest carries the starting network. Gate-suggestion and gate-operator lookups ignore answers
for a superseded request. Tests: a seal, a store, a discovery, a rejected discovery and an account switch
each dropped mid-flight, a new operation after the switch completing, the re-seal refusal. The standalone
app has no network control (the network is fixed by `VITE_NETWORK`); a host's own network control is the
host's, and the scope covers it. The Walrus HTTP helper takes no abort signal, so a discarded request is
dropped on completion rather than cancelled.

### F12 — The ciphertext's storage lifetime is never shown

**Severity:** Low   **Disposition:** RESOLVED (0.0.38, commit `4531836`; `tests/sealed-storage-view.operations.test.ts`, `tests/walrus.test.ts`, `tests/config.test.ts`)
**Where:** `src/walrus.ts` (`WALRUS_EPOCHS`, default 5), `SealedStorageView.vue` (Confirm step, manifest)
**Issue:** `storeBlob` stores the ciphertext for `VITE_WALRUS_EPOCHS` epochs (5 by default) and returns
only the blob id; the publisher's `endEpoch` is discarded. Neither the Confirm step, the manifest nor the
trust panel says how long the content will exist, and nothing points to the way to extend it (the Blob
object belongs to the user, so walrus-storage-ui's My Blobs can). The value is not validated (`Number(...)`);
a bad value makes the publisher refuse, so it fails closed. WALRUS lens *Epochs & lifetime*: expiry is
tracked and an extension flow exists.
**Impact:** sealed content silently becomes unrecoverable at expiry although the key servers still work and
the manifest still validates. Availability only; the testnet default is short.
**Remediation / evidence:** `storeBlob` returns `{ blobId, endEpoch, blobObjectId }` from walrus-storage-client
0.0.28's `PublishResult` (`resource.endEpoch`, the created `Blob` object id). The Confirm step says the
content is stored for N epochs and what happens after; the result shows "through epoch E", the `Blob`
object id and the extension path (the Walrus asset manager, My blobs, since the object belongs to the
user); the trust panel states the lifetime. The manifest is unchanged (its schema is sealed-storage-client's); the
lifetime lives on the result and in the note. `VITE_WALRUS_EPOCHS` is parsed by `parseWalrusEpochs`
(integer in 1..53; an empty build arg is the default; anything else disables sealing with the reason).
Tests: end epoch and object id returned, the epochs and end epoch shown, the "not reported" wording, the
parser's accepted and rejected values.

### F13 — The Confirm step omits what decides who can decrypt

**Severity:** Low   **Disposition:** RESOLVED (0.0.38, commit `4531836`; `tests/sealed-storage-view.operations.test.ts`, `tests/confirm.test.ts`)
**Where:** `src/components/SealedStorageView.vue` (Encrypt step 2, `onMounted` deep link)
**Issue:** the Confirm step lists the policy label, the file and the label, not the policy parameters
(the gate id, or the unlock time). A link `?gate=<id>` preselects the nft-gate policy and the gate in step
1; the id is visible there, in a text field, but not on the step where the user presses **Encrypt & store**.
VUE lens *Signing UX* / SEAL *Metadata leakage*: show what is being sealed to.
**Impact:** a user following a crafted link could seal a file to a gate they do not control, whose
operator's pass holders can then decrypt it. Needs the user to overlook the field; sealed-storage-client refuses
gates of another package and transferable ones (F7), so the gate must be a soulbound gate of the real
package.
**Remediation / evidence:** the Confirm step lists every encrypt parameter (`confirmRows`: the gate id, or
the unlock time as local time plus its UTC instant) and, for a gate, the operator address read with
sealed-storage-client's `gateOperators` (an unreadable or foreign gate shows a warning with the reason). A gate
that came from `?gate=` and was not changed shows a notice and a checkbox; **Encrypt & store** stays disabled
until it is ticked, and `performEncrypt` refuses without it. Choosing another gate removes the requirement.
Tests: gate id and operator shown, the unreadable-gate warning, the link confirmation (button disabled,
operation refused, enabled after ticking), no prompt for a chosen gate or without a link.

### F14 — TypeScript hygiene: unguarded caller-keyed lookups and an unjustified cast

**Severity:** Info   **Disposition:** RESOLVED (0.0.38, commit `4531836`; `tests/config.test.ts`)
**Where:** `src/config.ts` (`SEAL_POLICIES_DEPLOYMENTS[net]`, `ACCESS_GATE_DEPLOYMENTS[net]`,
`SERVER_DEFAULTS[net]`, `WALRUS_DEFAULTS[net]`), `src/sealed-content.ts` (`client as never`)
**Issue:** TS lens *Caller-keyed lookups*: these index records with a string through a cast, so a key such
as `constructor` resolves to a prototype member (sealed-storage-client's own `sealPoliciesDeployment` guards this with
`Object.hasOwn` since 0.0.16, but the app does not call it). `net` comes only from the closed wallet-adapter
selector, and a prototype key would yield no servers ("not configured"), so it fails closed and is not
reachable. The `as never` cast that passes the wallet-adapter client to `gateOperators` carries no
justification comment (TS lens *Assertions*).
**Impact:** none today; a future caller passing a user-supplied name would meet the pitfall.
**Remediation / evidence:** `config.ts` reads the four tables through `own()` (`Object.hasOwn`), so
`constructor`, `__proto__` and similar names resolve to nothing; the `as never` cast in `sealed-content.ts`
is removed (the wallet-adapter client satisfies sealed-storage-client 0.0.20's `SuiObjectClient` structurally;
`vue-tsc` is clean). Test: prototype names yield no deployment, servers, publisher or aggregator.

### F15 — Repository and workflow hygiene

**Severity:** Info   **Disposition:** RESOLVED (0.0.38, commit `4531836`; (c) ADJUDICATED: the dependency is kept)
**Where:** `.gitignore`, `package.json`, `.github/workflows/docker-publish.yml`
**Issue:** (a) `.gitignore` has no `.env` pattern, although `.env.example` says to copy it to `.env.local`
and never commit it (`.dockerignore` excludes `.env*.local`, so the image is safe); (b) the build passes
`VITE_SEAL_SERVER_OBJECT_IDS_TESTNET` and `VITE_SEAL_AGGREGATOR_URLS_TESTNET` from repository *secrets*,
although both are public values baked into the bundle: a keyed aggregator URL put there would ship in the
bundle (ADR-0002 forbids it; `config.ts` never adds a key, but the URL itself is not checked); (c)
`@mysten/wallet-standard` is a dependency that nothing in `src/` or `tests/` imports.
**Impact:** none on behaviour; (b) hides public values from build logs and invites a mistake.
**Remediation / evidence:** (a) `.gitignore` now ignores `.env` and `.env.*` except `.env.example`
(`git check-ignore` confirms `.env.local` is ignored and `.env.example` is not). (b) `docker-publish.yml`
passes `VITE_SEAL_SERVER_OBJECT_IDS_TESTNET` and `VITE_SEAL_AGGREGATOR_URLS_TESTNET` as
`vars.X || secrets.X` in all four build jobs: a repository variable wins, and the existing secret is the
fallback, so the build never silently drops to the testnet defaults. The two values are public (key-server
object ids and aggregator URLs), so variables are the right home; moving them is an optional maintainer
step (`OPERATOR_TASKS.md` "Move two sealed-storage-ui build values from secrets to variables"). (c) ADJUDICATED, kept:
`@meddleware/wallet-adapter` lists `@mysten/wallet-standard >=0.21.0 <0.22` as a peer dependency, and this
app is the host that must provide the single copy (access-gate-ui keeps it for the same reason); nothing in
`src/` imports it directly.

### F16 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-09
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self' 'nonce-…'` with no inline script and no XSS sink is the control on that.
**Remediation / evidence:** accepted: the RPC node, key servers, aggregators, publishers and the indexer
are operator- or chain-configured per network, so the hosts cannot be enumerated in a white-label build.
No `'wasm-unsafe-eval'` is needed (no wasm). Revisit when the hosts are fixed for mainnet.

### F17 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** RESOLVED (0.0.38, commit `4531836`)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F8) does run the full workflow on the same
tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: `src`, `index.html`, `vite.config.ts`,
`tsconfig.json`, README, CHANGELOG, LICENSE; no tests, fixtures or `.env*`).
**Remediation / evidence:** `npm-publish.yml` `verify` now calls `./.github/workflows/node-ci.yml` (as
`docker-publish.yml` and access-gate-ui do), so a tag publishes the package only if the full CI passes;
the publish job is otherwise unchanged (OIDC with provenance, tag == version checked, idempotent, opt-in
through `NPM_PUBLISH`).

### F18 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** RESOLVED (2026-10-18, workspace `verify-digests.sh` default; was ACCEPTED-RISK)
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepted any workflow identity of `github.com/meddleware-org/sealed-storage-ui`.
**Impact:** a workflow added by someone with write access could have signed an image the check would accept.
**Remediation / evidence:** fixed in the workspace script on 2026-10-18: the default identity in
`bootstrap/images/verify-digests.sh` is now `^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`
(`COSIGN_IDENTITY_REGEXP` still overrides it), so a signature from any other workflow or ref of the repository is
rejected. All 16 deployed and contingency images verified valid against it on 2026-10-18
(`STRICT=0 bash bootstrap/images/verify-digests.sh`, 0.0.38 included); 2026-10-09 (0.0.37) was
checked with the earlier repository-wide identity. This repository publishes no verify command, so the script
default was the only remaining problem.

### F19 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` `mirror-private` job (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the `mirror-private` job (a digest-preserving copy of the published, signed image, not a rebuild) fails without registry credentials; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (the cluster pins digests and
verifies signatures, so it would not run).
**Remediation / evidence:** the mirror is listed as best-effort; the public job has no `continue-on-error`.
The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | Mainnet uses ≥ 2 independent keyless servers at t = 2, no API key; package ids only from `deployments` | `config.ts` defaults | `config.test.ts`; live bundle read 2026-10-09 (only `0x0c8f7349…`, `0xee0403ba…`, `0xd7ddaa94…`) | HOLDS |
| I2 | Operator custody is announced | `VITE_SEAL_KEY_CUSTODY_*` notice | `config.test.ts`, `sealed-storage-view.gating.test.ts` | HOLDS |
| I3 | Trust assumptions shown before sealing | `SealedStorageView.vue` | template | HOLDS (F6) |
| I4 | Sealing refuses on a network without a policy package | `config.ts` (`problem`) | `config.test.ts`, `sealed-storage-view.gating.test.ts` | HOLDS |
| I5 | Manifests validated for schema, network and policy | `checkManifestForNetwork` | `manifest-guard.test.ts` | HOLDS (F1) |
| I6 | Sessions cleared on disconnect / switch | `seal.ts` `clearSealSessions`, account watcher | — (code-only here; tested in sealed-storage-client) | HOLDS (code-only) |
| I7 | No on-chain logic in the app | sealed-storage-client, walrus-storage-client, access-gate-client | `suiBoundary` lint (eslint-config 0.0.2, clean 2026-10-09) | HOLDS |
| I8 | Discovery lists the gate operator's pointers unless the user opts in | `sealed-content.ts` | `sealed-content.test.ts` | HOLDS (F7) |
| I9 | Sealing refuses a gate that cannot be unlocked or is effectively public | `accessGateOriginalId` in the controller config; sealed-storage-client 0.0.18 | `seal-controller.test.ts` (config passed); refusal tested in sealed-storage-client | HOLDS (F7) |
| I10 | The unit tests run on every change and every release | `node-ci.yml` `npm test`, called by both release workflows | the workflows | HOLDS (F9) |
| I11 | An in-flight operation never finishes against a different network or account | `operation-scope.ts` tokens + synchronous watcher in `SealedStorageView.vue`; config passed down | `sealed-storage-view.operations.test.ts`, `reseal-network.test.ts`, `operation-scope.test.ts` | HOLDS (F11) |
| I12 | What the content is sealed to, and for how long it is stored, is shown before storing | Confirm step (parameters, gate operator, epochs); link confirmation; result shows the end epoch | `sealed-storage-view.operations.test.ts`, `confirm.test.ts` | HOLDS (F12, F13) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SEAL | Encryption binding, namespacing, approve PTB, SessionKey | through sealed-storage-client (its audit): original id as namespace, `publishedAt` for approve targets, transaction-kind-only PTBs, SessionKey TTL 10 min cached per address and package, in memory only, cleared on disconnect and account switch; one wallet prompt per mint |
| SEAL | Threshold configuration | HOLDS (I1) — t ≤ servers validated by `thresholdError`; a committee counts as one server; mainnet three independent operators at t = 2; `verifyKeyServers` is off wherever an aggregator is used (testnet), `checkShareConsistency` on |
| SEAL | Ciphertext integrity | HOLDS — AES-256-GCM; tampering fails decryption (F2) |
| SEAL | Metadata leakage, policy semantics, upgradeability | HOLDS (I3) — labels, gate and identity inputs are public; non-revocability and the UpgradeCap are stated (F6); the manifest holds no secret |
| SEAL | Re-sealing | HOLDS — `resealCiphertext` decrypts under the old set and re-encrypts under the configured one; tested (`reseal.test.ts`) |
| SEAL | Discovery registries | HOLDS — paginated and filtered in sealed-storage-client (`MAX_DISCOVERED` 200 here), operator-only by default (F7), labels rendered as text |
| WALRUS | Storage path | publisher with `send_object_to` the user; reads strict, capped and bounded; the Blob is permanent |
| WALRUS | Epochs & lifetime | HOLDS — 5 epochs by default (validated 1..53), shown on Confirm and the result with the end epoch, extension path stated; no expiry tracking beyond the shown end epoch (F12) |
| WALRUS | Blob ownership, Confidentiality | HOLDS — the user owns the Blob object; the publisher sees only ciphertext |
| WALRUS | Payment bounds, Relay authentication, Relay selection, Flow resumability | N/A — no relay, no tip and no gated upload; the publisher pays |
| WALRUS | Size limits | client cap 10 MiB (`VITE_WALRUS_MAX_UPLOAD_BYTES`; public publishers cap at 10 MiB), UX only |
| VUE | Untrusted rendering | HOLDS — labels, publishers, blob ids and manifest fields as text; sanitised download names; the plaintext is downloaded, never rendered |
| VUE | Colour & links | HOLDS — primary buttons use `--accent-contrast` (F10); no `--warning` text; one running-text link (the Walrus asset manager, accent colour) |
| VUE | Build-time configuration | HOLDS — no secrets in `VITE_*`; custody and server sets public; every variable in `.env.example`; ids from `deployments` (VUE-M2); the two public values come from a repository variable, falling back to the existing secret (F15) |
| VUE | Test hooks | N/A — none; no test mode exists |
| VUE | Signing UX | HOLDS for the wallet prompts (the SessionKey message and the pointer transaction are shown by the wallet; buttons are disabled while busy); the Confirm step lists what is sealed to and the gate operator, and a link-preselected gate needs a confirmation (F13) |
| VUE | Shared-wallet state | HOLDS (I6) for sessions and (F11) for in-flight operations; the chain-id check and account-change events are wallet-adapter 0.0.17's (own audit) |
| VUE | Browser storage | N/A — none |
| VUE | Lazy boundaries | HOLDS — `SealController` and `@mysten/seal` load on first use |
| VUE | Dual app / library | HOLDS — `SealedStorageView` has scoped styles and no shell chrome |
| VUE | Estimates | N/A — the app computes no cost or fee |
| SUI_CLIENT | ABI mirroring, Funds in the PTB, Value encoding, Read parsing, Events, Signature verification, Dry-run, Client-side publish | N/A / through the libraries — the app calls `buildPublishSealedContentTransaction` (sealed-storage-client) and builds no `moveCall`; sealed-storage-client owns ABI tests and the weekly live suite |
| SUI_CLIENT | Package-ID split, Network / chain binding | HOLDS — `originalId` for identities and events, `publishedAt` for call targets; the selector selects ids, client and wallet chain together; empty ids disable sealing |
| SUI_CLIENT | Execution result | HOLDS — wallet-adapter's executor throws on a failed transaction; the pointer publish shows the digest only after success |
| SUI_CLIENT | Chain-access layering | HOLDS — `suiBoundary` forbids PTB and read logic outside `src/wallet.ts`; type-only SDK imports |
| TS | Compiler strictness | HOLDS — `strict: true`, `vue-tsc --noEmit` in CI |
| TS | Assertions, validation, money, promises, network I/O, encoding, dynamic code | HOLDS — no `eval`, no `fetch` in `src/` (the HTTP helpers are walrus-storage-client's, with timeouts, https and redirect refusal); no money math; dynamic imports have literal specifiers; the catch blocks surface the message |
| TS | Caller-keyed lookups | HOLDS — `Object.hasOwn` through `own()` (F14) |
| TS | Packaging, supply chain | HOLDS — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate; and the unit tests run in CI and in both release workflows (F9) |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F8) — digest-pinned `node:24-slim` and static-server 0.1.8; `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Verification command | HOLDS — this repository publishes no command; the cluster check pins `docker-publish.yml@refs/tags/v` (F18, RESOLVED 2026-10-18) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag label (`0.0.4`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/sealed-storage-client` | `^0.0.20` (installed 0.0.20) | seal / decrypt | `npm audit` gate clean 2026-10-18 | latest |
| `@meddleware/walrus-storage-client` | `^0.0.28` | store / read | clean | latest |
| `@meddleware/access-gate-client` | `^0.0.9` | gate suggestions, linked-gate check | clean | latest |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | wallet | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.10` / `^0.0.2` | UI | own audits | latest published |
| `@mysten/seal` | via sealed-storage-client peer (`^1.4.18`; installed 1.4.19) | crypto | clean | one copy |
| `@mysten/sui` | `^2.33.2` (installed 2.35.0) | reads, transactions (type imports only here) | gate clean | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| `@mysten/wallet-standard` | `^0.21.0` | none | clean | not imported here; kept because wallet-adapter's peer range needs the host to provide it (F15) |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.12) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Key servers | `config.ts` | decrypt | — | ADR-0002; fail closed |
| Walrus publisher / aggregator | per network | store / read | — | fail closed (no bytes) |
| `static-server` / `node:24-slim` | 0.1.8 / digest-pinned | runtime / build | Trivy at release (F8); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | `.github/audit-allowlist.json` |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`@mysten/seal` not declared (the sealed-storage-client peer, `^1.4.18`); `@mysten/walrus`, `@mysten/walrus-wasm`,
`@mysten/bcs`: not used (walrus-storage-client's peer `@mysten/walrus ~1.2.32` is installed under it but unused here);
`vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard` dep
`^0.21.0`. First-party ranges are `^0.0.x` (exact) or `^0.1.x`; no `~0.0.x`; the peer range for
wallet-adapter is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` (dev, optional, macOS
only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`.

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance; opt-in `NPM_PUBLISH` | library | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F19 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

No API keys anywhere (D24). CI & release integrity: actions pinned by SHA (workflows read 2026-10-09);
explicit `permissions:` per workflow and job (`id-token`/`attestations` only on the signing job, `id-token`
only on the npm publish job); OIDC publish with a tag == version check; npm client pinned
(`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM attestation +
provenance, no `continue-on-error` on the public path (F8); both release workflows call the full CI
workflow including the tests (F9, F17); `npm ci` everywhere; audit gate in CI (called by both releases); Dependabot weekly and
grouped for npm, Docker and Actions; no test-only build mode exists, so there is nothing to scan for; no
job spends real funds.

### B.SEAL-1 Committee readiness

Testnet servers exercised by sealed-storage-client's live suite (PASS 2026-10-09 against the new packages); mainnet
server terms are an operator-register task (`OPERATOR_TASKS.md` "Mainnet Seal key servers — confirm terms
before launch"); mainnet sealing waits for the `seal_policies` publish. The server set and threshold are
build variables (a repository-variable change plus a release); content stays bound to the servers it was
sealed to and moves with the re-seal action. The self-hosted fallback (`seal-key-server`, not deployed) is
custodial and triggers the operator notice.

### B.SEAL-2 Discovery registries

Pointers are read through sealed-storage-client `listSealedContent` (cursor-paged, at most 200 listed, a row that
does not decode is skipped and counted), filtered to the gate operator's by default, rendered as text
(label, publisher, blob id), and the indexer is read over https only as display data.

### B.VUE-1 Hosting headers

Live headers on `sui-sealed-storage.meddleware.co.uk`, read 2026-10-09: `Content-Security-Policy`
(`default-src 'self'`, `script-src 'self' 'nonce-…'`, `style-src 'self' 'unsafe-inline'`,
`connect-src 'self' https:`, `img-src 'self' data: blob: https:`, `worker-src 'self' blob:`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
`upgrade-insecure-requests`), `Strict-Transport-Security` (1 year, includeSubDomains),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`. The CSP is static-server's
(`CONTENT_SECURITY_POLICY` from the `CSP` build argument); there is no static host and no `_headers`
file. `'unsafe-inline'` is for styles only; the build emits no inline script. The blanket `https:` is F16.
Framing is `'self'` only; the dashboard embeds the view as a component, not a frame.

### B.VUE-2 Build inputs and artifacts / IMG

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.8@sha256:e32cf42b…` runtime, both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; no secret in any `ARG`/`ENV` (the build
args are public configuration and the CSP); production sourcemaps are not emitted (Vite default); the
deployment is read-only root, `runAsNonRoot` uid 65534, no privilege escalation, all capabilities
dropped, `RuntimeDefault` seccomp, `automountServiceAccountToken: false`, readiness and liveness probes on
`/`, requests 5m/16Mi and limits 100m/48Mi; digest `sha256:a000ba2e…d174` (0.0.38; 0.0.37 was `sha256:7e919894…`) in both `config/images.yaml` and the
overlay; cosign signature verified 2026-10-09 (0.0.37) and 2026-10-18 (0.0.38; the latter against the workflow-anchored identity) (F18). Not run: a Trivy *config* scan of the Dockerfile and
manifests (F8).

### B.SC-1 ID-constant trace

| Location | Network | Value | original-id or published-at | Matches the latest on-chain version |
| --- | --- | --- | --- | --- |
| sealed-storage-client 0.0.19 `deployments` (resolved from npm at build; the only source) | testnet | `seal_policies` `0x0c8f7349…773d`, `PolicyConfig` `0xee0403ba…7d1a` | both (fresh publication 2026-10-09) | Y — sealed-storage-sui commit `428e61d`; live bundle read 2026-10-09 |
| access-gate-client 0.0.8 `deployments` | testnet | `access_gate` `0xd7ddaa94…88c9` | original id used (gate type filter) | Y — access-gate-sui commit `7906954`; live bundle read 2026-10-09 |
| `VITE_*`, `src/` literals, `.env.example` | any | none (only key-server object ids, which are not package ids) | — | Y — grep finds no package id in `src/`; the superseded `0x61c4aa…`, `0xa55789…`, `0x8fcf9c39…`, `0x42cc18…` are absent from the live bundle |
| mainnet, localnet | — | none recorded | — | n/a — sealing disabled with the reason |

### B.SC-2 Coupling table

| Move function | Builder | Test asserting target + arguments |
| --- | --- | --- |
| `seal_approve*` (nft-gate, time-lock) | sealed-storage-client providers and controller | sealed-storage-client tests and weekly live suite; this app's `seal-controller.test.ts` asserts the deployment ids and `PolicyConfig` it passes |
| `sealed_content::publish` | `buildPublishSealedContentTransaction` (sealed-storage-client) | sealed-storage-client tests; called from `performPublish` with the deployment's `publishedAt` and `PolicyConfig` |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (72/72, 2026-10-18)

Vitest 5.0.3, 12 files: `config.test.ts` (servers, thresholds, custody, no API key), `sealed-storage-view.gating.test.ts`
(gating and custody notices), `manifest-guard.test.ts` (schema, network, registry), `sealed-content.test.ts`
(operators-only discovery, indexer), `walrus.test.ts` (permanent store, owner, already-certified, no
publisher, cap, strict read), `seal-controller.test.ts` (ids and `PolicyConfig`), `reseal.test.ts` (re-seal
flow with a mocked controller), plus (0.0.38) `sealed-storage-view.operations.test.ts` (mid-flight network and
account switches, the lifetime, the Confirm step, the `?gate=` confirmation), `reseal-network.test.ts`,
`operation-scope.test.ts`, `confirm.test.ts` and `primary-button-contrast.test.ts`. Session clearing and the
publish pointer still have no component tests. No Playwright suite exists. Gating variables: none; the
suite is hermetic. `node-ci.yml` runs it, and both release workflows call that workflow (F9).

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Config, gating, manifest, discovery, re-seal wiring | yes | — | `npm test` |
| Real seal / decrypt | no | testnet servers | sealed-storage-client `test:integration` and weekly live suite (PASS 2026-10-09 against the new packages); no browser run of this UI |
| nft-gate decrypt with a pass | no | testnet + pass | manual |
| Browser contrast (axe) of this app's own components | no | the rule is pinned by a CSS test; the per-theme, per-season measurement is design-tokens' `check:contrast`; `@meddleware/ui` gallery covers shared components | F10 |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; type-check, three linters, unit tests green (2026-10-18); no secrets
- [x] no `v-html`; no dynamic `:href`; no secret `VITE_*`; every variable in `.env.example`

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified live 2026-10-09 and again on 0.0.38 on 2026-10-18 (`curl -I`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); `SECURITY.md` present
- [x] trust assumptions disclosed (F6)
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, deployed by digest, signed with SBOM and provenance, scanned before signing (F8)
- [x] consumed IDs are the latest on-chain version — live bundle carries `0x0c8f7349…`, `0xee0403ba…` and `0xd7ddaa94…` only (B.SC-1)
- [x] threshold ≤ configured servers; SessionKey cleared on account switch and disconnect (I1, I6)
- [x] live decrypt round trip — sealed-storage-client's live testnet suite PASS 2026-10-09 (the UI itself is not browser-run, C.2)
- [x] every test project runs in CI — `node-ci.yml` `npm test`, called by `docker-publish.yml` and `npm-publish.yml` `verify` (F9, 0.0.38)
- [x] state invalidated on switch in every view, including in-flight operations — operation scope, config passed down, `sealed-storage-view.operations.test.ts`, `reseal-network.test.ts` (F11, 0.0.38)
- [x] signing UX shows what is sealed to — Confirm step parameters + gate operator, `?gate=` confirmation, `sealed-storage-view.operations.test.ts` (F13, 0.0.38)
- [x] colour: text meets AA in both themes — `--accent-contrast` on the primary button, `primary-button-contrast.test.ts` (F10, 0.0.38)

### pre-mainnet

- [ ] mainnet `seal_policies` published and recorded; live round trip on the mainnet servers — mainnet-blocked
- [ ] operators' Open-mode terms confirmed — maintainer item (`OPERATOR_TASKS.md` "Mainnet Seal key servers")
- [ ] UpgradeCap multisig transfer and burn date (CUSTODY.md) or the notice kept — mainnet-blocked (`OPERATOR_TASKS.md` "Mainnet release custody")
- [x] storage lifetime shown and an extension path stated — Confirm step, result with the end epoch, trust panel, epochs validated 1..53 (F12, 0.0.38)
- [x] CSP and HSTS on the one hosting path (B.VUE-1)
- [ ] registry credential inventory and rotation (F19) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party clients at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **On-chain-truth boundary** — access is decided on-chain and at the key servers.
- **Wire-format coupling** — identity layouts, manifests and approve PTBs are sealed-storage-client's; the app only
  validates a manifest against the registry (F1).
- **Deployment readiness** — Section D.
- **Chain-access layering** — all chain and Seal logic in the clients; the `suiBoundary` lint enforces it.
  IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **SEAL-M1–SEAL-M3, SEAL-M5** — hold through sealed-storage-client; **SEAL-M4** — holds (I1); **SEAL-M6–M8**
  — hold (I3); the Confirm step repeats the identity inputs and the gate operator (F13).
- **SC-M1–SC-M10** — hold through the libraries (SC-M6 to SC-M9 are N/A: this app verifies no
  signature, binds no event, signs no dry-run PTB and extracts no created object). SC-M5: network, ids,
  client and wallet chain follow one selector.
- **VUE-M1–VUE-M9** — hold (VUE-M3 N/A; VUE-M7 N/A); VUE-M4 holds for the wallet prompts and the Confirm
  step (F13); VUE-M6 holds for sessions and in-flight operations (F11); the *Colour & links* category holds
  (F10).
- **WAL-M1–WAL-M9** — hold for the publisher path (WAL-M1 to M3, M8 and M9 are N/A: no relay, tip or gated
  upload); WAL-M4 holds: the lifetime and end epoch are shown (F12).
- **IMG-M1–IMG-M8** — hold; IMG-M8 holds: no command is published here and the cluster check pins the publish workflow and tag refs (F18, RESOLVED 2026-10-18).
- **TS-M1–TS-M9** — hold; TS-M9: `@mysten/sui` is a single copy, `@mysten/seal` is sealed-storage-client's peer,
  wallet-adapter is a peer; every test project runs in CI (F9); F14 is fixed.

## Implementation suggestions (SHOULD / MAY)

- SHOULD add component tests for session clearing and the publish pointer (the encrypt flow, the deep-link
  preselection and mid-flight switches are covered since 0.0.38).
- MAY show the policy package's custody state (UpgradeCap live or burned) read from its
  `deployments.json` once the burn is recorded.
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

None (ADR-0002 OQs decided: D24).

## Risks

- **Key-server collusion or outage** — t servers can decrypt; fewer than t online blocks decryption.
- **Policy upgrades** — until the cap is burned.
- **Walrus availability** — stored ciphertext depends on Walrus storage epochs; the user is told the end
  epoch and how to extend (F12), but nothing reminds them before it passes.
- **Superseded namespaces** — content sealed under earlier testnet `seal_policies` packages no longer
  decrypts (decision: legacy namespaces unsupported).

## Re-verification log

- 2026-09-18 — first-pass baseline (F1–F5).
- 2026-09-28 — F1 RESOLVED; F2, F3 dispositions recorded.
- 2026-10-02 — ADR-0002 / D24: mainnet servers; API-key path removed; custody notice; re-seal.
- 2026-10-02 — re-verified under AUDIT_TEMPLATE.md + VUE + TS + SUI_CLIENT + SEAL + WALRUS + IMG
  (Phase 7): front matter, lens sections and four-part closing added. F6 RESOLVED in 0.0.30 with
  sealed-storage-client 0.0.14 and walrus-storage-client 0.0.24. Counts: 31/31.
- 2026-10-03 — consumer wave: 0.0.31 (sealed-storage-client 0.0.15, walrus-storage-client 0.0.25, access-gate-client 0.0.4, ui 0.1.30); deployed; live sweep clean.
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified at 0.0.37 (`1c9a03e`) against the code, the workflows, the manifests and the live site/bundle. Template dates now VUE/TS/IMG 2026-10-08; front matter gains the Seal, Walrus, VUE, TS and IMG fields. F1–F6 re-checked (F1 evidence extended to the registry check and the right test file; F2 residual write-side note; F6 still true under the republished package). New: F7 RESOLVED (operator-only discovery, linked and soulbound gates, registry-checked manifests; sealed-storage-client 0.0.16–0.0.19), F8 RESOLVED (image release gate, Trivy, notices, lockfile, `USER 65534`, static-server 0.1.7), F9 DEFERRED (the known `node-ci.yml` gap: no `npm test`, present here), F10–F15 DEFERRED (primary button contrast, in-flight operations, hidden storage lifetime, Confirm step omits the sealed-to parameters, TypeScript hygiene, repository hygiene), F16–F18 ACCEPTED-RISK, F19 DEFERRED (maintainer). The design-tokens F10 check (`--warning` as text) is clean here. The republished `seal_policies` `0x0c8f7349…` and `access_gate` `0xd7ddaa94…` are the only ids in the live bundle. Counts: 37/37 (was 31/31), audit gate 1 allowlisted / 0 open. Section D gates ticked with evidence; unticked: four next-patch items (F9–F13), F12 as a pre-mainnet gate, and the mainnet/maintainer items.
- 2026-10-18 — fix wave at 0.0.38 (commit `4531836`). Dependencies: sealed-storage-client ^0.0.20, walrus-storage-client ^0.0.28, access-gate-client ^0.0.9, design-tokens ^0.1.10 (ui, wallet-adapter and eslint-config already at their latest); runtime base static-server 0.1.8 (`sha256:e32cf42b…4000`, read from quay.io). F9 RESOLVED (CI already ran `npm test`; `npm-publish.yml` `verify` now calls `node-ci.yml`), F10 RESOLVED (`--accent-contrast`), F11 RESOLVED (operation scope, config passed down, re-seal refusal), F12 RESOLVED (end epoch, extension path, epochs validated), F13 RESOLVED (Confirm parameters and operator, `?gate=` confirmation), F14 RESOLVED (`Object.hasOwn`, cast removed), F15 RESOLVED (`.env*` ignored, `vars.` for the two public values; `@mysten/wallet-standard` kept as the wallet-adapter peer), F17 RESOLVED (npm gate = full CI). F16, F18 stay ACCEPTED-RISK (no single fix: the hosts cannot be enumerated; the identity anchor is a workspace-script override); F19 stays with the maintainer. Counts: 72/72 in 12 files (was 37/37 in 7), audit gate 1 allowlisted / 0 open. Section D: the five code gates ticked (F9, F10, F11, F12, F13); unticked: the mainnet and maintainer items only. Maintainer action: create the repository variables `VITE_SEAL_SERVER_OBJECT_IDS_TESTNET` and `VITE_SEAL_AGGREGATOR_URLS_TESTNET` (formerly secrets) if they carry non-default values.
- 2026-10-18 — released and deployed (`v0.0.38` = `907df8d`, `0.0.38@sha256:a000ba2e460ab839d1dbefecec43057518a1a1d0670fdc04a49d9c431419d174`), verified live. Cosign keyless signature verified against the workflow-anchored identity (`verify-digests.sh` 16/16); published to npm and as an image; rollout (`apply.sh sealed-storage-ui`) succeeded; the page loads in headless Chromium with no console errors or CSP violations, headers present (re-read with `curl -I`), and the live bundle carries only the current ids. Mainnet-blocked, maintainer and external-review gates unchanged.
- 2026-10-18 — F18 (cosign identity) RESOLVED: the default identity in `bootstrap/images/verify-digests.sh` is now workflow-anchored (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`); all 16 deployed and contingency images verified valid against it (`STRICT=0 bash bootstrap/images/verify-digests.sh`). This repository publishes no verify command, so nothing else remained.
- 2026-10-19 — dependency-bot status checked (read-only): `.github/dependabot.yml` carries the `ignore` rules and the repository has no open Dependabot pull requests (`gh pr list`, 2026-10-19). Versions, findings and gates were not re-examined in this pass.
  - `Dockerfile` on GitHub `main` now pins the `static-server` base at `0.1.9@sha256:af6cc284…edc72` (merged Dependabot docker PR); this repo was not re-released or redeployed for it, so the deployed image is still built on the 0.1.8 base (the stock default CSP added in 0.1.9 is replaced by this repo's own `CONTENT_SECURITY_POLICY`).
  - Dependabot policy encoded in .github/dependabot.yml (majors declined); open PRs merged 2026-10-19
  - `docker-publish.yml`: the private rebuild jobs are replaced by one `mirror-private` job that copies the published quay.io image (and its cosign artifacts) to the self-hosted registry by digest and fails unless the digest and the signature match (build once, promote by digest; committed locally, not yet released; the `PRIVATE_REGISTRY_*` credentials are still unset).
- 2026-10-22 (audit close-out) — release 0.0.40 (`v0.0.40` = `4888bf7`; `Publish (Docker)` and `Publish (npm)` succeeded). Dependencies: `@meddleware/walrus-storage-client` `^0.0.30` (the gated flow passes the gateway's real challenge expiry; access-gate-gateway-client 0.0.18 rules; walrus-storage-client F26), `@meddleware/walrus-storage-kit` `^0.1.33`, `@meddleware/access-gate-client` `^0.0.10` (a stale indexer head page, `polledAt` older than 60 s, now falls back to the node; sui-indexer F19). Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes; static-server F13). No disposition change. Not re-run in this pass: the unit tests, the build and the audit gate (the tag's own CI and publish runs succeeded).
- 2026-10-24 — repository renamed from `seal-ui` to `sealed-storage-ui` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`): package, image, host and path names updated throughout. No finding, disposition or evidence changed.
- 2026-10-24 — identifier alignment (`docs/architecture/ADR-0004-identifier-alignment.md`): text names `sealed_storage`; no behaviour change.
- 2026-10-24 — machine-zone readiness (workspace ADR-0005, C1z): endpoints read through `@meddleware/ui` `withRuntimeEnv`, loaded from a same-origin `/runtime-config.json` (strict key allowlist, https-only, no credentials/query/fragment; a missing, non-JSON or invalid file keeps the build values) before the app modules load; own `robots.txt` and `llms.txt`. Verified: one build served by static-server 0.1.11 with and without the file calls the configured indexer / falls back, 0 CSP violations, 0 page errors (headless Chromium).
