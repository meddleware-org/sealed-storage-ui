// The standalone shell is the shared tool shell: the tool's name as brand and page heading, the network in the header,
// the documentation links and the copyright in the footer.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

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

  it('shows the network in the header', () => {
    expect(mount(App).find('header').text()).toContain('testnet')
  })
})
