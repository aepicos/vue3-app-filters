<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { FILTERS, type FilterDef, type FilterChip, type AdvancedQuery, type FilterGroup } from '../data/filters'
import AdvancedFilterBuilder from './AdvancedFilterBuilder.vue'

const props = defineProps<{
  open: boolean
  anchorEl: HTMLElement | null
  currentFilters?: FilterChip[]
  currentAdvancedQuery?: AdvancedQuery | null
  startAdvanced?: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [chip: FilterChip]
  applyAdvanced: [query: AdvancedQuery]
}>()

// ── State ─────────────────────────────────────────────────────────────────────
const search = ref('')
const hoveredFilter = ref<FilterDef | null>(null)
const focusedFilterIdx = ref(-1)
const mode = ref<'browse' | 'value-select' | 'advanced'>('browse')
const pendingFilter = ref<FilterDef | null>(null)
const pendingOperator = ref('')
const textInput = ref('')
const popoverStyle = ref<Record<string, string>>({})
const popoverEl = ref<HTMLElement | null>(null)
const searchInputEl = ref<HTMLInputElement | null>(null)
const textInputEl = ref<HTMLInputElement | null>(null)

// ── Advanced query state ───────────────────────────────────────────────────────
const advancedInitialQuery = ref<AdvancedQuery>({ groupOperator: 'OR', groups: [] })
const advancedBuilderRef = ref<InstanceType<typeof AdvancedFilterBuilder> | null>(null)

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Convert simple FilterChips to AdvancedQuery by distributing OR-within-filterId
// into groups. E.g. [Team X, Team Y, Class A] →
//   Group1: Team X AND Class A  |OR|  Group2: Team Y AND Class A
function chipsToAdvancedQuery(chips: FilterChip[]): AdvancedQuery {
  if (chips.length === 0) return { groupOperator: 'OR', groups: [{ id: uid(), operator: 'AND', conditions: [] }] }

  // Group chips by filterId
  const byFilter = new Map<string, FilterChip[]>()
  for (const chip of chips) {
    const key = chip.filterId ?? chip.id
    if (!byFilter.has(key)) byFilter.set(key, [])
    byFilter.get(key)!.push(chip)
  }

  // Cartesian product across filter dimensions → one group per combination
  const dimensionArrays = Array.from(byFilter.values())
  const combinations: FilterChip[][] = dimensionArrays.reduce<FilterChip[][]>(
    (acc, dim) => acc.flatMap((combo) => dim.map((chip) => [...combo, chip])),
    [[]],
  )

  const groups: FilterGroup[] = combinations.map((combo) => ({
    id: uid(),
    operator: 'AND' as const,
    conditions: combo.map((chip) => ({
      id: uid(),
      filterId: chip.filterId ?? '',
      key: chip.key,
      operator: chip.operator,
      value: chip.value,
    })),
  }))

  return { groupOperator: 'OR', groups }
}

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    search.value = ''
    mode.value = 'browse'
    hoveredFilter.value = null
    pendingFilter.value = null
    pendingOperator.value = ''
    textInput.value = ''
    focusedFilterIdx.value = -1
    await nextTick()
    positionPopover()
    if (props.startAdvanced) {
      openAdvanced()
    } else {
      searchInputEl.value?.focus()
    }
  },
)

function positionPopover() {
  if (!props.anchorEl) return
  const rect = props.anchorEl.getBoundingClientRect()
  const isAdv = mode.value === 'advanced'
  const popoverWidth = isAdv ? 580 : 480
  let left = rect.left + window.scrollX
  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8
  }
  const top = rect.bottom + window.scrollY + 6
  const style: Record<string, string> = { top: `${top}px`, left: `${left}px` }
  if (isAdv) {
    // Set an explicit height so the CSS grid has a definite size to work with.
    // max-height alone doesn't give grid/flex children a definite height on
    // position:absolute elements, so the footer would get pushed off screen.
    const available = window.innerHeight - rect.bottom - 6 - 12
    style.height = `${Math.min(available, window.innerHeight * 0.85)}px`
  }
  popoverStyle.value = style
}

// ── Computed ──────────────────────────────────────────────────────────────────
const isSearchMode = computed(() => search.value.trim().length > 0)

// Ghost-text type-ahead: shown when the raw query is a case-insensitive prefix
// of a single matched enum value. Tab accepts — sets input to the full value.
interface GhostSuggestion { completion: string; fullValue: string }
const ghostSuggestion = computed<GhostSuggestion | null>(() => {
  if (nlpChips.value.length !== 1) return null
  const chip = nlpChips.value[0]
  if (chip.filter.type !== 'enum') return null
  const q = search.value // raw, preserve casing for transparent-text width match
  if (!q) return null
  if (!chip.value.toLowerCase().startsWith(q.toLowerCase())) return null
  const completion = chip.value.slice(q.length)
  if (!completion) return null
  return { completion, fullValue: chip.value }
})

const browseFilters = computed(() => {
  if (!isSearchMode.value) return FILTERS
  const q = search.value.toLowerCase()
  return FILTERS.filter((f) => f.label.toLowerCase().includes(q))
})

interface SearchGroup {
  filter: FilterDef
  values: string[]
}

const searchGroups = computed<SearchGroup[]>(() => {
  if (!isSearchMode.value) return []
  const q = search.value.toLowerCase()
  const groups: SearchGroup[] = []
  for (const f of FILTERS) {
    const labelMatch = f.label.toLowerCase().includes(q)
    const valueMatches = (f.values ?? []).filter((v) => v.toLowerCase().includes(q))
    if (labelMatch || valueMatches.length) {
      groups.push({ filter: f, values: labelMatch ? f.values ?? [] : valueMatches })
    }
  }
  return groups
})

// NLP helpers ─────────────────────────────────────────────────────────────────
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1)
  return word
}

function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/['".,!?:;()/\\]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map(stem),
  )
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'for', 'with', 'by', 'to',
  'me', 'my', 'all', 'show', 'give', 'get', 'find', 'where', 'are', 'is',
  'not', 'that', 'have', 'has', 'had', 'be', 'been', 'will', 'would',
  'can', 'could', 'should', 'want', 'need', 'like', 'just', 'only',
  'from', 'about', 'into', 'through', 'during', 'before', 'after', 'which',
  'owned', 'belonging', 'assigned', 'asset', 'assets',
])

// Split query into "phrase clusters" — runs of consecutive non-stop tokens.
// Stop words and hyphens act as boundaries between phrases.
// "class a assets owned by trimdon" → [["class"], ["trimdon"]]
function queryPhrases(query: string): string[][] {
  const rawTokens = query
    .toLowerCase()
    .replace(/['".,!?:;()/\\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
  const phrases: string[][] = []
  let current: string[] = []
  for (const token of rawTokens) {
    const s = stem(token)
    if (STOP_WORDS.has(token) || STOP_WORDS.has(s) || token.length <= 1) {
      if (current.length > 0) { phrases.push(current); current = [] }
    } else {
      current.push(s)
    }
  }
  if (current.length > 0) phrases.push(current)
  return phrases
}

// A phrase matches a filter value when EVERY phrase token prefix-matches
// at least one token from the value. This means "trimdon" matches
// "Trimdon Grange Explosion" but "trimdon borroughs" does not.
function phraseMatchesValue(phraseTokens: string[], vTokens: string[]): boolean {
  return (
    phraseTokens.length > 0 &&
    phraseTokens.every((pt) => vTokens.some((vt) => vt.startsWith(pt)))
  )
}

const isNlp = computed(() => isSearchMode.value)

interface NlpChip { filter: FilterDef; value: string; operator?: string }

const nlpChips = computed<NlpChip[]>(() => {
  if (!isNlp.value) return []
  const allQueryTokens = tokenize(search.value)
  const phrases = queryPhrases(search.value)
  const q = search.value.toLowerCase()
  const results: NlpChip[] = []
  const used = new Set<string>()

  // ── Number filters ("risk score higher than 650") ──────────────────────────
  const numMatch = search.value.match(/\b(\d+)\b/)
  if (numMatch) {
    const numVal = numMatch[1]
    const qStems = search.value
      .toLowerCase()
      .replace(/['".,!?:;()/\\-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map(stem)
    for (const filter of FILTERS) {
      if (filter.type !== 'number' || used.has(filter.id)) continue
      // At least one label token must prefix-match a query token (or vice-versa)
      const labelTokens = filter.label.toLowerCase().split(/\s+/).map(stem)
      const labelHit = labelTokens.some((lt) =>
        qStems.some((qt) => qt.startsWith(lt) || lt.startsWith(qt)),
      )
      if (!labelHit) continue
      // Map natural language to operator symbol
      let op = filter.operators[0]
      if (/higher than|more than|greater than|above|over/.test(q)) op = '>'
      else if (/lower than|less than|below|under/.test(q)) op = '<'
      else if (/equals?(\s+to)?|exactly/.test(q)) op = '='
      if (!filter.operators.includes(op)) op = filter.operators[0]
      results.push({ filter, value: numVal, operator: op })
      used.add(filter.id)
    }
  }

  // ── Enum filters ───────────────────────────────────────────────────────────
  for (const filter of FILTERS) {
    if (filter.type !== 'enum' || !filter.values || used.has(filter.id)) continue
    for (const value of filter.values) {
      let matched = false
      if (value.length === 1) {
        const filterKeyword = stem(filter.label.split(' ').pop()!.toLowerCase())
        matched = allQueryTokens.has(filterKeyword) && allQueryTokens.has(value.toLowerCase())
      } else {
        const vTokens = [...tokenize(value)]
        matched = phrases.some((phrase) => phraseMatchesValue(phrase, vTokens))
      }
      if (matched && !used.has(filter.id)) {
        results.push({ filter, value })
        used.add(filter.id)
        break
      }
    }
  }
  return results
})

// ── Actions ───────────────────────────────────────────────────────────────────
function selectFilter(filter: FilterDef) {
  pendingFilter.value = filter
  pendingOperator.value = filter.operators[0]
  mode.value = 'value-select'
  textInput.value = ''
  if (filter.type !== 'enum') nextTick(() => textInputEl.value?.focus())
}

function addChip(filter: FilterDef, value: string, operator?: string) {
  emit('add', {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    filterId: filter.id,
    key: filter.label,
    operator: operator ?? filter.operators[0],
    value,
  })
  emit('close')
}

function submitText() {
  if (!pendingFilter.value || !textInput.value.trim()) return
  addChip(pendingFilter.value, textInput.value.trim(), pendingOperator.value)
}

function applyNlp() {
  for (const { filter, value, operator } of nlpChips.value) {
    emit('add', {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      filterId: filter.id,
      key: filter.label,
      operator: operator ?? filter.operators[0],
      value,
    })
  }
  emit('close')
}

function backToBrowse() {
  mode.value = 'browse'
  pendingFilter.value = null
  nextTick(() => searchInputEl.value?.focus())
}

async function openAdvanced() {
  if (props.currentAdvancedQuery) {
    advancedInitialQuery.value = props.currentAdvancedQuery
  } else {
    advancedInitialQuery.value = chipsToAdvancedQuery(props.currentFilters ?? [])
  }
  mode.value = 'advanced'
  await nextTick()
  positionPopover()
}

function handleAdvancedApply(query: AdvancedQuery) {
  emit('applyAdvanced', query)
  emit('close')
}

function handleAdvancedCancel() {
  mode.value = 'browse'
  nextTick(() => searchInputEl.value?.focus())
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
function handlePopoverKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab' && ghostSuggestion.value) {
    e.preventDefault()
    search.value = ghostSuggestion.value.fullValue
    return
  }
  if (e.key === 'ArrowDown' && mode.value === 'browse') {
    e.preventDefault()
    focusedFilterIdx.value = 0
    hoveredFilter.value = browseFilters.value[0] ?? null
    ;(popoverEl.value?.querySelector<HTMLElement>('.filter-item'))?.focus()
  } else if (e.key === 'Enter' && isNlp.value && nlpChips.value.length) {
    applyNlp()
  }
}

function handleFilterListKeydown(e: KeyboardEvent) {
  const list = browseFilters.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedFilterIdx.value = Math.min(focusedFilterIdx.value + 1, list.length - 1)
    hoveredFilter.value = list[focusedFilterIdx.value]
    ;(
      popoverEl.value?.querySelectorAll<HTMLElement>('.filter-item')[focusedFilterIdx.value]
    )?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusedFilterIdx.value <= 0) {
      focusedFilterIdx.value = -1
      searchInputEl.value?.focus()
    } else {
      focusedFilterIdx.value--
      hoveredFilter.value = list[focusedFilterIdx.value]
      ;(
        popoverEl.value?.querySelectorAll<HTMLElement>('.filter-item')[focusedFilterIdx.value]
      )?.focus()
    }
  } else if (e.key === 'ArrowRight' && hoveredFilter.value?.type === 'enum') {
    e.preventDefault()
    ;(popoverEl.value?.querySelector<HTMLElement>('.value-item'))?.focus()
  }
}

function handleValueKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const idx = Math.max(focusedFilterIdx.value, 0)
    ;(popoverEl.value?.querySelectorAll<HTMLElement>('.filter-item')[idx])?.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="popover-overlay"
      aria-hidden="true"
      @click="$emit('close')"
    />

    <div
      v-if="open"
      ref="popoverEl"
      class="filter-popover"
      :class="{ 'filter-popover--advanced': mode === 'advanced' }"
      :style="popoverStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="mode === 'advanced' ? 'Advanced filter builder' : 'Add filter'"
      @keydown="handlePopoverKeydown"
    >
      <!-- Advanced mode ──────────────────────────────── -->
      <template v-if="mode === 'advanced'">
        <div class="fp-adv-header">
          <svg class="fp-adv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M3 6h18M7 12h10M11 18h2"/>
          </svg>
          <span>Advanced filter</span>
        </div>
        <AdvancedFilterBuilder
          ref="advancedBuilderRef"
          :initial-query="advancedInitialQuery"
          @apply="handleAdvancedApply"
          @cancel="handleAdvancedCancel"
        />
        <div class="fp-adv-footer">
          <button class="fp-adv-btn fp-adv-btn--cancel" @click="handleAdvancedCancel">Cancel</button>
          <button class="fp-adv-btn fp-adv-btn--apply" @click="advancedBuilderRef?.handleApply()">Apply filter</button>
        </div>
      </template>

      <!-- Search ─────────────────────────────────────── -->
      <div v-else class="fp-search">
        <svg
          class="fp-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <div class="fp-input-wrap">
          <div v-if="ghostSuggestion" class="fp-ghost" aria-hidden="true"
            ><span class="fp-ghost-typed">{{ search }}</span><span class="fp-ghost-completion">{{ ghostSuggestion.completion }}</span></div>
          <input
            ref="searchInputEl"
            v-model="search"
            type="text"
            class="fp-search-input"
            placeholder="Search or describe in plain text…"
            aria-label="Search filters or describe in plain text"
            autocomplete="off"
            @keydown="handleSearchKeydown"
          />
        </div>
      </div>

      <!-- Browse: two-pane ───────────────────────────── -->
      <div
        v-if="mode === 'browse' && !isSearchMode"
        class="fp-two-pane"
      >
        <ul
          class="fp-filter-list"
          role="listbox"
          aria-label="Filter dimensions"
          @keydown="handleFilterListKeydown"
        >
          <li
            v-for="(filter, i) in browseFilters"
            :key="filter.id"
            role="option"
            :aria-selected="hoveredFilter?.id === filter.id"
            class="filter-item"
            :class="{ 'filter-item--active': hoveredFilter?.id === filter.id }"
            tabindex="0"
            @mouseenter="hoveredFilter = filter; focusedFilterIdx = i"
            @focus="hoveredFilter = filter; focusedFilterIdx = i"
            @click="selectFilter(filter)"
            @keydown.enter.prevent="selectFilter(filter)"
            @keydown.space.prevent="selectFilter(filter)"
          >
            {{ filter.label }}
            <svg
              v-if="filter.type !== 'enum'"
              class="filter-item-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </li>
        </ul>

        <div
          class="fp-values-panel"
          aria-label="Filter values"
          aria-live="polite"
        >
          <template v-if="hoveredFilter?.type === 'enum'">
            <button
              v-for="value in hoveredFilter.values"
              :key="value"
              class="value-item"
              @click="addChip(hoveredFilter!, value)"
              @keydown="handleValueKeydown"
            >
              {{ value }}
            </button>
          </template>
          <template v-else-if="hoveredFilter?.presets?.length">
            <button
              v-for="p in hoveredFilter.presets"
              :key="p.operator + p.value"
              class="value-item"
              @click="addChip(hoveredFilter!, p.value, p.operator)"
              @keydown="handleValueKeydown"
            >
              {{ p.operator }} {{ p.value }}
            </button>
            <button class="value-item value-item--custom" @click="selectFilter(hoveredFilter!)">
              Custom…
            </button>
          </template>
          <div v-else-if="hoveredFilter" class="fp-values-hint">
            Press Enter to add and enter a value
          </div>
          <div v-else class="fp-values-empty">
            Hover a filter to see values
          </div>
        </div>
      </div>

      <!-- Browse: search results ─────────────────────── -->
      <div
        v-else-if="mode === 'browse' && isSearchMode"
        class="fp-search-results"
        role="region"
        aria-label="Search results"
      >
        <div v-if="isNlp && nlpChips.length" class="fp-nlp" role="region" aria-label="AI suggestion">
          <div class="fp-nlp-header" aria-hidden="true">
            <svg class="fp-nlp-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
            </svg>
            AI suggestion
          </div>
          <div class="fp-nlp-chips" aria-label="Suggested filters">
            <span
              v-for="r in nlpChips"
              :key="r.filter.id"
              class="fp-nlp-chip"
            >
              {{ r.filter.label }} {{ r.operator ?? 'is' }} {{ r.value }}
            </span>
          </div>
          <button class="fp-nlp-apply" @click="applyNlp">Apply all</button>
        </div>

        <div v-if="searchGroups.length" class="fp-groups">
          <div v-for="group in searchGroups" :key="group.filter.id" class="fp-group">
            <button
              class="fp-group-label"
              :aria-label="`Select ${group.filter.label}`"
              @click="selectFilter(group.filter)"
            >
              {{ group.filter.label }}
            </button>
            <button
              v-for="value in group.values"
              :key="value"
              class="fp-group-value"
              :aria-label="`Add filter: ${group.filter.label} is ${value}`"
              @click="addChip(group.filter, value)"
            >
              <span class="fp-gv-key">{{ group.filter.label }}</span>
              <span class="fp-gv-sep" aria-hidden="true">=</span>
              <span class="fp-gv-val">{{ value }}</span>
            </button>
          </div>
        </div>

        <p v-else-if="!nlpChips.length" class="fp-no-results" role="status">
          <template v-if="isNlp">Couldn't match any filters to "{{ search }}"</template>
          <template v-else>No filters match "{{ search }}"</template>
        </p>
      </div>

      <!-- Value-select mode ──────────────────────────── -->
      <div v-else-if="mode === 'value-select'" class="fp-value-select">
        <button
          class="fp-back"
          :aria-label="`Back to filter list. Currently selecting: ${pendingFilter?.label}`"
          @click="backToBrowse"
        >
          <svg
            class="fp-back-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          {{ pendingFilter?.label }}
        </button>

        <div class="fp-vs-list">
          <template v-if="pendingFilter?.type === 'enum'">
            <button
              v-for="value in pendingFilter.values"
              :key="value"
              class="value-item"
              @click="addChip(pendingFilter!, value)"
            >
              {{ value }}
            </button>
          </template>
          <div v-else class="fp-vs-custom">
            <div v-if="pendingFilter?.presets?.length" class="fp-presets">
              <button
                v-for="p in pendingFilter.presets"
                :key="p.operator + p.value"
                class="fp-preset-btn"
                @click="addChip(pendingFilter!, p.value, p.operator)"
              >
                {{ p.operator }} {{ p.value }}
              </button>
            </div>
            <div class="fp-vs-input-row">
              <select
                v-model="pendingOperator"
                class="fp-op-select"
                :aria-label="`Operator for ${pendingFilter?.label}`"
              >
                <option v-for="op in pendingFilter?.operators" :key="op" :value="op">{{ op }}</option>
              </select>
              <input
                ref="textInputEl"
                v-model="textInput"
                :type="pendingFilter?.type === 'number' ? 'number' : 'text'"
                :placeholder="pendingFilter?.type === 'number' ? 'Enter number…' : 'Enter value…'"
                class="fp-vs-input"
                :aria-label="`Value for ${pendingFilter?.label}`"
                @keydown.enter="submitText"
                @keydown.esc="backToBrowse"
              />
              <button
                class="fp-vs-submit"
                :disabled="!textInput.trim()"
                @click="submitText"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer ─────────────────────────────────────── -->
      <div v-if="mode !== 'advanced'" class="fp-footer">
        <button class="fp-advanced" @click="openAdvanced">
          Advanced filter
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.filter-popover {
  position: absolute;
  z-index: 1000;
  width: 480px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 14px;
  color: #1c1c21;
  transition: width 0.2s ease;
}
.filter-popover--advanced {
  width: 580px;
  /* height is set dynamically by positionPopover() so the grid has a
     definite size — max-height alone doesn't work on position:absolute */
  display: grid;
  grid-template-rows: auto 1fr auto;
}

/* ── Advanced mode header ─────── */
.fp-adv-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #f2f1f4;
  font-size: 14px;
  font-weight: 600;
  color: #1c1c21;
  flex-shrink: 0;
}
.fp-adv-icon {
  width: 16px;
  height: 16px;
  color: #7c3aed;
  flex-shrink: 0;
}

/* ── Search ───────────────────────── */
.fp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f2f1f4;
  flex-shrink: 0;
}
.fp-search-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}
.fp-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.fp-ghost {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  font-size: 14px;
  pointer-events: none;
  white-space: pre;
  overflow: hidden;
}
.fp-ghost-typed {
  color: transparent;
}
.fp-ghost-completion {
  color: #b3b2bd;
}

.fp-search-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0;
  font-size: 14px;
  color: #1c1c21;
  background: transparent;
  min-width: 0;
  position: relative;
  z-index: 1;
}
.fp-search-input::placeholder {
  color: #9ca3af;
}

/* ── Two-pane ─────────────────────── */
.fp-two-pane {
  display: flex;
  height: 420px;
}

.fp-filter-list {
  width: 210px;
  flex-shrink: 0;
  overflow-y: scroll;
  border-right: 1px solid #f2f1f4;
  padding: 4px 0;
  list-style: none;
  margin: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 12px;
  cursor: pointer;
  color: #1c1c21;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: 14px;
  outline: none;
  user-select: none;
}
.filter-item:hover,
.filter-item--active,
.filter-item:focus-visible {
  background: #f4f3f7;
}
.filter-item-arrow {
  width: 14px;
  height: 14px;
  color: #9ca3af;
  flex-shrink: 0;
}

.fp-values-panel {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.value-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #1c1c21;
  outline: none;
}
.value-item:hover,
.value-item:focus-visible {
  background: #f4f3f7;
}

.fp-values-hint,
.fp-values-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}

/* ── Search results ───────────────── */
.fp-search-results {
  max-height: 380px;
  overflow-y: auto;
}

.fp-nlp {
  margin: 8px;
  padding: 10px 12px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fp-nlp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7c3aed;
}
.fp-nlp-icon {
  width: 14px;
  height: 14px;
  color: #7c3aed;
}
.fp-nlp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.fp-nlp-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #fff;
  border: 1px solid #ddd6fe;
  border-radius: 4px;
  font-size: 13px;
  color: #4c1d95;
}
.fp-nlp-apply {
  align-self: flex-start;
  padding: 4px 12px;
  background: #7c3aed;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.fp-nlp-apply:hover {
  background: #6d28d9;
}

.fp-groups {
  padding: 4px 0;
}
.fp-group {
  padding-bottom: 4px;
}
.fp-group-label {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  outline: none;
}
.fp-group-label:hover,
.fp-group-label:focus-visible {
  background: #f4f3f7;
}
.fp-group-value {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 6px 12px 6px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  outline: none;
}
.fp-group-value:hover,
.fp-group-value:focus-visible {
  background: #f4f3f7;
}
.fp-gv-key {
  color: #1c1c21;
}
.fp-gv-sep {
  color: #9ca3af;
  margin: 0 2px;
}
.fp-gv-val {
  color: #1c1c21;
  font-weight: 500;
}

.fp-no-results {
  padding: 24px 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  margin: 0;
}

/* ── Value-select mode ────────────── */
.fp-value-select {
  display: flex;
  flex-direction: column;
  max-height: 380px;
}
.fp-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #f2f1f4;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
  outline: none;
}
.fp-back:hover,
.fp-back:focus-visible {
  background: #f9fafb;
}
.fp-back-icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
  flex-shrink: 0;
}
.fp-vs-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.value-item--custom {
  color: #7c3aed;
  font-style: italic;
}

.fp-vs-custom {
  display: flex;
  flex-direction: column;
}

.fp-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #f2f1f4;
}
.fp-preset-btn {
  padding: 4px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  outline: none;
  font-variant-numeric: tabular-nums;
}
.fp-preset-btn:hover,
.fp-preset-btn:focus-visible {
  background: #f4f3f7;
  border-color: #b3b2bd;
}

.fp-vs-input-row {
  display: flex;
  gap: 8px;
  padding: 12px;
  align-items: center;
}

.fp-op-select {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background: #fff;
  outline: none;
  cursor: pointer;
  flex-shrink: 0;
  width: 56px;
}
.fp-op-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}

.fp-vs-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  min-width: 0;
}
.fp-vs-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
.fp-vs-submit {
  padding: 6px 14px;
  background: #1c1c21;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}
.fp-vs-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.fp-vs-submit:not(:disabled):hover {
  background: #374151;
}

/* ── Advanced footer ──────────────── */
.fp-adv-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #f2f1f4;
  flex-shrink: 0;
}

.fp-adv-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  outline: none;
  line-height: 1.4;
}
.fp-adv-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.fp-adv-btn--cancel { background: #fff; border-color: #d1d5db; color: #374151; }
.fp-adv-btn--cancel:hover { background: #f9fafb; }
.fp-adv-btn--apply { background: #7c3aed; color: #fff; border-color: #7c3aed; }
.fp-adv-btn--apply:hover { background: #6d28d9; }

/* ── Footer ───────────────────────── */
.fp-footer {
  border-top: 1px solid #f2f1f4;
  padding: 4px 8px;
  flex-shrink: 0;
}
.fp-advanced {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  width: 100%;
  text-align: left;
  outline: none;
}
.fp-advanced:hover { background: #f4f3f7; color: #374151; }
.fp-advanced:focus-visible { outline: 2px solid #7c3aed; outline-offset: 1px; }
</style>
