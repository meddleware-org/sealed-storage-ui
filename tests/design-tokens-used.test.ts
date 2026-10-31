// F13: every custom property the app's components read must be one design-tokens defines. An undefined
// name falls through to a literal fallback that ignores the theme and season (the `--mw-color-*` names
// MyBlobs once used gave #888 at 3.24:1 and #c00 at 3.25:1). The contrast of the tokens themselves is
// gated in design-tokens.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const tokenCss = readFileSync(require.resolve('@meddleware/design-tokens/tokens.css'), 'utf8')
const seasonCss = readFileSync(require.resolve('@meddleware/design-tokens/seasons.css'), 'utf8')
const defined = new Set([...(tokenCss + seasonCss).matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? vueFiles(join(dir, e.name)) : e.name.endsWith('.vue') ? [join(dir, e.name)] : [],
  )
}

/** Names `@meddleware/ui` or wallet-adapter define for their own components, if the app reads any. */
const locallyDefined = (css: string) => new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))

describe('custom properties read by the app', () => {
  const files = vueFiles(join(import.meta.dirname, '..', 'src'))

  it('finds the components', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s reads only properties design-tokens defines (or defines itself)', (file) => {
    const css = readFileSync(file, 'utf8')
    const own = locallyDefined(css)
    const used = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!)
    const unknown = used.filter((name) => !defined.has(name) && !own.has(name))
    expect(unknown).toEqual([])
  })

  it('never uses --warning as text colour (use --warning-text)', () => {
    for (const file of files) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/(^|[^-])color:\s*var\(--warning\)/m)
    }
  })
})
