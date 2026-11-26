// End-to-end build only (`vite build --mode e2e` aliases `@meddleware/sealed-storage-client/controller` to this file; no other build
// contains it). Sealing for real needs a live key-server committee, so the flows are checked against a stand-in with the same surface:
// "encrypting" returns the bytes under a fixed identity, "decrypting" asks the wallet for the personal-message signature a real SessionKey
// needs and returns the bytes. The controller's own behaviour is tested in sealed-storage-client.
/** A policy's parameters, as the real controller takes them. */
type Params = Record<string, unknown>
/** What the real controller asks the caller for when decrypting: the address and a way to sign the session-key message. */
interface Opts {
  address: string
  signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>
}

/** The fixed Seal identity every stand-in "encryption" returns. */
export const E2E_SEAL_ID = 'ab'.repeat(48)

/** The stand-in: the same surface as the real controller, no key servers. */
export class SealController {
  /** "Encrypt": return the bytes unchanged under the fixed identity. */
  async encrypt(_policyType: string, _params: Params, data: Uint8Array): Promise<{ id: string; ciphertext: Uint8Array }> {
    return { id: E2E_SEAL_ID, ciphertext: data }
  }

  /** "Decrypt": ask the wallet for the session-key signature a real decrypt needs, then return the bytes unchanged. */
  async decrypt(_policyType: string, _params: Params, _id: string, ciphertext: Uint8Array, opts: Opts): Promise<Uint8Array> {
    await opts.signPersonalMessage(new TextEncoder().encode('e2e session key'))
    return ciphertext
  }

  /** Nothing to forget: the stand-in keeps no session. */
  clearSession(): void {}
}

/** Every ciphertext here counts as already sealed to the current servers, so re-sealing has nothing to do. */
export function describeCiphertext(): { threshold: number; servers: never[] } {
  return { threshold: 2, servers: [] }
}

/** Always true: everything counts as sealed to the current servers. */
export function sealedUnderServers(): boolean {
  return true
}
