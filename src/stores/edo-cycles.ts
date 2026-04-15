import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mmod, modInv } from 'xen-dev-utils'
import { parseVal } from '@/utils'

/**
 * Store for EDO cycle diagram parameters and derived cycle math.
 */
export const useCyclesStore = defineStore('edo-cycles', () => {
  // View
  const size = ref(0.15)
  const labelOffset = ref(2)
  const showLabels = ref(true)

  // Elements
  const valString = ref('12p')
  const generator = ref(7)

  const val = computed(() => parseVal(valString.value))

  const modulus = computed(() => val.value.divisions.round().valueOf())
  const generatorPseudoInverse = computed(() => modInv(generator.value, modulus.value, false))
  const numCycles = computed(
    () => mmod(generator.value * generatorPseudoInverse.value, modulus.value) || 1
  )
  const cycleLength = computed(() => modulus.value / numCycles.value)

  const LIVE_STATE = {
    size,
    labelOffset,
    showLabels,
    valString,
    generator
  }

  /**
   * Convert live state to a format suitable for storing on the server.
   */
  function toJSON() {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(LIVE_STATE)) {
      result[key] = value.value
    }
    return result
  }

  /**
   * Apply revived state to current state.
   * @param data JSON data as an Object instance.
   */
  function fromJSON(data: Record<string, unknown>) {
    for (const key in LIVE_STATE) {
      const stateKey = key as keyof typeof LIVE_STATE
      LIVE_STATE[stateKey].value = data[key] as (typeof LIVE_STATE)[typeof stateKey]['value']
    }
  }

  return {
    // State
    ...LIVE_STATE,
    // Computed state
    val,
    modulus,
    generatorPseudoInverse,
    numCycles,
    cycleLength,
    // Methods
    toJSON,
    fromJSON
  }
})
