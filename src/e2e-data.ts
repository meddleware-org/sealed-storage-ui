// What the end-to-end build's stub chain holds, apart from the code that installs it (`e2e.ts` pulls in the mock wallet, which a Playwright
// spec, running in Node, cannot load): the specs import these to choose and to expect the right things.
const hex = (byte: string) => `0x${byte.repeat(32)}`

/** The two gates the mock account administers. */
export const E2E_GATES = { studio: hex('11'), open: hex('22') } as const

/** Who the gates pay (their owner), as the Confirm step shows it. */
export const E2E_GATE_OWNER = hex('0b')
