// The policy parameters an operation is built from (src/lib/params.ts): coercion by field kind, required fields refused in words, and the manifest's own
// values overridden by what the person typed, without changing the manifest.
import { describe, expect, it } from 'vitest'
import type { FieldSpec } from '@meddleware/sealed-storage-client'
import { coerce, decryptParams, encryptParams } from '../src/lib/params.js'

// field(over): a field description, text and optional unless said otherwise.
const field = (over: Partial<FieldSpec> & Pick<FieldSpec, 'name'>): FieldSpec => ({ label: over.name, kind: 'text', required: false, ...over })

// Kinds: datetime to epoch milliseconds, checkbox to boolean, anything else to text.
describe('coerce', () => {
  it('turns a datetime into epoch milliseconds, a checkbox into a boolean, anything else into text', () => {
    expect(coerce('datetime', '2030-01-02T03:04:05.000Z')).toBe(Date.parse('2030-01-02T03:04:05.000Z'))
    expect(coerce('boolean', true)).toBe(true)
    expect(coerce('boolean', false)).toBe(false)
    expect(coerce('objectId', '0xabc')).toBe('0xabc')
    expect(coerce('text', 'hello')).toBe('hello')
  })
})

// Encrypt: what was filled in, coerced; a missing required field is an error.
describe('encryptParams', () => {
  const fields = [field({ name: 'gateId', label: 'Access gate ID', kind: 'objectId', required: true }), field({ name: 'note' })]

  it('keeps what was filled in, coerced, and leaves out what was not', () => {
    expect(encryptParams(fields, { gateId: '0x1' })).toEqual({ gateId: '0x1' })
    expect(encryptParams(fields, { gateId: '0x1', note: 'n' })).toEqual({ gateId: '0x1', note: 'n' })
  })

  it('refuses a missing required field in words', () => {
    expect(() => encryptParams(fields, {})).toThrow('Access gate ID is required.')
    expect(() => encryptParams(fields, { gateId: '' })).toThrow('Access gate ID is required.')
  })

  it('keeps an unchecked checkbox (false is an answer)', () => {
    expect(encryptParams([field({ name: 'flag', kind: 'boolean', required: true })], { flag: false })).toEqual({ flag: false })
  })
})

// Decrypt: the manifest's values first, then what the person typed.
describe('decryptParams', () => {
  const fields = [
    field({ name: 'gateId', label: 'Access gate ID', kind: 'objectId', required: true }),
    field({ name: 'nftId', label: 'Your pass NFT', kind: 'objectId', required: true }),
    field({ name: 'soulbound', kind: 'boolean' }),
  ]

  it('starts from the manifest and lets what the person typed override it', () => {
    expect(decryptParams(fields, { gateId: '0xg' }, { nftId: '0xn' })).toEqual({ gateId: '0xg', nftId: '0xn' })
    expect(decryptParams(fields, { gateId: '0xg' }, { nftId: '0xn', gateId: '0xother', soulbound: true })).toEqual({
      gateId: '0xother',
      nftId: '0xn',
      soulbound: true,
    })
  })

  it('does not change the manifest it was given', () => {
    const base = { gateId: '0xg' }
    decryptParams(fields, base, { nftId: '0xn' })
    expect(base).toEqual({ gateId: '0xg' })
  })

  it('refuses a required field that neither the manifest nor the person supplied', () => {
    expect(() => decryptParams(fields, { gateId: '0xg' }, {})).toThrow('Your pass NFT is required.')
    expect(() => decryptParams(fields, undefined, { nftId: '0xn' })).toThrow('Access gate ID is required.')
  })
})
