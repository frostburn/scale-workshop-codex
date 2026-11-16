<script setup lang="ts">
import { computed, watch } from 'vue'
import Modal from '@/components/ModalDialog.vue'
import { useTemperStore } from '@/stores/tempering'
import { useScaleStore } from '@/stores/scale'
import { parseAST } from 'sonic-weave/parser'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['done', 'cancel'])

const temper = useTemperStore()
const scale = useScaleStore()

watch(
  () => temper.edoAvailable,
  (newValue) => {
    if (!newValue) {
      temper.convertToEdoSteps = false
    }
  }
)

const useEdoSteps = computed(
  () => temper.method === 'vals' && temper.edoAvailable && temper.convertToEdoSteps
)

const validationError = computed(() => {
  if (temper.method !== 'mapping') return temper.error
  try {
    if (!temper.mappingString.trim()) return 'Enter a mapping for the primes, in cents.'
    const ast = parseAST(`PrimeMapping(${temper.mappingString})`)
    const statement = ast.body[0]
    if (ast.body.length !== 1 || statement.type !== 'ExpressionStatement') {
      return 'Enter a comma-separated list of prime sizes.'
    }
    const { visitor } = scale.getUserScopeVisitor()
    visitor.createExpressionVisitor().visit(statement.expression)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
})

const methodHelp = computed(
  () =>
    ({
      mapping: 'Enter the sizes of 2, 3, 5, … in cents. Example: 1200., 1900., 2800.',
      vals: 'Enter one or more vals separated by &. Example: 12 & 19. Each val maps primes to equal-division steps.',
      commas: 'Enter ratios to temper to unison, separated by commas. Example: 81/80, 128/125.'
    })[temper.method]
)

const optimizationHelp = computed(
  () =>
    ({
      TE: 'Balance relative errors across the subgroup. The equave may change size.',
      POTE: 'Optimize relative errors, then rescale the mapping to keep the equave pure.',
      CTE: 'Give the equave extra weight during optimization, then keep it pure.'
    })[temper.optimizationScheme]
)

function modify(expand = true) {
  if (validationError.value) return
  if (temper.method === 'vals') {
    if (useEdoSteps.value) {
      scale.sourceText += `\n${temper.vals[0].toString()}`
    } else {
      scale.sourceText += `\n(* vals = ${temper.valsString} *)`
      scale.sourceText += `\n${temper.valsTemperament.toString()}`
    }
  } else if (temper.method === 'commas') {
    scale.sourceText += `\n(* commas = ${temper.commasString} *)`
    scale.sourceText += `\n${temper.commasTemperament.toString()}`
  }
  if (temper.method === 'mapping') {
    scale.sourceText += `\nPrimeMapping(${temper.mappingString})`
  } else if (!useEdoSteps.value) {
    scale.sourceText += `\ncents(£, ${scale.centsFractionDigits})`
  }
  if (expand) {
    const { visitor, defaults } = scale.getUserScopeVisitor()
    scale.sourceText = visitor.expand(defaults)
  }
  scale.computeScale()
  emit('done')
}
</script>

<template>
  <Modal class="temper-scale" :show="show" @confirm="modify" @cancel="$emit('cancel')">
    <template #header>
      <h2>Temper scale</h2>
    </template>
    <template #body>
      <p>Choose how to map your scale’s intervals to tempered pitches.</p>
      <div class="control-group">
        <div class="control radio-group" role="group" aria-labelledby="temper-method-label">
          <label id="temper-method-label">Method</label>
          <span>
            <input
              type="radio"
              name="temper-method"
              id="method-mapping"
              value="mapping"
              v-model="temper.method"
            />
            <label for="method-mapping">Mapping</label>
          </span>
          <span>
            <input
              type="radio"
              name="temper-method"
              id="method-vals"
              value="vals"
              v-model="temper.method"
            />
            <label for="method-vals">Vals</label>
          </span>

          <span>
            <input
              type="radio"
              name="temper-method"
              id="method-commas"
              value="commas"
              v-model="temper.method"
            />
            <label for="method-commas">Comma list</label>
          </span>
        </div>

        <p id="temper-method-help" class="help">{{ methodHelp }}</p>
        <div class="control" v-show="temper.method === 'mapping'">
          <label for="mapping">Mapping</label>
          <textarea
            id="mapping"
            aria-describedby="temper-method-help"
            v-model="temper.mappingString"
          ></textarea>
        </div>

        <div class="control" v-show="temper.method === 'vals'">
          <label for="vals">Vals</label>
          <input
            type="text"
            id="vals"
            placeholder="12 & 19"
            aria-describedby="temper-method-help"
            v-model="temper.valsString"
          />
        </div>
        <div class="control" v-show="temper.method === 'vals'">
          <div class="radio-group">
            <span>
              <input
                type="checkbox"
                id="edo-steps"
                :disabled="!temper.edoAvailable"
                v-model="temper.convertToEdoSteps"
              />
              <label for="edo-steps" :class="{ disabled: !temper.edoAvailable }">
                Output equal-division steps</label
              >
            </span>
          </div>
        </div>

        <p v-if="temper.method === 'vals'" class="help">
          Available for a single rank-1 val. Otherwise, output is in cents.
        </p>
        <div class="control" v-show="temper.method === 'commas'">
          <label for="commas">Comma list</label>
          <input
            type="text"
            id="commas"
            placeholder="81/80, 128/125"
            aria-describedby="temper-method-help"
            v-model="temper.commasString"
          />
        </div>

        <div class="control" v-show="temper.method === 'vals' || temper.method === 'commas'">
          <label for="subgroup">Subgroup / Prime limit</label>
          <input
            type="text"
            id="subgroup"
            :placeholder="temper.method === 'vals' ? '2.3.5' : ''"
            v-model="temper.subgroupString"
          />
        </div>
        <p v-if="temper.method !== 'mapping'" class="help">
          Optional: use a prime limit such as 5, or a subgroup such as 2.3.5. Leave blank to infer
          it from the input.
        </p>
      </div>
      <div class="control-group" v-show="temper.method === 'vals' || temper.method === 'commas'">
        <div class="control radio-group" role="group" aria-labelledby="temper-optimization-label">
          <label id="temper-optimization-label">Optimization</label>
          <span>
            <input
              type="radio"
              name="temper-optimization"
              id="tempering-TE"
              value="TE"
              :disabled="useEdoSteps"
              v-model="temper.optimizationScheme"
            />
            <label for="tempering-TE">TE</label>
          </span>

          <span>
            <input
              type="radio"
              name="temper-optimization"
              id="tempering-POTE"
              value="POTE"
              :disabled="useEdoSteps"
              v-model="temper.optimizationScheme"
            />
            <label for="tempering-POTE">POTE</label>
          </span>

          <span>
            <input
              type="radio"
              name="temper-optimization"
              id="tempering-CTE"
              value="CTE"
              :disabled="useEdoSteps"
              v-model="temper.optimizationScheme"
            />
            <label for="tempering-CTE">CTE</label>
          </span>
        </div>

        <p class="help">
          {{
            useEdoSteps
              ? 'Optimization and weights are unused for equal-division output.'
              : optimizationHelp
          }}
        </p>
        <details
          :open="temper.showAdvanced"
          @toggle="temper.showAdvanced = ($event.target as HTMLDetailsElement).open"
        >
          <summary>Advanced options</summary>
          <div class="control">
            <label for="weights">Weights for {{ temper.subgroupLabel }}</label>
            <textarea
              id="weights"
              :disabled="useEdoSteps"
              v-model="temper.weightsString"
            ></textarea>
          </div>
          <p class="help">
            One optional importance weight per subgroup element, in the order shown.
          </p>
        </details>
      </div>
      <div v-if="validationError" class="validation-error">
        <p role="alert">
          Check the
          {{
            temper.method === 'mapping'
              ? 'mapping'
              : temper.method === 'vals'
                ? 'vals and subgroup'
                : 'comma list and subgroup'
          }}. {{ methodHelp }}
        </p>
        <details>
          <summary>Error details</summary>
          <p>{{ validationError }}</p>
        </details>
      </div>
    </template>
    <template #footer>
      <div class="btn-group">
        <button @click="modify(true)" :disabled="!!validationError">Apply temperament</button>
        <button @click="$emit('cancel')">Cancel</button>
        <button @click="modify(false)" :disabled="!!validationError">Apply as code</button>
      </div>
      <p class="help">
        Apply as code keeps the tempering instructions editable in the scale editor.
      </p>
    </template>
  </Modal>
</template>

<style scoped>
.temper-scale :deep(.modal-container) {
  width: min(34rem, calc(100vw - 2rem));
  min-width: 0;
  max-width: 34rem;
}
.help {
  font-size: 0.9em;
  color: var(--color-text-mute);
  margin: 0.5rem 0;
}
.disabled {
  color: var(--color-text-mute);
}
summary {
  cursor: pointer;
  font-weight: bold;
}
.validation-error {
  color: var(--color-error, #b03000);
  overflow-wrap: anywhere;
  margin-bottom: 1rem;
}
.validation-error p {
  height: auto;
  overflow: visible;
}
</style>
