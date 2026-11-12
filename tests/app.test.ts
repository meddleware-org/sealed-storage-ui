// The standalone shell is the shared tool shell: the tool's name as brand and page heading, the network in the header,
// the documentation links and the copyright in the footer.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

vi.mock('../src/components/SealedStorageView.vue', () => ({ default: { template: '<p class="view">view</p>' } }))
vi.mock('../src/config.js', () => ({ network: { value: 'testnet' } }))

import App from '../src/App.vue'

describe('App', () => {
  it('is the tool shell around the view', () => {
    const w = mount(App)
    expect(w.find('h1').text()).toBe('Sealed Storage')
    expect(w.find('header').text()).toContain('Sealed Storage')
    expect(w.find('.view').exists()).toBe(true)
    const hrefs = w.findAll('footer a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/')
    expect(hrefs).toContain('https://meddleware.dev/sui/sealed-storage/')
    expect(w.find('footer').text()).toContain('Meddleware')
  })

  it('shows the company mark beside the name in the header, hidden from assistive technology', () => {
    const header = mount(App).get('header')
    const mark = header.get('svg.mw-brand-mark')
    expect(mark.attributes('aria-hidden')).toBe('true')
    expect(header.text()).toContain('Sealed Storage')
  })

  it('shows the network in the header', () => {
    expect(mount(App).find('header').text()).toContain('testnet')
  })
})

describe('the brand', () => {
  it('keeps no icon of its own: the favicon set comes from the shared brand icons', () => {
    expect(existsSync('public/favicon.svg')).toBe(false)
    expect(readdirSync('public').filter((f) => /favicon|apple-touch|icon-/.test(f))).toEqual([])
    expect(readFileSync('index.html', 'utf8')).not.toMatch(/rel="(?:shortcut )?icon"|apple-touch-icon/)
  })
})
