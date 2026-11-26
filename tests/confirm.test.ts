// The Confirm step's rows (src/confirm.ts): every parameter shown exactly as it will be sealed, times as local time and as the UTC instant, and nothing hidden.
import { describe, it, expect } from 'vitest'
import { confirmRows, formatUnlockTime } from '../src/confirm.js'

const GATE = { name: 'gateId', label: 'Access gate ID', kind: 'objectId', required: true }
const UNLOCK = { name: 'unlockMs', label: 'Unlock time', kind: 'datetime', required: true }
const FLAG = { name: 'flag', label: 'Flag', kind: 'boolean', required: false }

// One test per rule of the summary rows.
describe('confirmRows', () => {
  // Lists the gate id exactly as it will be sealed to.
  it('lists the gate id exactly as it will be sealed to', () => {
    expect(confirmRows([GATE], { gateId: '0xabc' })).toEqual([{ label: 'Access gate ID', value: '0xabc' }])
  })

  it('shows the unlock time as local time and as the UTC instant', () => {
    const [row] = confirmRows([UNLOCK], { unlockMs: '2030-01-02T03:04' })
    expect(row.label).toBe('Unlock time')
    expect(row.value).toContain(new Date('2030-01-02T03:04').toISOString())
  })

  it('omits empty fields and renders booleans as Yes/No', () => {
    expect(confirmRows([GATE, FLAG], { gateId: '', flag: true })).toEqual([{ label: 'Flag', value: 'Yes' }])
    expect(confirmRows([FLAG], { flag: false })).toEqual([{ label: 'Flag', value: 'No' }])
  })

  it('keeps an unparseable datetime visible instead of hiding it', () => {
    expect(formatUnlockTime('soon')).toBe('soon')
  })
})
