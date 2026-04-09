import { beforeAll, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { shallowMount } from '@vue/test-utils'

import AboutView from '@/views/AboutView.vue'
import MosView from '@/views/MosView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'
import TermsOfService from '@/views/TermsOfService.vue'
import VirtualKeyboardView from '@/views/VirtualKeyboardView.vue'
import VirtualQwerty from '@/views/VirtualQwerty.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/privacy-policy', component: { template: '<div>privacy</div>' } },
      { path: '/terms-of-service', component: { template: '<div>terms</div>' } }
    ]
  })
}

async function mountView(component: object, options: any = {}) {
  setActivePinia(createPinia())
  const router = createTestRouter()
  await router.push('/')
  await router.isReady()

  return shallowMount(component, {
    ...options,
    global: {
      plugins: [router],
      stubs: {
        Teleport: true,
        Transition: false,
        ...(options.global?.stubs ?? {})
      }
    }
  })
}

beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    ;(window as any).matchMedia = (query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    })
  }

  if (typeof (window as any).requestIdleCallback !== 'function') {
    ;(window as any).requestIdleCallback = (callback: IdleRequestCallback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50
      } as IdleDeadline)
      return 1
    }
  }
})

describe('view smoke tests', () => {
  it('mounts static content views', async () => {
    const about = await mountView(AboutView)
    expect(about.text()).toContain('Scale Workshop 3')

    const privacy = await mountView(PrivacyPolicy)
    expect(privacy.text()).toContain('Privacy Policy')

    const terms = await mountView(TermsOfService)
    expect(terms.text()).toContain('Refraining from Certain Activities')
  })

  it('mounts the mos workspace view', async () => {
    const wrapper = await mountView(MosView)
    expect(wrapper.text()).toContain('Your scale will be replaced with a MOS scale')
  })

  it('mounts virtual keyboard views with note callback props', async () => {
    const noteOn = () => () => {}

    const keyboard = await mountView(VirtualKeyboardView, {
      props: { noteOn }
    })
    expect(keyboard.find('main').exists()).toBe(true)

    const qwerty = await mountView(VirtualQwerty, {
      props: {
        noteOn,
        typingKeyboard: {}
      }
    })
    expect(qwerty.find('main').exists()).toBe(true)
  })

  it('mounts not found view and opens the octaplex portal', async () => {
    const wrapper = await mountView(NotFoundView)
    expect(wrapper.text()).toContain('Not found')

    await wrapper.get('#octaplex').trigger('click')
    expect(wrapper.findComponent({ name: 'OctaplexPortal' }).exists()).toBe(true)
  })
})
