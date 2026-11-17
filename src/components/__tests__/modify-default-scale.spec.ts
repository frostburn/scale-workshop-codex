import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ModifyScale from '@/components/ModifyScale.vue'
import { useScaleStore } from '@/stores/scale'
import { useModalStore } from '@/stores/modal'
import { useSessionIdStore } from '@/stores/session-id'

let wrapper: VueWrapper
beforeEach(() => {
  setActivePinia(createPinia())
  useSessionIdStore().loading = true
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
})
afterEach(() => {
  wrapper?.unmount()
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

function open(source = '') {
  const scale = useScaleStore()
  scale.sourceText = source
  scale.computeScale()
  wrapper = mount(ModifyScale, { attachTo: document.body })
  return scale
}
async function select(label: string) {
  const link = wrapper.findAll('ul a').find((a) => a.text() === label)!
  ;(link.element as HTMLElement).focus()
  await link.trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
}
async function button(label: string) {
  const target = [...document.querySelectorAll<HTMLButtonElement>('.modal-footer button')].find(
    (b) => b.textContent === label
  )!
  target.click()
  await flushPromises()
}

describe('default scale modification', () => {
  it.each(['OK', 'Raw'])('preserves displayed colors and labels on Repeat %s', async (mode) => {
    const scale = open('1/1 = 440 Hz')
    useModalStore().numRepeats = 2
    const colors = [...scale.colors]
    const labels = [...scale.labels]
    await select('Repeat')
    expect(scale.sourceText).toBe('1/1 = 440 Hz')
    await button(mode)
    expect(scale.error).toBe('')
    expect(scale.relativeIntervals).toHaveLength(24)
    expect(scale.colors).toEqual([...colors, ...colors])
    expect(scale.labels).toEqual([...labels, ...labels])
    expect(scale.scale.baseFrequency).toBeCloseTo(440)
  })

  it.each(['silver', 'cents', 'factors'] as const)(
    'preserves %s colors during materialization',
    (mode) => {
      const scale = open()
      scale.autoColors = mode
      scale.baseMidiNote = 61
      scale.computeScale()
      const colors = [...scale.colors]
      const labels = [...scale.labels]
      scale.materializeDefaultScale()
      const source = scale.sourceText
      scale.materializeDefaultScale()
      expect(scale.sourceText).toBe(source)
      scale.computeScale()
      expect(scale.error).toBe('')
      expect(scale.colors).toEqual(colors)
      expect(scale.labels).toEqual(labels)
    }
  )

  it.each(['Cancel', 'Escape', 'backdrop'])(
    'cancels through %s without changing the scale and closes the dropdown',
    async (method) => {
      const scale = open('(* empty *)')
      const original = JSON.stringify(scale)
      await select('Repeat')
      if (method === 'Cancel') await button('Cancel')
      else if (method === 'Escape') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      } else {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        document.querySelector('.modal-mask')!.dispatchEvent(event)
      }
      await flushPromises()
      expect(JSON.stringify(scale)).toBe(original)
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(wrapper.get('.btn-dropdown-group').classes()).toContain('dismissed')
      expect(document.activeElement).toBe(wrapper.get('a.btn').element)
      await wrapper.get('a.btn').trigger('click')
      expect(wrapper.get('.btn-dropdown-group').classes()).not.toContain('dismissed')
    }
  )

  it('discards staged rational replacements and materialization on cancellation', async () => {
    const scale = open('(* empty *)')
    const original = JSON.stringify(scale)
    await select('Approximate by ratios')
    await button('Apply')
    await button('Apply')
    expect(scale.sourceText).not.toBe('(* empty *)')
    await button('Cancel')
    expect(JSON.stringify(scale)).toBe(original)
  })

  it('materializes for immediate actions', async () => {
    const scale = open()
    const colors = [...scale.colors]
    await select('Sort ascending')
    expect(scale.error).toBe('')
    expect(scale.sourceText).not.toBe('')
    expect(scale.colors).toEqual(colors)
  })

  it('preserves explicit source and evaluates pending editor changes', () => {
    const scale = open()
    scale.sourceText = 'tet(7)'
    scale.materializeDefaultScale()
    expect(scale.sourceText).toBe('tet(7)')
    scale.sourceText = '(* cleared *)'
    scale.materializeDefaultScale()
    scale.computeScale()
    expect(scale.error).toBe('')
    expect(scale.relativeIntervals).toHaveLength(12)
    expect(scale.sourceText).toContain('(* cleared *)')
  })
})
