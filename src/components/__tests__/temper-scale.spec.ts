import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import TemperScale from '@/components/modals/modification/TemperScale.vue'
import Modal from '@/components/ModalDialog.vue'
import { useTemperStore } from '@/stores/tempering'
import { useScaleStore } from '@/stores/scale'
import { useSessionIdStore } from '@/stores/session-id'

let wrapper: VueWrapper
beforeEach(() => {
  setActivePinia(createPinia())
  useSessionIdStore().loading = true
  const scale = useScaleStore()
  scale.sourceText = '5/4\n3/2\n2/1'
  scale.computeScale()
  wrapper = mount(TemperScale, { props: { show: true } })
})
afterEach(() => wrapper.unmount())

describe('Temper scale', () => {
  it.each(['mapping', 'vals', 'commas'] as const)(
    'blocks both actions and direct confirmation for invalid %s',
    async (method) => {
      const temper = useTemperStore()
      const scale = useScaleStore()
      const original = scale.sourceText
      temper.method = method
      temper.mappingString = temper.valsString = temper.commasString = 'garbage'
      await nextTick()
      const buttons = wrapper.findAll('.modal-footer button')
      expect(buttons[0].attributes('disabled')).toBeDefined()
      expect(buttons[2].attributes('disabled')).toBeDefined()
      wrapper.findComponent(Modal).vm.$emit('confirm')
      expect(scale.sourceText).toBe(original)
      expect(wrapper.emitted('done')).toBeUndefined()
      expect(wrapper.get('[role="alert"]').text()).toContain('Check the')
      expect(wrapper.get('.validation-error details p').text().length).toBeGreaterThan(0)
    }
  )

  it.each([0, 2])('applies valid vals with action %i', async (action) => {
    const temper = useTemperStore()
    const scale = useScaleStore()
    temper.method = 'vals'
    temper.valsString = '12'
    temper.subgroupString = '2.3.5'
    await nextTick()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await wrapper.findAll('.modal-footer button')[action].trigger('click')
    expect(scale.error).toBe('')
    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(scale.sourceText.includes('(* vals = 12 *)')).toBe(action === 2)
  })

  it('validates mapping expressions in the scale editor scope', async () => {
    const scale = useScaleStore()
    scale.sourceText = 'const octaveSize = 1200.\n5/4\n3/2\n2/1'
    scale.computeScale()
    useTemperStore().mappingString = 'octaveSize, 1900., 2800.'
    await nextTick()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await wrapper.findAll('.modal-footer button')[0].trigger('click')
    expect(scale.error).toBe('')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('only offers equal-division output for one valid rank-1 val', async () => {
    const temper = useTemperStore()
    temper.method = 'vals'
    temper.subgroupString = '2.3.5'
    temper.valsString = '12'
    await nextTick()
    expect(temper.edoAvailable).toBe(true)
    temper.convertToEdoSteps = true
    temper.valsString = 'garbage'
    await nextTick()
    expect(temper.edoAvailable).toBe(false)
    expect(temper.convertToEdoSteps).toBe(false)
    temper.valsString = '12 & 12'
    await nextTick()
    expect(temper.edoAvailable).toBe(false)
  })

  it('does not carry equal-division output into comma mode', async () => {
    const temper = useTemperStore()
    temper.method = 'vals'
    temper.valsString = '12'
    temper.subgroupString = '2.3.5'
    await nextTick()
    temper.convertToEdoSteps = true
    temper.method = 'commas'
    temper.commasString = '81/80'
    await nextTick()
    await wrapper.findAll('.modal-footer button')[2].trigger('click')
    expect(useScaleStore().sourceText).toContain('cents(£,')
    expect(useScaleStore().error).toBe('')
  })
})
