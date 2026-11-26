// What the Confirm step shows before sealing: every encrypt parameter, in a form the user can check.
// The client's description of a policy field.
import type { FieldSpec } from '@meddleware/sealed-storage-client'

/** One line of the Confirm summary. */
export interface ConfirmRow {
  label: string
  value: string
}

/** Format a datetime-local value as local time plus the UTC instant the key servers will compare. */
export function formatUnlockTime(raw: string): string {
  const ms = Date.parse(raw)
  if (!Number.isFinite(ms)) return raw
  return `${new Date(ms).toLocaleString()} (${new Date(ms).toISOString()})`
}

/** A row per policy field the user filled in; empty optional fields are omitted. */
export function confirmRows(fields: readonly FieldSpec[], values: Record<string, string | boolean>): ConfirmRow[] {
  // The rows, in field order.
  const rows: ConfirmRow[] = []
  // Skip fields the person left empty.
  for (const f of fields) {
    const v = values[f.name]
    if (v === undefined || v === '') continue
    // A checkbox reads Yes or No, a date and time reads in local time and as the UTC instant the key servers compare, anything else as typed.
    if (f.kind === 'boolean') rows.push({ label: f.label, value: v ? 'Yes' : 'No' })
    else if (f.kind === 'datetime') rows.push({ label: f.label, value: formatUnlockTime(String(v)) })
    else rows.push({ label: f.label, value: String(v) })
  }
  // Hand the rows to the summary.
  return rows
}
