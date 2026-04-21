<script setup lang="ts">
import grammar from '@/assets/sonic-weave.tmLanguage.json'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  id?: string
  rows?: number
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  input: []
}>()

const editor = ref<HTMLTextAreaElement | null>(null)
const backdrop = ref<HTMLPreElement | null>(null)

const repository = grammar.repository as Record<string, { patterns: Array<{ match?: string }> }>

const rules = [
  { regex: /\(\*[\s\S]*?\*\)/g, className: 'token-comment' },
  ...repository.strings.patterns.map((pattern) => ({ regex: new RegExp(pattern.match ?? '"(?:\\\\.|[^"\\\\])*"', 'g'), className: 'token-string' })),
  ...repository.templateArguments.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-template-argument' })),
  ...repository.colors.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-color' })),
  ...repository.units.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-unit' })),
  ...repository.constants.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-constant' })),
  ...repository.keywords.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-keyword' })),
  ...repository.numbers.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-number' })),
  ...repository.operators.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-operator' })),
  ...repository.punctuation.patterns.map((pattern) => ({ regex: new RegExp(pattern.match!, 'g'), className: 'token-punctuation' })),
]

const highlightedHtml = computed(() => {
  const raw = props.modelValue
  if (!raw) {
    return '&nbsp;'
  }

  const escaped = raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  const segments = [{ start: 0, end: escaped.length, className: '' }]

  for (const rule of rules) {
    const matches = [...escaped.matchAll(rule.regex)]
    for (const match of matches) {
      if (typeof match.index !== 'number') {
        continue
      }
      const start = match.index
      const end = start + match[0].length
      if (start === end) {
        continue
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        if (segment.className || end <= segment.start || start >= segment.end) {
          continue
        }
        const nextSegments = []
        if (segment.start < start) {
          nextSegments.push({ start: segment.start, end: start, className: '' })
        }
        nextSegments.push({ start, end, className: rule.className })
        if (end < segment.end) {
          nextSegments.push({ start: end, end: segment.end, className: '' })
        }
        segments.splice(i, 1, ...nextSegments)
        i += nextSegments.length - 1
      }
    }
  }

  return segments
    .map((segment) => {
      const text = escaped.slice(segment.start, segment.end)
      if (!segment.className) {
        return text
      }
      return `<span class="${segment.className}">${text}</span>`
    })
    .join('')
    .replaceAll('\n', '<br>')
})

function syncScroll() {
  if (!editor.value || !backdrop.value) {
    return
  }
  backdrop.value.scrollTop = editor.value.scrollTop
  backdrop.value.scrollLeft = editor.value.scrollLeft
}

watch(
  () => props.modelValue,
  () => {
    syncScroll()
  },
)

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input')
  syncScroll()
}

function insertTextAtSelection(text: string) {
  if (!editor.value) {
    return
  }

  const start = editor.value.selectionStart
  const end = editor.value.selectionEnd
  const nextValue = props.modelValue.slice(0, start) + text + props.modelValue.slice(end)
  emit('update:modelValue', nextValue)
  emit('input')

  requestAnimationFrame(() => {
    if (!editor.value) {
      return
    }
    const cursor = start + text.length
    editor.value.focus()
    editor.value.setSelectionRange(cursor, cursor)
  })
}

function focus() {
  editor.value?.focus()
}

defineExpose({ focus, insertTextAtSelection })
</script>

<template>
  <div class="source-highlighter">
    <pre ref="backdrop" class="highlight-layer" aria-hidden="true" v-html="highlightedHtml"></pre>
    <textarea
      ref="editor"
      class="editor-layer"
      :id="id"
      :rows="rows ?? 20"
      :value="modelValue"
      :aria-label="ariaLabel"
      spellcheck="false"
      @input="handleInput"
      @scroll="syncScroll"
      @focus="$emit('focus')"
    ></textarea>
  </div>
</template>

<style scoped>
.source-highlighter {
  position: relative;
  width: 100%;
}

.highlight-layer,
.editor-layer {
  margin: 0;
  width: 100%;
  min-height: 100%;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  line-height: var(--base-line-height);
  white-space: pre;
  tab-size: 2;
  overflow: auto;
  box-sizing: border-box;
}

.highlight-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  background-color: var(--color-background-soft);
}

.editor-layer {
  position: relative;
  background: transparent;
  color: transparent;
  caret-color: var(--color-text);
  resize: vertical;
}

:deep(.token-comment) {
  color: #6a9955;
}
:deep(.token-string) {
  color: #ce9178;
}
:deep(.token-template-argument) {
  color: #4ec9b0;
}
:deep(.token-color) {
  color: #dcdcaa;
}
:deep(.token-unit) {
  color: #c586c0;
}
:deep(.token-constant) {
  color: #569cd6;
}
:deep(.token-keyword) {
  color: #c586c0;
}
:deep(.token-number) {
  color: #b5cea8;
}
:deep(.token-operator),
:deep(.token-punctuation) {
  color: #d4d4d4;
}
</style>
