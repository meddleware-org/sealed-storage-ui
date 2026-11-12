// The built app (dist/): the brand icon set is emitted once per page, and nothing in it loads a font, script, style or image from a
// third-party origin. It needs a build, so it runs after one (CI's build job sets REQUIRE_DIST=1 and fails if dist/ is missing);
// a plain `npm test` before any build skips it rather than failing.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIST = 'dist'
const required = Boolean(process.env.REQUIRE_DIST)

/** Every file below `dir`, as paths relative to dist/. */
function files(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path, base) : [path.slice(base.length + 1)]
  })
}

describe.skipIf(!required && !existsSync(DIST))('the built app', () => {
  it('has a dist/ to check', () => {
    expect(existsSync(DIST)).toBe(true)
  })

  const all = existsSync(DIST) ? files(DIST) : []

  it('emits the brand icon set and the manifest', () => {
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
      expect(all, f).toContain(f)
    }
    expect(JSON.parse(readFileSync(join(DIST, 'site.webmanifest'), 'utf8')).name).toBe('Sealed Storage')
  })

  describe.each(['index.html'])('%s', (page) => {
    const html = existsSync(join(DIST, page)) ? readFileSync(join(DIST, page), 'utf8') : ''
    const links = (rel: string) => [...html.matchAll(new RegExp(`<link rel="${rel}"[^>]*>`, 'g'))].map((m) => m[0])

    it('carries the icon set exactly once', () => {
      expect(links('icon').filter((l) => l.includes('/favicon.svg'))).toHaveLength(1)
      expect(links('icon').filter((l) => l.includes('/favicon.ico'))).toHaveLength(1)
      expect(links('apple-touch-icon')).toHaveLength(1)
      expect(links('manifest')).toHaveLength(1)
    })
  })

  it('ships no font file and no font host', () => {
    expect(all.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([])
    const code = all.filter((f) => /\.(html|css|js)$/.test(f)).map((f) => readFileSync(join(DIST, f), 'utf8'))
    for (const text of code) expect(text).not.toMatch(/fonts\.(googleapis|gstatic)|@font-face/)
  })

  it('loads nothing from a third-party origin', () => {
    // Plain-text links (the page's own tools, the XML namespace, Vue's error-reference string) are not loads: what counts is a
    // script, stylesheet, font, image or url() that points off this site.
    const pages = all.filter((f) => /\.(html|css|js)$/.test(f))
    for (const f of pages) {
      const text = readFileSync(join(DIST, f), 'utf8')
      expect(text, f).not.toMatch(/<(script|link|img|source|iframe)\b[^>]*\b(src|href|srcset)="(https?:)?\/\/(?!(?:[a-z0-9-]+\.)*meddleware\.(?:co\.uk|dev))/)
      expect(text, f).not.toMatch(/url\(\s*["']?(https?:)?\/\/(?!(?:[a-z0-9-]+\.)*meddleware\.(?:co\.uk|dev))/)
      expect(text, f).not.toMatch(/@import\s+(url\()?["']?(https?:)?\/\//)
    }
  })

  it('names no origin beyond this site, the explorers and the protocol endpoints', () => {
    // The Sui, Seal and Walrus endpoints and the explorer links are protocol requirements. The rest are namespaces, comments and
    // library strings that are never fetched (the zkLogin issuer normaliser in @mysten/sui names accounts.google.com but makes no request).
    const allowed =
      /^(?:[a-z0-9-]+\.)*(?:meddleware\.(?:co\.uk|dev)|mystenlabs\.com|walrus\.space|sui\.io|suivision\.xyz|w3\.org|vuejs\.org|github\.com|localhost|127\.0\.0\.1|site\.invalid|accounts\.google\.com)$/
    const found = new Set<string>()
    for (const f of all.filter((n) => /\.(html|css|js|webmanifest)$/.test(n))) {
      for (const m of readFileSync(join(DIST, f), 'utf8').matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) found.add(m[1].replace(/\.$/, ''))
    }
    expect([...found].filter((host) => !allowed.test(host))).toEqual([])
  })
})
