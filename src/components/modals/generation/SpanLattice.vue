<script setup lang="ts">
import { Interval, intervalValueAs } from 'sonic-weave/interval'
import { ref, watch } from 'vue'
import Modal from '@/components/ModalDialog.vue'
import ScaleLineInput from '@/components/ScaleLineInput.vue'
import { FIFTH, OCTAVE } from '@/constants'
import { useLatticeStore } from '@/stores/tempering'
import { arrayToString, centString, expandCode, parseInterval } from '@/utils'
import { mmod } from 'xen-dev-utils/fraction'
import { useScaleStore } from '@/stores/scale'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['update:source', 'update:scaleName', 'cancel'])

const lattice = useLatticeStore()
const scale = useScaleStore()

const generatorStrings = ref(lattice.basis.map((generator) => generator.toString()))
// Preserve input drafts when writing parsed values back to the shared basis.
let editedBasisString = lattice.basisString
const valsInput = ref<HTMLInputElement | null>(null)
const commasInput = ref<HTMLInputElement | null>(null)
const subgroupInput = ref<HTMLInputElement | null>(null)

watch(
  () => lattice.basisString,
  (newBasisString) => {
    if (newBasisString !== editedBasisString) {
      generatorStrings.value = lattice.basis.map((generator) => generator.toString())
    }
    editedBasisString = newBasisString
  }
)

function updateGenerator(index: number, generator: Interval) {
  const basis = [...lattice.basis]
  basis[index] = generator
  editedBasisString = basis.map((value) => value.toString()).join(' ')
  lattice.basisString = editedBasisString
}

function addGenerator() {
  lattice.basisString = [...lattice.basis, FIFTH].map((value) => value.toString()).join(' ')
}

function removeGenerator(index: number) {
  const basis = [...lattice.basis]
  basis.splice(index, 1)
  lattice.ups.splice(index, 1)
  lattice.downs.splice(index, 1)
  lattice.basisString = basis.map((value) => value.toString()).join(' ')
}

function calculateGenerators() {
  const generators = lattice.temperament.generators
  if (!generators.length) {
    return
  }
  if (lattice.method === 'vals') {
    lattice.comment = `vals = ${lattice.valsString}`
  } else if (lattice.method === 'commas') {
    lattice.comment = `commas = ${lattice.commasString}`
  } else {
    lattice.comment = ''
  }
  const period = generators.shift()!
  for (let i = 0; i < generators.length; ++i) {
    generators[i] = mmod(generators[i], period)
  }

  lattice.equaveString = centString(period, scale.centsFractionDigits)
  lattice.equave = parseInterval(lattice.equaveString)

  lattice.basisString = generators.map((g) => centString(g, scale.centsFractionDigits)).join(' ')
  lattice.method = 'generators'
}

function updateUps(index: number, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  lattice.ups[index] = value
}

function updateDowns(index: number, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  lattice.downs[index] = value
}

function flip(index: number) {
  const b = lattice.basis[index]
  const domain = b.domain
  const generator = b.value.inverse().reduce(lattice.equave.value)
  const node = intervalValueAs(generator, b.node)
  const newBasis = [...lattice.basis]
  newBasis.splice(index, 1, new Interval(generator, domain, 0, node, b))
  lattice.basisString = newBasis.map((gen) => gen.toString()).join(' ')
}

function generate(expand = true) {
  let source = ''
  if (lattice.comment.length) {
    source = `(* ${lattice.comment} *)\n`
  }
  source += `parallelotope(${arrayToString(lattice.basis)}, ${arrayToString(lattice.ups)}, ${arrayToString(lattice.downs)}, ${lattice.equave.toString()})`
  let name = `Parallelotope (${lattice.dimensions} of ${lattice.basisString}`
  if (lattice.basis.length === 0) {
    name = 'Parallelotope (unison'
  }
  if (!lattice.equave.equals(OCTAVE)) {
    name += ` over ${lattice.equave.toString()}`
  }
  name += ')'
  emit('update:scaleName', name)
  if (expand) {
    emit('update:source', expandCode(source))
  } else {
    emit('update:source', source)
  }
}
</script>

<template>
  <Modal :show="show" @confirm="generate" @cancel="$emit('cancel')">
    <template #header>
      <h2>Generate parallelotope</h2>
    </template>
    <template #body>
      <div class="control-group">
        <div class="control radio-group">
          <label>Method</label>
          <span>
            <input
              type="radio"
              id="method-generators"
              value="generators"
              v-model="lattice.method"
            />
            <label for="method-generators">Generators</label>
          </span>

          <span>
            <input type="radio" id="method-vals" value="vals" v-model="lattice.method" />
            <label for="method-vals">Vals</label>
          </span>

          <span>
            <input type="radio" id="method-commas" value="commas" v-model="lattice.method" />
            <label for="method-commas">Comma list</label>
          </span>
        </div>
        <div class="control-group" v-show="lattice.method === 'generators'">
          <fieldset v-for="(_, i) of generatorStrings" :key="i" class="generator-group">
            <legend>Generator {{ i + 1 }}</legend>
            <div class="control">
              <label :for="`generator-${i}`">Interval</label>
              <ScaleLineInput
                :id="`generator-${i}`"
                v-model="generatorStrings[i]"
                @update:value="updateGenerator(i, $event)"
                :defaultValue="lattice.basis[i] || FIFTH"
              />
              <button @click="flip(i)">Flip</button>
              <button @click="removeGenerator(i)">Remove</button>
            </div>
            <div class="control-group twin-controls">
              <div class="control">
                <label :for="`generator-up-${i}`">Up from 1/1</label>
                <input
                  :id="`generator-up-${i}`"
                  type="number"
                  min="0"
                  max="99"
                  :value="lattice.ups[i]"
                  @input="updateUps(i, $event)"
                />
              </div>
              <div class="control">
                <label :for="`generator-down-${i}`">Down from 1/1</label>
                <input
                  :id="`generator-down-${i}`"
                  type="number"
                  min="0"
                  max="99"
                  :value="lattice.downs[i]"
                  @input="updateDowns(i, $event)"
                />
              </div>
            </div>
          </fieldset>
          <button @click="addGenerator">Add generator</button>
          <div class="control">
            <label for="equave">Equave</label>
            <ScaleLineInput
              id="equave"
              @update:value="lattice.equave = $event"
              v-model="lattice.equaveString"
              :defaultValue="OCTAVE"
            />
          </div>
        </div>

        <div class="control" v-show="lattice.method === 'vals'">
          <label for="vals">Vals</label>
          <input
            ref="valsInput"
            type="text"
            id="vals"
            placeholder="8d & 12 & 19"
            v-model="lattice.valsString"
          />
        </div>

        <div class="control" v-show="lattice.method === 'commas'">
          <label for="commas">Comma list</label>
          <input
            ref="commasInput"
            type="text"
            id="commas"
            placeholder="225/224, 385/384"
            v-model="lattice.commasString"
          />
        </div>

        <div class="control" v-show="lattice.method === 'vals' || lattice.method === 'commas'">
          <label for="subgroup">Subgroup / Prime limit</label>
          <input
            ref="subgroupInput"
            type="text"
            id="subgroup"
            :placeholder="lattice.method === 'vals' ? '2.3.5.7' : ''"
            v-model="lattice.subgroupString"
          />
        </div>
      </div>
      <div class="control-group" v-show="lattice.method === 'vals' || lattice.method === 'commas'">
        <div class="control radio-group">
          <span>
            <input type="radio" id="tempering-TE" value="TE" v-model="lattice.optimizationScheme" />
            <label for="tempering-TE">TE</label>
          </span>

          <span>
            <input
              type="radio"
              id="tempering-POTE"
              value="POTE"
              v-model="lattice.optimizationScheme"
            />
            <label for="tempering-POTE">POTE</label>
          </span>

          <span>
            <input
              type="radio"
              id="tempering-CTE"
              value="CTE"
              v-model="lattice.optimizationScheme"
            />
            <label for="tempering-CTE">CTE</label>
          </span>
        </div>
        <p
          class="section"
          :class="{ open: lattice.showAdvanced }"
          @click="lattice.showAdvanced = !lattice.showAdvanced"
        >
          Advanced options
        </p>
        <div class="control" v-show="lattice.showAdvanced">
          <label for="weights">Weights for {{ lattice.subgroupLabel }}</label>
          <textarea id="weights" v-model="lattice.weightsString"></textarea>
        </div>
        <p class="warning">{{ lattice.error }}</p>
        <div class="control" v-show="lattice.method === 'vals' || lattice.method === 'commas'">
          <button @click="calculateGenerators" :disabled="!!lattice.error.length">
            Calculate generators
          </button>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="btn-group">
        <button @click="generate(true)" :disabled="lattice.method !== 'generators'">OK</button>
        <button @click="$emit('cancel')">Cancel</button>
        <button @click="generate(false)" :disabled="lattice.method !== 'generators'">Raw</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.generator-group {
  min-width: 0;
}

.generator-group input {
  min-width: 0;
  width: 0;
}

.generator-group .control-group {
  margin: 0.5rem 0 0;
}

p.warning {
  height: 3em;
  overflow-y: hidden;
}
</style>
