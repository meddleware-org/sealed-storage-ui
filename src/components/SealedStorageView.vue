<script setup lang="ts">
// Core Sealed Storage tool UI (Encrypt / Decrypt / Unlock), free of any app shell.
// Rendered standalone by sealed-storage-ui's App.vue and inline by the dashboard. Wallet state comes from the shared
// @meddleware/wallet-adapter singleton (via ./wallet.js): connecting here or in any other inline tool view (or the dashboard header)
// reflects everywhere. This component owns what the three panels share: the tabs, the one running operation (progress and failure), and the
// result of sealing.
import { computed, ref, watch } from 'vue'
import { AppTabNav, UiLiveStatus, UiNotice, UiTabPanel, UiToolIntro, type AppTab } from '@meddleware/ui'
import { WalletGuard } from '@meddleware/wallet-adapter'
import type { SealPolicyProvider } from '@meddleware/sealed-storage-client'
import { activeConfig, network } from '../config.js'
import { createOperation, provideOperation } from '../composables/useOperation.js'
import { clearSealSessions, registry } from '../seal.js'
import type { SealedResult } from '../types.js'
import { useWallet } from '../wallet.js'
import DecryptPanel from './DecryptPanel.vue'
import EncryptPanel from './EncryptPanel.vue'
import UnlockPanel from './UnlockPanel.vue'

const GUARD_MESSAGE = 'Connect a Sui wallet to encrypt and decrypt sealed content.'
const TABS: AppTab[] = [
  { id: 'encrypt', label: 'Encrypt' },
  { id: 'decrypt', label: 'Decrypt' },
  { id: 'unlock', label: 'Unlock' },
]
const tab = ref<string>('encrypt')

const { account } = useWallet()
const providers = computed(() => registry.value.list() as SealPolicyProvider[])
const disabled = computed(() => activeConfig.value.problem !== null)

// Deep link from access-gate-ui: ?gate=<id> preselects the access-gate policy and the gate.
const linkedGate = new URLSearchParams(location.search).get('gate')

const operation = createOperation(computed(() => account.value?.address))
provideOperation(operation)

/** What sealing (or re-sealing) produced, shown on the Encrypt tab. */
const result = ref<SealedResult | null>(null)
function onResealed(r: SealedResult): void {
  result.value = r
  tab.value = 'encrypt'
}

// What is shown belongs to the network it was made on.
watch(network, () => {
  result.value = null
})
// SessionKeys are per address: drop them whenever the wallet disconnects or switches account.
watch(
  () => account.value?.address,
  (next, prev) => {
    if (prev && next !== prev) clearSealSessions()
  },
)
</script>

<template>
  <section aria-labelledby="sealed-title">
    <h2 id="sealed-title">Sealed Storage</h2>
    <UiToolIntro>Client-side encrypted, access-gated storage on Walrus + Sui.</UiToolIntro>

    <UiNotice v-if="activeConfig.problem" type="warning" :message="activeConfig.problem" />
    <UiNotice v-else-if="activeConfig.custody === 'operator'" type="warning">
      On {{ activeConfig.network }}, content is sealed with a key server run by this site's operator, who could therefore decrypt it. Do not
      seal anything you would not share with the operator.
    </UiNotice>

    <details>
      <summary>What you should know before sealing</summary>
      <ul>
        <li>
          Decryption needs {{ activeConfig.threshold }} of the configured key servers; that many servers together could decrypt, and if fewer
          are online nobody can.
        </li>
        <li>
          Who may decrypt is decided by the <code>sealed_storage</code> package. Until its publisher makes it immutable, an upgrade could
          change access to content already sealed.
        </li>
        <li>Once someone has decrypted an item, losing their pass does not take that access back.</li>
        <li>Labels and the gate an item is sealed to are public; only the content is encrypted.</li>
        <li>
          The ciphertext is stored on Walrus for {{ activeConfig.walrusEpochs }} epochs. After that it is gone unless you extend the
          <code>Blob</code> object sent to your account.
        </li>
      </ul>
    </details>

    <!-- The tab list and every panel always render (each tab controls a live panel); the wallet prompt replaces only a panel's content until
         a wallet is connected. Panels stay mounted (v-show) so each tab keeps its state. -->
    <AppTabNav v-model="tab" :tabs="TABS" id-prefix="seal" aria-label="Sealed storage" all-panels />

    <!-- Progress and failure sit right under the tabs, where the person is looking, not below a long result. -->
    <UiLiveStatus label="Progress" :message="operation.status.value ?? ''" />
    <UiNotice v-if="operation.error.value" type="error" :message="operation.error.value" />

    <UiTabPanel v-show="tab === 'encrypt'" id-prefix="seal" tab="encrypt">
      <WalletGuard :message="GUARD_MESSAGE">
        <EncryptPanel v-model:result="result" :providers="providers" :linked-gate="linkedGate" :disabled="disabled" />
      </WalletGuard>
    </UiTabPanel>

    <UiTabPanel v-show="tab === 'decrypt'" id-prefix="seal" tab="decrypt">
      <WalletGuard :message="GUARD_MESSAGE">
        <DecryptPanel :providers="providers" :disabled="disabled" @resealed="onResealed" />
      </WalletGuard>
    </UiTabPanel>

    <UiTabPanel v-show="tab === 'unlock'" id-prefix="seal" tab="unlock">
      <WalletGuard :message="GUARD_MESSAGE">
        <UnlockPanel :providers="providers" :active="tab === 'unlock'" :linked-gate="linkedGate" />
      </WalletGuard>
    </UiTabPanel>

    <p>
      Decryption keys are released by a threshold committee of independent key servers. If enough servers are unreachable, decryption pauses —
      storage and retrieval are unaffected.
    </p>
  </section>
</template>
