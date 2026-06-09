<script setup lang="ts">
import { computed } from 'vue'
import { stepString } from 'moment-of-symmetry/core'
import { OCTAVE } from '@/constants'
import { Interval, ValBasis } from 'sonic-weave/interval'
import { TimeMonzo } from 'sonic-weave/monzo'
import { parseBasis, parseChord } from 'sonic-weave/parser'
import Modal from '@/components/ModalDialog.vue'
import ScaleLineInput from '@/components/ScaleLineInput.vue'
import { useModalStore } from '@/stores/modal'
import { gcd, lcm } from 'xen-dev-utils/fraction'
import { det, matmul, minor, transpose } from 'xen-dev-utils/matrix'
import type { FokkerBlockFactor } from '@/types'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['update:source', 'update:scaleName', 'cancel'])

interface ProductStep {
  letters: string
  numerator: number
  denominator: number
}

interface ChromaBlock {
  name: string
  source: string
  scaleSize: number
  preview: string
}

const STEP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const modal = useModalStore()

function safeInteger(value: number, fallback: number, min = 0, max = 1000) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(numericValue)))
}

function adjugate(matrix: number[][]) {
  return transpose(
    matrix.map((row, rowIndex) =>
      row.map((_, columnIndex) => {
        const cofactor = det(minor(matrix, rowIndex, columnIndex))
        return (rowIndex + columnIndex) % 2 ? -cofactor : cofactor
      })
    )
  )
}

function subgroupVectorToMonzo(vector: number[], basis: ValBasis) {
  let result = basis.value[0].pow(0)
  vector.forEach((exponent, index) => {
    result = result.mul(basis.value[index].pow(exponent))
  })
  if (result instanceof TimeMonzo) {
    return result
  }
  throw new Error('Unable to construct a subgroup monzo.')
}

function significantComponents(monzo: TimeMonzo) {
  if (!monzo.residual.isUnity()) {
    return monzo.numberOfComponents
  }
  let result = monzo.primeExponents.length
  while (result && !monzo.primeExponents[result - 1].n) {
    result -= 1
  }
  return result
}

function inferBasis(chromas: TimeMonzo[], equave: TimeMonzo) {
  const numberOfComponents = Math.max(
    significantComponents(equave),
    ...chromas.map((chroma) => significantComponents(chroma))
  )
  return new ValBasis(numberOfComponents)
}

function vectorKey(vector: number[], adjugateMatrix: number[][], determinant_: number) {
  return matmul(adjugateMatrix, vector)
    .map((coordinate) => ((coordinate % determinant_) + determinant_) % determinant_)
    .join(',')
}

function enumerateVectors(dimensions: number, radius: number) {
  const result: number[][] = []
  const current = Array(dimensions).fill(0)

  function visit(index: number) {
    if (index === dimensions) {
      if (current.some((coordinate) => Math.abs(coordinate) === radius)) {
        result.push([...current])
      }
      return
    }
    for (let coordinate = -radius; coordinate <= radius; ++coordinate) {
      current[index] = coordinate
      visit(index + 1)
    }
  }

  if (radius === 0) {
    return [current]
  }
  visit(0)
  return result
}

const scaleSize = computed(() => safeInteger(modal.fokkerBlockScaleSize, 7, 2))
const rank = computed(() => modal.fokkerBlockFactors.length + 1)
const activeFactor = computed(() => modal.fokkerBlockFactors[modal.fokkerBlockActiveFactorIndex])

function factorName(index: number) {
  return `MOS ${index + 1}`
}

function factorPattern(factor: FokkerBlockFactor) {
  return `${safeLargeSteps(factor)}L${inferredSmallSteps(factor)}s`
}

function safeLargeSteps(factor: FokkerBlockFactor) {
  return safeInteger(factor.numberOfLargeSteps, 1, 1, scaleSize.value - 1)
}

function inferredSmallSteps(factor: FokkerBlockFactor) {
  return scaleSize.value - safeLargeSteps(factor)
}

function safeRotation(factor: FokkerBlockFactor) {
  const large = safeLargeSteps(factor)
  const small = inferredSmallSteps(factor)
  const periods = Math.abs(gcd(large, small))
  const upMax = scaleSize.value - periods
  return Math.floor(safeInteger(factor.rotation, 0, 0, upMax) / periods) * periods
}

function factorWord(factor: FokkerBlockFactor) {
  return [
    ...stepString(safeLargeSteps(factor), inferredSmallSteps(factor), {
      up: safeRotation(factor)
    })
  ]
}

function factorStepFractions(factor: FokkerBlockFactor) {
  const large = safeLargeSteps(factor)
  const small = inferredSmallSteps(factor)
  const largeSize = safeInteger(factor.sizeOfLargeStep, 1, 1)
  const smallSize = safeInteger(factor.sizeOfSmallStep, 1, 1)
  const total = large * largeSize + small * smallSize
  const sizes = factorWord(factor).map((letter) => (letter === 'L' ? largeSize : smallSize))
  return sizes.map((size) => ({ numerator: size, denominator: total }))
}

const productSteps = computed<ProductStep[]>(() => {
  const stepFractions = modal.fokkerBlockFactors.map(factorStepFractions)
  const commonDenominator = stepFractions
    .flat()
    .reduce((accumulator, fraction) => lcm(accumulator, fraction.denominator), 1)
  const denominator = commonDenominator * modal.fokkerBlockFactors.length

  return Array.from({ length: scaleSize.value }, (_, index) => {
    const numerator = stepFractions.reduce(
      (sum, factor) =>
        sum + factor[index].numerator * (commonDenominator / factor[index].denominator),
      0
    )
    const divisor = Math.abs(gcd(numerator, denominator))
    return {
      letters: modal.fokkerBlockFactors.map((factor) => factorWord(factor)[index]).join(''),
      numerator: numerator / divisor,
      denominator: denominator / divisor
    }
  })
})

const productSymbols = computed(() => {
  const symbols = new Map<string, string>()
  return productSteps.value.map((step) => {
    if (!symbols.has(step.letters)) {
      symbols.set(step.letters, STEP_LETTERS[symbols.size] ?? `x${symbols.size + 1}`)
    }
    return symbols.get(step.letters)!
  })
})

const productWord = computed(() => productSymbols.value.join(''))

const hostEdo = computed(() =>
  productSteps.value.reduce((accumulator, step) => lcm(accumulator, step.denominator), 1)
)

const symbolStepMap = computed(() => {
  const result = new Map<string, { letters: string; steps: number }>()
  productSymbols.value.forEach((symbol, index) => {
    const step = productSteps.value[index]
    result.set(symbol, {
      letters: step.letters,
      steps: step.numerator * (hostEdo.value / step.denominator)
    })
  })
  return result
})

const preview = computed(() =>
  [...symbolStepMap.value.entries()]
    .map(([symbol, step]) => `${symbol} (${step.letters}): ${step.steps}/${hostEdo.value}`)
    .join(', ')
)

const chromaBlock = computed<ChromaBlock | null>(() => {
  const chromaIntervals = parseChord(modal.fokkerBlockChromasString)
  const chromas = chromaIntervals.map((interval) => {
    if (!(interval.value instanceof TimeMonzo)) {
      throw new Error(`${interval.toString()} is not a rational subgroup interval.`)
    }
    return interval.value
  })
  if (!chromas.length) {
    throw new Error('At least one chroma is required.')
  }
  if (!(modal.equave.value instanceof TimeMonzo)) {
    throw new Error('The equave must be a rational subgroup interval.')
  }

  const basis = modal.fokkerBlockSubgroupString.trim()
    ? parseBasis(modal.fokkerBlockSubgroupString)
    : inferBasis(chromas, modal.equave.value)
  const dimensions = basis.size
  if (chromas.length !== dimensions - 1) {
    throw new Error(
      `Expected ${dimensions - 1} chroma${dimensions === 2 ? '' : 's'} for a rank-${dimensions} subgroup.`
    )
  }

  const equaveVector = basis.toSubgroupMonzo(modal.equave.value)
  const chromaVectors = chromas.map((chroma) => basis.toSubgroupMonzo(chroma))
  const matrix = Array.from({ length: dimensions }, (_, row) => [
    equaveVector[row],
    ...chromaVectors.map((vector) => vector[row])
  ])
  const determinant_ = Math.abs(det(matrix))
  if (!determinant_) {
    throw new Error('The chromas and equave do not span a full-rank periodicity block.')
  }
  if (determinant_ > 2000) {
    throw new Error('Fokker blocks above 2000 notes are not supported here.')
  }

  const adjugateMatrix = adjugate(matrix)
  const representatives = new Map<string, TimeMonzo>()
  const maxRadius = Math.max(3, Math.min(8, determinant_))
  for (let radius = 0; radius <= maxRadius && representatives.size < determinant_; ++radius) {
    for (const vector of enumerateVectors(dimensions, radius)) {
      const key = vectorKey(vector, adjugateMatrix, determinant_)
      if (representatives.has(key)) {
        continue
      }
      representatives.set(
        key,
        subgroupVectorToMonzo(vector, basis).reduce(modal.equave.value) as TimeMonzo
      )
      if (representatives.size === determinant_) {
        break
      }
    }
  }
  if (representatives.size !== determinant_) {
    throw new Error('Unable to enumerate lattice representatives for this Fokker block.')
  }

  const unity = modal.equave.value.pow(0) as TimeMonzo
  const notes = [...representatives.values()]
    .filter((note) => !note.equals(unity))
    .sort((a, b) => a.compare(b))
  notes.push(modal.equave.value)
  const source = notes.map((note) => new Interval(note, 'linear').toString()).join('\n') + '\n'
  return {
    name: `Fokker block from ${chromaIntervals.map((interval) => interval.toString()).join(', ')}`,
    source,
    scaleSize: determinant_,
    preview: notes.map((note) => new Interval(note, 'linear').toString()).join(', ')
  }
})

const chromaError = computed(() => {
  try {
    void chromaBlock.value
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : `${error}`
  }
})

function selectFactor(index: number) {
  modal.fokkerBlockActiveFactorIndex = index
}

function removeFactor(index: number) {
  modal.removeFokkerBlockFactor(index)
}

function projectorString() {
  return modal.equave.compare(OCTAVE) ? `<${modal.equave.toString()}>` : ''
}

function generate(expand = true) {
  if (modal.fokkerBlockMethod === 'chromas') {
    if (chromaError.value || !chromaBlock.value) {
      return
    }
    emit('update:scaleName', chromaBlock.value.name)
    if (expand) {
      emit('update:source', chromaBlock.value.source)
    } else {
      emit(
        'update:source',
        `(* Chromas: ${modal.fokkerBlockChromasString}${
          modal.fokkerBlockSubgroupString.trim()
            ? `; subgroup: ${modal.fokkerBlockSubgroupString}`
            : ''
        } *)\n${chromaBlock.value.source}`
      )
    }
    return
  }

  const projector = projectorString()
  let source: string

  if (expand) {
    const sourceLines: string[] = []
    let degree = 0
    productSymbols.value.forEach((symbol) => {
      degree += symbolStepMap.value.get(symbol)?.steps ?? 0
      sourceLines.push(`${degree}\\${hostEdo.value}${projector}`)
    })
    source = `${sourceLines.join('\n')}\n`
  } else {
    const steps = [...symbolStepMap.value.entries()]
      .map(([symbol, step]) => `${symbol}: ${step.steps}\\${hostEdo.value}${projector}`)
      .join(', ')
    source = `realizeWord("${productWord.value}", #{${steps}})`
  }

  emit('update:scaleName', `Rank-${rank.value} Fokker block ${productWord.value}`)
  emit('update:source', source)
}
</script>

<template>
  <Modal :show="show" @confirm="generate" @cancel="$emit('cancel')">
    <template #header>
      <h2>Generate Fokker block</h2>
    </template>
    <template #body>
      <div class="factor-tabs method-tabs">
        <button
          :class="{ active: modal.fokkerBlockMethod === 'product' }"
          @click="modal.fokkerBlockMethod = 'product'"
        >
          MOS product
        </button>
        <button
          :class="{ active: modal.fokkerBlockMethod === 'chromas' }"
          @click="modal.fokkerBlockMethod = 'chromas'"
        >
          Chromas
        </button>
      </div>

      <div v-show="modal.fokkerBlockMethod === 'product'" class="control-group">
        <p>
          Build a rank-{{ rank }} Fokker block as a step-pattern product: choose a shared scale
          size, configure two or more MOS factors, rotate each mode or dome, then average matching
          steps.
        </p>
        <div class="control">
          <label for="fokker-scale-size">Scale size</label>
          <input
            id="fokker-scale-size"
            type="number"
            min="2"
            max="1000"
            v-model.number="modal.fokkerBlockScaleSize"
          />
        </div>
        <div class="control">
          <label for="fokker-equave">Equave</label>
          <ScaleLineInput
            id="fokker-equave"
            v-model="modal.equaveString"
            :defaultValue="OCTAVE"
            @update:value="modal.equave = $event"
          />
        </div>
      </div>

      <div v-show="modal.fokkerBlockMethod === 'product'" class="factor-tabs">
        <button
          v-for="(factor, index) in modal.fokkerBlockFactors"
          :key="factor.id"
          :class="{ active: index === modal.fokkerBlockActiveFactorIndex }"
          @click="selectFactor(index)"
        >
          {{ factorPattern(factor) }}
        </button>
        <button @click="modal.addFokkerBlockFactor">+</button>
      </div>

      <div
        v-if="activeFactor"
        v-show="modal.fokkerBlockMethod === 'product'"
        class="control-group factor-panel"
      >
        <div class="control">
          <label :for="`fokker-large-${activeFactor.id}`">
            Large steps ({{ inferredSmallSteps(activeFactor) }} small)
          </label>
          <input
            :id="`fokker-large-${activeFactor.id}`"
            type="number"
            min="1"
            :max="scaleSize - 1"
            v-model.number="activeFactor.numberOfLargeSteps"
          />
        </div>
        <div class="control">
          <label :for="`fokker-large-size-${activeFactor.id}`">Large step size</label>
          <input
            :id="`fokker-large-size-${activeFactor.id}`"
            type="number"
            min="1"
            v-model.number="activeFactor.sizeOfLargeStep"
          />
        </div>
        <div class="control">
          <label :for="`fokker-small-size-${activeFactor.id}`">Small step size</label>
          <input
            :id="`fokker-small-size-${activeFactor.id}`"
            type="number"
            min="1"
            v-model.number="activeFactor.sizeOfSmallStep"
          />
        </div>
        <div class="control">
          <label :for="`fokker-rotation-${activeFactor.id}`">Mode / dome rotation</label>
          <input
            :id="`fokker-rotation-${activeFactor.id}`"
            type="number"
            min="0"
            :max="Math.max(0, scaleSize - 1)"
            v-model.number="activeFactor.rotation"
          />
        </div>
        <div class="control">
          <label>Word for {{ factorName(modal.fokkerBlockActiveFactorIndex) }}</label>
          <output>{{ factorWord(activeFactor).join('') }}</output>
        </div>
        <button
          v-if="modal.fokkerBlockFactors.length > 2"
          @click="removeFactor(modal.fokkerBlockActiveFactorIndex)"
        >
          Remove {{ factorName(modal.fokkerBlockActiveFactorIndex) }}
        </button>
      </div>

      <div v-show="modal.fokkerBlockMethod === 'product'" class="control-group">
        <p>
          Product word: <strong>{{ productWord }}</strong>
        </p>
        <p>Host EDO: {{ hostEdo }}</p>
        <p v-if="preview">Averaged steps: {{ preview }}</p>
      </div>

      <div v-show="modal.fokkerBlockMethod === 'chromas'" class="control-group">
        <p>
          Build a Fokker block from a list of chromas. The optional subgroup determines what counts
          as an integer lattice point for exotic bases.
        </p>
        <div class="control">
          <label for="fokker-chromas">Chromas</label>
          <textarea
            id="fokker-chromas"
            rows="4"
            placeholder="25/24, 81/80"
            v-model="modal.fokkerBlockChromasString"
          ></textarea>
        </div>
        <div class="control">
          <label for="fokker-subgroup">Subgroup / prime limit (optional)</label>
          <input
            id="fokker-subgroup"
            type="text"
            placeholder="2.3.5"
            v-model="modal.fokkerBlockSubgroupString"
          />
        </div>
        <div class="control">
          <label for="fokker-chroma-equave">Equave</label>
          <ScaleLineInput
            id="fokker-chroma-equave"
            v-model="modal.equaveString"
            :defaultValue="OCTAVE"
            @update:value="modal.equave = $event"
          />
        </div>
        <p v-if="chromaError">{{ chromaError }}</p>
        <template v-else-if="chromaBlock">
          <p>Scale size: {{ chromaBlock.scaleSize }}</p>
          <p>Notes: {{ chromaBlock.preview }}</p>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="btn-group">
        <button @click="() => generate(true)">OK</button>
        <button @click="$emit('cancel')">Cancel</button>
        <button @click="() => generate(false)">Raw</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.factor-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.factor-tabs button {
  flex: 0 0 auto;
}

.factor-tabs button.active {
  color: var(--color-background);
  background-color: var(--color-text);
}

output {
  align-self: center;
}

@media screen and (min-width: 600px) {
  .modal-mask :deep(.modal-container) {
    min-width: 40rem;
    max-width: 41rem;
  }
}
</style>
