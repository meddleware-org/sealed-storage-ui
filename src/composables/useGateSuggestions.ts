// The gates the connected wallet administers, offered as choices wherever a gate id is asked for (Encrypt's details step, Unlock's gate
// step). Asked again when the account, the network or the provider changes; an answer for an earlier one is ignored.
// Vue, the stale-result guard, the client's types and this app's network and wallet.
import { ref, shallowRef, watch } from 'vue'
import { createGeneration } from '@meddleware/web-utils'
import type { FieldSuggestion, SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { network } from '../config.js'
import { getSuiClient, useWallet } from '../wallet.js'

/** `provider()` is the policy provider to ask, or `null` when suggestions are not wanted right now (another policy, another tab). */
export function useGateSuggestions(provider: () => SealPolicyProvider | null) {
  // The connected account decides whose gates are asked for.
  const { account } = useWallet()
  // The suggestions found, whether a read is running, and whether the person chose to type the id.
  const suggestions = shallowRef<FieldSuggestion[]>([])
  const loading = ref(false)
  /** The person chose to type the id instead of picking it. */
  const manual = ref(false)
  // A slower, older read never overwrites a newer one.
  const generation = createGeneration()

  // Ask again whenever the account, the network or the provider changes.
  watch(
    [() => account.value?.address, network, provider],
    async ([address, , current]) => {
      // Mark this read as the newest.
      const isCurrent = generation.begin()
      manual.value = false
      // Nothing to ask: no provider that suggests, or no connected account.
      if (!current?.suggest || !address) {
        suggestions.value = []
        loading.value = false
        return
      }
      loading.value = true
      try {
        // Ask the provider (it reads the chain for the gates the account administers).
        const found = await current.suggest({ account: address, client: getSuiClient() })
        if (isCurrent()) suggestions.value = found.gateId ?? []
      // A failed read just means no suggestions; the person can still type the id.
      } catch {
        if (isCurrent()) suggestions.value = []
      } finally {
        if (isCurrent()) loading.value = false
      }
    },
    { immediate: true },
  )

  // The state the pickers bind to.
  return { suggestions, loading, manual }
}
