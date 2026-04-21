import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Input, Output } from 'webmidi'
import { syncValues } from '@/utils'

function parseRawVelocity(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) {
    return 80
  }
  return Math.max(0, Math.min(127, parsed))
}

/**
 * MIDI device and routing preferences store.
 */
export const useMidiStore = defineStore('midi', () => {
  const input = ref<Input | null>(null)
  const output = ref<Output | null>(null)
  // Channel 10 is reserved for percussion
  const outputChannels = ref(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16]))
  const outputChannel = ref(1) // For 'linear' output
  const velocityOn = ref(true)
  const rawAttackDefault = ref(parseRawVelocity(localStorage.getItem('rawAttackDefault')))
  const rawReleaseDefault = ref(parseRawVelocity(localStorage.getItem('rawReleaseDefault')))
  // Lumatone multichannel-to-equave mode
  const multichannelToEquave = ref(false)
  const multichannelCenter = ref(3)
  const multichannelNumEquaves = ref(8)
  const multichannelEquavesDown = ref(4)

  const whiteMode = ref<'off' | 'simple' | 'blackAverage' | 'keyColors'>('off')
  const outputMode = ref<'pitchBend' | 'linear'>('pitchBend')

  syncValues({
    rawAttackDefault,
    rawReleaseDefault
  })

  return {
    // State
    input,
    output,
    outputChannels,
    outputChannel,
    rawAttackDefault,
    rawReleaseDefault,
    multichannelToEquave,
    multichannelCenter,
    multichannelNumEquaves,
    multichannelEquavesDown,
    velocityOn,
    whiteMode,
    outputMode
  }
})
