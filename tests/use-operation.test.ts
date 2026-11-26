// The operation a Sealed Storage view runs: one at a time, bound to the network and account it started on.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'

// Start every test from fresh modules.
afterEach(() => vi.resetModules())

/** Load a fresh operation against a network and an account the test can switch. */
async function operation() {
  vi.resetModules()
  const network = ref('testnet')
  const address = ref<string | null>('0xa')
  vi.doMock('../src/config.js', () => ({
    network,
    activeConfig: computed(() => ({ network: network.value, problem: null })),
  }))
  const { createOperation } = await import('../src/composables/useOperation.js')
  return { network, address, op: createOperation(address) }
}

/** A gate the test opens by hand, to hold a task in flight. */
function gate() {
  let open!: () => void
  const closed = new Promise<void>((resolve) => (open = resolve))
  return { closed, open }
}

// One operation at a time, bound to the network and account it started on.
describe('createOperation', () => {
  // Is busy while a task runs, and gives it the configuration it started with.
  it('is busy while a task runs, and gives it the configuration it started with', async () => {
    const { op, network } = await operation()
    const g = gate()
    let seen = ''
    const run = op.run(async ({ config }) => {
      seen = config.network
      await g.closed
    })
    expect(op.busy.value).toBe(true)
    network.value = 'mainnet'
    g.open()
    await run
    expect(seen).toBe('testnet')
  })

  // Shows a failure the task throws, and clears it when the next one starts.
  it('shows a failure the task throws, and clears it when the next one starts', async () => {
    const { op } = await operation()
    await op.run(async () => {
      throw new Error('keys unavailable')
    })
    expect(op.error.value).toBe('keys unavailable')
    expect(op.busy.value).toBe(false)
    const g = gate()
    const next = op.run(() => g.closed)
    expect(op.error.value).toBeNull()
    g.open()
    await next
  })

  // Discards a task when the network switches: no failure, not busy, and it says so.
  it('discards a task when the network switches: no failure, not busy, and it says so', async () => {
    const { op, network } = await operation()
    const g = gate()
    const run = op.run(async ({ isCurrent }) => {
      await g.closed
      expect(isCurrent()).toBe(false)
      throw new Error('late failure')
    })
    network.value = 'mainnet'
    expect(op.busy.value).toBe(false)
    expect(op.status.value).toMatch(/discarded/)
    g.open()
    await run
    expect(op.error.value).toBeNull()
  })

  // Discards a task when the account switches or disconnects.
  it('discards a task when the account switches or disconnects', async () => {
    const { op, address } = await operation()
    const g = gate()
    let current: boolean | undefined
    const run = op.run(async ({ isCurrent }) => {
      await g.closed
      current = isCurrent()
    })
    address.value = null
    await nextTick()
    g.open()
    await run
    expect(current).toBe(false)
  })

  // Does not say anything was discarded when nothing was running.
  it('does not say anything was discarded when nothing was running', async () => {
    const { op, network } = await operation()
    op.status.value = 'something shown for testnet'
    network.value = 'mainnet'
    expect(op.status.value).toBeNull()
  })

  // Lets a task begun after the switch finish normally.
  it('lets a task begun after the switch finish normally', async () => {
    const { op, network } = await operation()
    network.value = 'mainnet'
    let current = false
    await op.run(async ({ isCurrent }) => {
      current = isCurrent()
    })
    expect(current).toBe(true)
    expect(op.busy.value).toBe(false)
  })
})
