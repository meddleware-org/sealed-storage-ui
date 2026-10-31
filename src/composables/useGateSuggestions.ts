// The gates the connected wallet administers, offered as choices wherever a gate id is asked for (Encrypt's details step, Unlock's gate
// step). Asked again when the account, the network or the provider changes; an answer for an earlier one is ignored.
import { ref, shallowRef, watch } from 'vue'
import { createGeneration } from '@meddleware/web-utils'
import type { FieldSuggestion, SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { network } from '../config.js'
import { getSuiClient, useWallet } from '../wallet.js'

/** `provider()` is the policy provider to ask, or `null` when suggestions are not wanted right now (another policy, another tab). */
export function useGateSuggestions(provider: () => SealPolicyProvider | null) {
  const { account } = useWallet()
  const suggestions = shallowRef<FieldSuggestion[]>([])
  const loading = ref(false)
  /** The person chose to type the id instead of picking it. */
  const manual = ref(false)
  const generation = createGeneration()

  watch(
    [() => account.value?.address, network, provider],
    async ([address, , current]) => {
      const isCurrent = generation.begin()
      manual.value = false
      if (!current?.suggest || !address) {
        suggestions.value = []
        loading.value = false
        return
      }
      loading.value = true
      try {
        const found = await current.suggest({ account: address, client: getSuiClient() })
        if (isCurrent()) suggestions.value = found.gateId ?? []
      } catch {
        if (isCurrent()) suggestions.value = []
      } finally {
        if (isCurrent()) loading.value = false
      }
    },
    { immediate: true },
  )

  return { suggestions, loading, manual }
}
