# @meddleware/sealed-storage-ui

Sealed Storage — a standalone Vue 3 SPA for client-side [Seal](https://seal-docs.wal.app/) encryption
with access-gated, decentralised [Walrus](https://walrus.xyz) storage on Sui.

Encrypt a file under a policy (access-gate NFT ownership, time-lock, …), store the ciphertext on
Walrus, and share a small **manifest**. Anyone with the manifest can decrypt — but only if the
on-chain policy allows (e.g. they hold a valid gate pass, or the unlock time has passed).

## How it works

1. **Encrypt** in the browser via `@meddleware/sealed-storage-client` (threshold Seal). No key material ever
   touches a server.
2. **Store** the opaque ciphertext on Walrus over HTTP; keep the returned blob id in the manifest.
3. **Decrypt** by signing one wallet message (mints a short-lived Seal SessionKey); a threshold
   committee of independent key servers releases key shares only if the on-chain `seal_approve`
   passes.

The policies live in the [`sealed_storage`](https://github.com/meddleware-org/sealed-storage-sui) Move
package; the client seam is [`@meddleware/sealed-storage-client`](https://github.com/meddleware-org/sealed-storage-client).

## Configure (build-time `VITE_*`)

The `sealed_storage` and `access_gate` ids come from the published `deployments` (sealed-storage-client and
access-gate-client) for the active network; they are not configuration.

| Var | Meaning |
| --- | --- |
| `VITE_NETWORK` | Network the standalone build selects: `testnet` (default) or `mainnet`. Embedded, the host's selector rules. |
| `VITE_SEAL_SERVER_OBJECT_IDS_{NET}` | CSV of key-server object ids (the committee) |
| `VITE_SEAL_AGGREGATOR_URLS_{NET}` | CSV of aggregator URLs (index-aligned) |
| `VITE_SEAL_KEY_CUSTODY_{NET}` | `independent` (default) or `operator`. Set `operator` only when the host's own key server is in use (the self-hosted fallback); the view then warns that Meddleware could decrypt |
| `VITE_SEAL_THRESHOLD_{NET}` | `t` over the configured servers; a committee behind an aggregator counts as one (default 2 on testnet and mainnet). An out-of-range value disables sealing on that network: a person reads "not available here right now" and the cause (the variable) is logged with `console.error` |
| `VITE_WALRUS_PUBLISHER_{NET}` | Walrus HTTP publisher. Testnet has a default; **mainnet has none** (Walrus runs no public mainnet publisher), so set an authenticated publisher; until then a network that has a deployment reports itself unavailable |
| `VITE_WALRUS_AGGREGATOR_{NET}` | Walrus HTTP aggregator (Mysten reference endpoints by default) |
| `VITE_WALRUS_MAX_UPLOAD_BYTES` | Largest ciphertext sent to the publisher (default 10 MiB, the public-publisher limit) |
| `VITE_INDEXER_URL` | Optional read-indexer for sealed-content discovery (display data; falls back to the full node) |

## Develop

```sh
# @meddleware/sealed-storage-client must be linked or published:
( cd ../sealed-storage-client && npm link )
npm install && npm link @meddleware/sealed-storage-client
npm run dev
```

## Build

```sh
npm run build           # vue-tsc + vite → dist/
docker build -t sealed-storage-ui .
```

Key servers (workspace ADR-0002): testnet uses Mysten's committee and two Open-mode servers; mainnet
uses three keyless Open-mode servers run by independent operators (Overclock, NodeInfra, H2O Nodes)
at threshold 2. No server needs an API key, and none is ever put in the bundle. A network with no recorded
`sealed_storage` deployment (the `deployments` of sealed-storage-client decide) shows an in-app notice and
sealing is disabled there; the notice offers the networks that have a deployment.

**Re-seal.** Content can only be decrypted by the key servers it was sealed to. The Decrypt tab's
re-seal action decrypts it with those servers and seals it again for the current ones, so content can
move off a provider that withdraws while the others still answer.

## License

BSD Zero Clause License (`0BSD`). See [LICENSE](LICENSE).
