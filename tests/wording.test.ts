// What a person reads: the page title and description, and every template of the app, name the product, Meddleware and the gate owner,
// never an "operator", the old "MeddleWare" spelling or a build variable (D117). Code comments and the developer README are not user-visible.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const SPELLING = /MeddleWare/

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? vueFiles(join(dir, e.name)) : e.name.endsWith('.vue') ? [join(dir, e.name)] : [],
  )
}

/** The template of a single-file component: what is rendered, without the script and style blocks. */
const templateOf = (file: string) => readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')

describe('user-visible wording', () => {
  it('the page title and description', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    expect(html).toContain('<title>Sealed Storage · Meddleware</title>')
    for (const text of html.match(/<title>.*<\/title>|content="[^"]*"/g) ?? []) expect(text).not.toMatch(/operator|VITE_|coming soon/i)
    expect(html).not.toMatch(SPELLING)
  })

  it.each(vueFiles(join(root, 'src')).map((f) => [f.slice(root.length + 1), f]))('%s renders no forbidden word', (_name, file) => {
    expect(templateOf(file)).not.toMatch(/operator|VITE_|coming soon/i)
    expect(templateOf(file)).not.toMatch(SPELLING)
  })

  it('the package author and licence holder use the one spelling', () => {
    expect(readFileSync(join(root, 'package.json'), 'utf8')).not.toMatch(SPELLING)
    expect(readFileSync(join(root, 'LICENSE'), 'utf8')).not.toMatch(SPELLING)
  })
})
