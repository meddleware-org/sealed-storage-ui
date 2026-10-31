// The one operation a Sealed Storage view runs at a time (seal, decrypt, re-seal, publish, search, unlock), shared by its panels.
// Wallet state is shared and can change while a request is awaiting, so an operation is bound to the network and account it started on:
// a switch invalidates it, it drops its result after its next await, and nothing from it lands on the new state. Every `await` in a
// task is followed by an `isCurrent()` check.
import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { createOperationScope, errorMessage } from '@meddleware/web-utils'
import { activeConfig, network, type SealConfig } from '../config.js'

/** What a running task is told: whether it is still the current one, and the configuration it started with. */
export interface OperationContext {
  isCurrent(): boolean
  /** The network configuration at the moment the task began (a late call never reaches another network). */
  config: SealConfig
}

export function createOperation(address: Ref<string | null | undefined>) {
  const busy = ref(false)
  /** Progress text (always shown, in a live region). */
  const status = ref<string | null>(null)
  /** Why the last operation failed. */
  const error = ref<string | null>(null)
  const scope = createOperationScope()

  // Synchronous, so an operation resuming after the change always sees it.
  watch(
    [network, address],
    ([net, addr], [prevNet, prevAddr]) => {
      if (net === prevNet && addr === prevAddr) return
      scope.invalidate()
      const interrupted = busy.value
      busy.value = false
      if (net !== prevNet) {
        status.value = null
        error.value = null
      }
      if (interrupted) status.value = 'The network or account changed, so the operation in progress was discarded. Nothing from it is shown.'
    },
    { flush: 'sync' },
  )

  /** Run `task` as the current operation: a failure it throws is shown (unless the operation was discarded meanwhile). */
  async function run(task: (ctx: OperationContext) => Promise<void>): Promise<void> {
    error.value = null
    status.value = null
    const token = scope.begin()
    busy.value = true
    try {
      await task({ isCurrent: () => token.isCurrent(), config: activeConfig.value })
    } catch (e) {
      if (token.isCurrent()) error.value = errorMessage(e)
    } finally {
      if (token.isCurrent()) busy.value = false
    }
  }

  return { busy, status, error, run }
}

export type Operation = ReturnType<typeof createOperation>

const KEY: InjectionKey<Operation> = Symbol('sealed-storage-operation')

export function provideOperation(operation: Operation): void {
  provide(KEY, operation)
}

export function useOperation(): Operation {
  const operation = inject(KEY)
  if (!operation) throw new Error('useOperation() needs a SealedStorageView above it.')
  return operation
}
