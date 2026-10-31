// The policy parameters of an operation, from what the form holds. One place, because Encrypt, Decrypt and Re-seal all build them and
// must refuse a missing required field in the same words.
import type { FieldSpec } from '@meddleware/sealed-storage-client'

/** What a policy form holds: text, a datetime-local or ISO instant, or a checkbox. */
export type FieldValues = Record<string, string | boolean>

/** A form value as the policy provider expects it (`datetime` is epoch milliseconds). */
export function coerce(kind: string, raw: string | boolean): unknown {
  if (kind === 'boolean') return Boolean(raw)
  if (kind === 'datetime') return Date.parse(String(raw))
  return String(raw)
}

const filled = (v: unknown): v is string | boolean => v !== undefined && v !== ''

/** The encrypt parameters: every field the person filled in, coerced. Throws when a required one is empty. */
export function encryptParams(fields: readonly FieldSpec[], values: FieldValues): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const f of fields) {
    const v = values[f.name]
    if (f.required && !filled(v)) throw new Error(`${f.label} is required.`)
    if (filled(v)) params[f.name] = coerce(f.kind, v)
  }
  return params
}

/**
 * The decrypt parameters: the manifest's own (`base`), overridden by what the person typed. Throws when a required field is still
 * empty after that.
 */
export function decryptParams(
  fields: readonly FieldSpec[],
  base: Record<string, unknown> | undefined,
  values: FieldValues,
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...(base ?? {}) }
  for (const f of fields) {
    const v = values[f.name]
    if (filled(v)) params[f.name] = coerce(f.kind, v)
    if (f.required && (params[f.name] === undefined || params[f.name] === '')) throw new Error(`${f.label} is required.`)
  }
  return params
}
