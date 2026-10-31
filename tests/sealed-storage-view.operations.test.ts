import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { GATE, OPERATOR, alertText, deferred, file, mountView } from './support/mount.js'

// SealedStorageView with its wiring mocked: network and account are refs the test switches mid-operation, and every slow dependency is a
// promise the test settles by hand. Covers audit F11 (a result that arrives after a switch is dropped), F12 (the lifetime is shown) and F13
// (the Confirm step shows what the content is sealed to; a gate from a link needs an explicit OK).
const progress = (w: Awaited<ReturnType<typeof mountView>>['wrapper']) => w.get('output[aria-label="Progress"]').text()

afterEach(() => {
  window.history.replaceState({}, '', '/')
  vi.resetModules()
})

describe('F11: an in-flight operation never finishes against another network or account', () => {
  it('drops a seal that completes after a network switch: no manifest, nothing stored on the new network', async () => {
    const t = await mountView()
    const sealed = deferred<{ id: string; ciphertext: Uint8Array }>()
    t.encrypt.mockReturnValue(sealed.promise)
    const panel = t.encryptPanel()
    panel.file = file()
    panel.values = { gateId: GATE }
    const run = panel.seal()
    await flushPromises()
    expect(progress(t.wrapper)).toBe('Encrypting…')

    t.network.value = 'mainnet'
    await nextTick()
    expect(progress(t.wrapper)).toMatch(/discarded/)

    sealed.resolve({ id: 'ff', ciphertext: new Uint8Array([9]) })
    await run
    await flushPromises()
    expect(t.storeBlob).not.toHaveBeenCalled()
    expect(t.wrapper.vm.result).toBeNull()
  })

  it('drops a stored blob that completes after a network switch', async () => {
    const t = await mountView()
    t.encrypt.mockResolvedValue({ id: 'ff', ciphertext: new Uint8Array([9]) })
    const stored = deferred<{ blobId: string; endEpoch: number }>()
    t.storeBlob.mockReturnValue(stored.promise)
    const panel = t.encryptPanel()
    panel.file = file()
    panel.values = { gateId: GATE }
    const run = panel.seal()
    await flushPromises()
    expect(t.storeBlob).toHaveBeenCalledTimes(1)
    // The store is bound to the configuration the operation started with, not the active one.
    expect(t.storeBlob.mock.calls[0][1].config.network).toBe('testnet')
    expect(t.storeBlob.mock.calls[0][1].sendObjectTo).toBe('0xowner')

    t.network.value = 'mainnet'
    stored.resolve({ blobId: 'B1', endEpoch: 12 })
    await run
    await flushPromises()
    expect(t.wrapper.vm.result).toBeNull()
    expect(panel.step).toBe(0)
  })

  it('drops a result that completes after an account switch (the Blob object went to the previous account)', async () => {
    const t = await mountView()
    t.encrypt.mockResolvedValue({ id: 'ff', ciphertext: new Uint8Array([9]) })
    const stored = deferred<{ blobId: string }>()
    t.storeBlob.mockReturnValue(stored.promise)
    const panel = t.encryptPanel()
    panel.file = file()
    panel.values = { gateId: GATE }
    const run = panel.seal()
    await flushPromises()
    t.address.value = '0xother'
    stored.resolve({ blobId: 'B1' })
    await run
    await flushPromises()
    expect(t.wrapper.vm.result).toBeNull()
  })

  it('labels the manifest with the network the seal started on', async () => {
    const t = await mountView()
    t.encrypt.mockResolvedValue({ id: 'ff', ciphertext: new Uint8Array([9]) })
    t.storeBlob.mockResolvedValue({ blobId: 'B1', endEpoch: 12 })
    const panel = t.encryptPanel()
    panel.file = file()
    panel.values = { gateId: GATE }
    await panel.seal()
    expect(t.wrapper.vm.result.manifest.network).toBe('testnet')
    expect(t.wrapper.vm.result.manifest.blobId).toBe('B1')
  })

  it('drops a discovery that completes after a network switch', async () => {
    const t = await mountView()
    const found = deferred<unknown[]>()
    t.discoverSealedContent.mockReturnValue(found.promise)
    const panel = t.unlockPanel()
    panel.gateId = GATE
    const run = panel.find()
    await flushPromises()
    t.network.value = 'mainnet'
    found.resolve([{ contentId: 'c', blobId: 'b', sealId: 's', gateId: GATE, label: 'x', publisher: '0x1' }])
    await run
    await flushPromises()
    expect(panel.discovered).toEqual([])
    expect(panel.step).toBe(0)
    expect(t.discoverSealedContent.mock.calls[0][1].config.network).toBe('testnet')
  })

  it('drops a failure from a discarded operation instead of showing it on the new network', async () => {
    const t = await mountView()
    const found = deferred<unknown[]>()
    t.discoverSealedContent.mockReturnValue(found.promise)
    const panel = t.unlockPanel()
    panel.gateId = GATE
    const run = panel.find()
    await flushPromises()
    t.network.value = 'mainnet'
    found.reject(new Error('old network failed'))
    await run
    await flushPromises()
    expect(t.wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('lets an operation started after the switch complete normally', async () => {
    const t = await mountView()
    t.network.value = 'mainnet'
    t.discoverSealedContent.mockResolvedValue([])
    const panel = t.unlockPanel()
    panel.gateId = GATE
    await panel.find()
    await nextTick()
    expect(progress(t.wrapper)).toBe('No sealed content published for this gate.')
  })

  it('shows a failure of the current operation', async () => {
    const t = await mountView()
    t.discoverSealedContent.mockRejectedValue(new Error('the node is down'))
    const panel = t.unlockPanel()
    panel.gateId = GATE
    await panel.find()
    await nextTick()
    expect(alertText(t.wrapper)).toBe('the node is down')
  })
})

describe('F12: the storage lifetime is shown', () => {
  it('shows the epochs on the Confirm step and the end epoch on the result', async () => {
    const t = await mountView()
    const panel = t.encryptPanel()
    panel.type = 'nft-gate'
    panel.values = { gateId: GATE }
    panel.step = 2
    await nextTick()
    expect(t.wrapper.text()).toContain('5 epochs')

    t.encrypt.mockResolvedValue({ id: 'ff', ciphertext: new Uint8Array([9]) })
    t.storeBlob.mockResolvedValue({ blobId: 'B1', endEpoch: 17, blobObjectId: '0xblobobj' })
    panel.file = file()
    await panel.seal()
    await nextTick()
    const text = t.wrapper.text()
    expect(text).toContain('through epoch 17')
    expect(text).toContain('0xblobobj')
    expect(t.wrapper.find('.lifetime a').attributes('href')).toBe('https://sui-walrus-storage.meddleware.co.uk/')
  })

  it('says so when the publisher did not report the end epoch', async () => {
    const t = await mountView()
    t.encrypt.mockResolvedValue({ id: 'ff', ciphertext: new Uint8Array([9]) })
    t.storeBlob.mockResolvedValue({ blobId: 'B1' })
    const panel = t.encryptPanel()
    panel.file = file()
    panel.values = { gateId: GATE }
    await panel.seal()
    await nextTick()
    expect(t.wrapper.text()).toContain('did not report the end epoch')
  })
})

describe('F13: the Confirm step shows what the content is sealed to', () => {
  it('lists the gate id and the gate operator read from the chain', async () => {
    const t = await mountView()
    const panel = t.encryptPanel()
    panel.type = 'nft-gate'
    panel.values = { gateId: GATE }
    panel.step = 2
    await flushPromises()
    const text = t.wrapper.text()
    expect(text).toContain(GATE)
    expect(text).toContain(OPERATOR)
    expect(t.gateOperatorsFor).toHaveBeenCalledWith(GATE, expect.objectContaining({ network: 'testnet' }))
  })

  it('warns when the gate cannot be read as a gate of this network', async () => {
    const t = await mountView()
    t.gateOperatorsFor.mockRejectedValueOnce(new Error('not a Gate of this package'))
    const panel = t.encryptPanel()
    panel.type = 'nft-gate'
    panel.values = { gateId: GATE }
    panel.step = 2
    await flushPromises()
    expect(t.wrapper.text()).toContain('could not be read as an access gate')
    expect(t.wrapper.text()).toContain('not a Gate of this package')
  })

  it('requires an explicit confirmation of a gate preselected by a ?gate= link', async () => {
    const t = await mountView({ network: 'testnet', address: '0xowner', search: `/?gate=${GATE}` })
    const panel = t.encryptPanel()
    panel.step = 2
    await flushPromises()
    expect(panel.values.gateId).toBe(GATE)
    expect(t.wrapper.text()).toContain('preselected by a link')
    const button = () => t.wrapper.findAll('button').find((b) => b.text().includes('Encrypt & store'))!
    expect(button().attributes('disabled')).toBeDefined()

    // Even if the button were activated, the operation itself refuses.
    panel.file = file()
    await panel.seal()
    await nextTick()
    expect(alertText(t.wrapper)).toMatch(/Confirm that you want to seal to the gate from the link/)
    expect(t.encrypt).not.toHaveBeenCalled()

    const confirm = t.wrapper.findAll('label').find((l) => l.text().includes('seal this file to the gate from the link'))!
    await confirm.get('input').setValue(true)
    expect(button().attributes('disabled')).toBeUndefined()
  })

  it('does not ask again once the user has chosen a different gate themselves', async () => {
    const t = await mountView({ network: 'testnet', address: '0xowner', search: `/?gate=${GATE}` })
    const panel = t.encryptPanel()
    panel.values = { gateId: `0x${'c2'.repeat(32)}` }
    panel.step = 2
    await flushPromises()
    expect(t.wrapper.text()).not.toContain('preselected by a link')
  })

  it('does not ask when no link was followed', async () => {
    const t = await mountView()
    const panel = t.encryptPanel()
    panel.type = 'nft-gate'
    panel.values = { gateId: GATE }
    panel.step = 2
    await flushPromises()
    expect(t.wrapper.text()).not.toContain('preselected by a link')
  })
})

describe('re-sealing', () => {
  const manifest = JSON.stringify({ policyType: 'nft-gate', id: 'old', blobId: 'B1', network: 'testnet', params: { gateId: GATE }, label: 'notes.txt' })

  async function ready() {
    const t = await mountView({ network: 'testnet', address: '0xowner', trustManifests: true })
    const panel = t.decryptPanel()
    panel.manifestText = manifest
    await nextTick()
    panel.step = 1
    t.readBlob.mockResolvedValue(new Uint8Array([1]))
    return { t, panel }
  }

  it('shows the new manifest on the Encrypt tab, at its last step', async () => {
    const { t, panel } = await ready()
    t.resealCiphertext.mockResolvedValue({ id: 'new', ciphertext: new Uint8Array([2]) })
    t.storeBlob.mockResolvedValue({ blobId: 'B2', endEpoch: 20 })
    await panel.reseal()
    await nextTick()
    expect(t.wrapper.vm.result.manifest).toMatchObject({ id: 'new', blobId: 'B2', network: 'testnet', label: 'notes.txt', params: { gateId: GATE } })
    expect(t.wrapper.vm.tab).toBe('encrypt')
    expect(t.encryptPanel().step).toBe(2)
    expect(t.storeBlob.mock.calls[0][1].sendObjectTo).toBe('0xowner')
    expect(progress(t.wrapper)).toMatch(/^Re-sealed/)
  })

  it('does nothing, and says so, when the content is already sealed to the current key servers', async () => {
    const { t, panel } = await ready()
    t.resealCiphertext.mockResolvedValue(null)
    await panel.reseal()
    await nextTick()
    expect(t.storeBlob).not.toHaveBeenCalled()
    expect(t.wrapper.vm.result).toBeNull()
    expect(progress(t.wrapper)).toMatch(/already sealed to the current key servers/)
  })
})
