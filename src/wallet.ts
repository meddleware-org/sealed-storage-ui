// sealed-storage-ui's wallet: the shared @meddleware/wallet-adapter singleton, bound to the selected network. Seal needs
// `sui:signPersonalMessage` (the SessionKey) and `sui:signTransaction` (the discovery pointer), so only wallets that offer both are
// listed. Because the adapter is a module singleton, the connection is shared with any other tool view in the same window.
import { createToolWallet } from '@meddleware/wallet-adapter'

export const { useWallet, getSuiClient, signPersonalMessage, signAndExecute } = createToolWallet({
  requiredFeatures: ['sui:signPersonalMessage', 'sui:signTransaction'],
})
