// What a person is told when Sealed Storage cannot be used on a network. Nothing here names a build variable or a missing setting: a
// person can do nothing about those, so they read what they can do (wait, or use another network); the technical cause goes to the
// console (`config.ts` and `walrus.ts` log it) and to the developer docs.
//
// Which networks to suggest comes from the deployment records (sealed-storage-client's `deployments`), never from prose: a network with a
// recorded `sealed_storage` deployment is one Sealed Storage can run on, and a network without one is not offered.
import { SEAL_POLICIES_DEPLOYMENTS } from '@meddleware/sealed-storage-client/deployments'

/** The networks that have a recorded `sealed_storage` deployment, other than `net`. */
export function otherDeployedNetworks(net: string): string[] {
  return Object.keys(SEAL_POLICIES_DEPLOYMENTS).filter((n) => n !== net)
}

/** " Switch to testnet." (or "testnet or mainnet"), or nothing where no other network has a deployment. */
function switchHint(net: string): string {
  const others = otherDeployedNetworks(net)
  return others.length ? ` Switch to ${others.join(' or ')}.` : ''
}

/** No `sealed_storage` deployment is recorded for the network: not a fault, just not offered there. */
export function notAvailableOn(net: string): string {
  return `Sealed Storage is not available on ${net}.${switchHint(net)}`
}

/** The network has a deployment but this site cannot serve it right now (a setting the person cannot change). */
export function notAvailableNow(net: string): string {
  const others = otherDeployedNetworks(net)
  return `Sealed Storage is not available here right now. Try again later${others.length ? ` or switch to ${others.join(' or ')}` : ''}.`
}
