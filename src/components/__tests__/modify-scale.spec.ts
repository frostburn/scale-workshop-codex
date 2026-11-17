import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ModifyScale from '@/components/ModifyScale.vue'
import { useScaleStore } from '@/stores/scale'
import { useModalStore } from '@/stores/modal'
import { useSessionIdStore } from '@/stores/session-id'

describe('Modify scale fallback', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    useSessionIdStore().loading = true
  })

  afterEach(() => wrapper?.unmount())

  function open(source: string) {
    const scale = useScaleStore()
    scale.sourceText = source
    scale.computeScale()
    wrapper = mount(ModifyScale, { global: { stubs: { Teleport: true } } })
    return scale
  }

  async function select(label: string) {
    const link = wrapper.findAll('ul a').find((a) => a.text() === label)!
    await link.trigger('click')
    await vi.dynamicImportSettled()
    await flushPromises()
  }

  it.each(['', '(* No intervals *)', '1/1 = 440 Hz'])(
    'materializes fallback before opening a dialog for source %s',
    async (source) => {
      const scale = open(source)
      expect(scale.sourceText).toBe(source)
      await select('Reorder steps')
      expect(scale.sourceText).toBe(`${source}\ntet(12)`)
      expect(wrapper.findAll('.reorder-steps li')).toHaveLength(12)
      await wrapper
        .findAll('.modal-footer button')
        .find((b) => b.text() === 'Raw')!
        .trigger('click')
      expect(scale.error).toBe('')
      expect(scale.relativeIntervals).toHaveLength(12)
      expect(scale.sourceText).not.toContain('if (not length($))')
      expect(scale.sourceText.match(/tet\(12\)/g)).toHaveLength(1)
    }
  )

  it.each(['OK', 'Raw'])('repeats the displayed fallback using %s', async (button) => {
    const scale = open('')
    useModalStore().numRepeats = 2
    await select('Repeat')
    await wrapper
      .findAll('.modal-footer button')
      .find((b) => b.text() === button)!
      .trigger('click')
    expect(scale.error).toBe('')
    expect(scale.relativeIntervals).toHaveLength(24)
    expect(scale.relativeIntervals[23].valueOf()).toBe(4)
  })

  it.each(['Sort ascending', 'Octave reduce', 'Retrovert (negative harmony)'])(
    'materializes fallback for the immediate action %s',
    async (label) => {
      const scale = open('')
      await select(label)
      expect(scale.error).toBe('')
      expect(scale.relativeIntervals).toHaveLength(12)
      expect(scale.sourceText).not.toBe('')
      expect(scale.warning).not.toContain('Empty scale')
    }
  )

  it('leaves explicit scales untouched when opening and cancelling a dialog', async () => {
    const source = 'tet(12)'
    const scale = open(source)
    await select('Reorder steps')
    expect(scale.sourceText).toBe(source)
    await wrapper
      .findAll('.modal-footer button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(scale.sourceText).toBe(source)
  })

  it('checks pending editor changes before deciding whether to materialize', async () => {
    const scale = open('tet(5)')
    scale.sourceText = '(* Cleared the scale *)'
    await select('Repeat')
    expect(scale.sourceText).toBe('(* Cleared the scale *)\ntet(12)')
  })

  it('does not materialize a stale fallback over a pending explicit scale', async () => {
    const scale = open('')
    scale.sourceText = 'tet(7)'
    await select('Reorder steps')
    expect(scale.sourceText).toBe('tet(7)')
    expect(wrapper.findAll('.reorder-steps li')).toHaveLength(7)
  })
})
