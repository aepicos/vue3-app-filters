<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import FilterPopover from './FilterPopover.vue'
import { FILTERS, type FilterChip, type FilterDef, type AdvancedQuery } from '../data/filters'

const props = defineProps<{
  filters: FilterChip[]
  advancedQuery?: AdvancedQuery | null
}>()

const emit = defineEmits<{
  remove: [id: string]
  add: [chip: FilterChip]
  setOperator: [id: string, operator: string]
  setValue: [id: string, value: string]
  applyAdvanced: [query: AdvancedQuery]
  clearAdvanced: []
}>()

const popoverOpen = ref(false)
const wantsAdvanced = ref(false)
const addBtnEl = ref<HTMLElement | null>(null)
const openOpId = ref<string | null>(null)
const openValId = ref<string | null>(null)
const editingVal = ref('')

const hasAdvanced = () =>
  !!props.advancedQuery && props.advancedQuery.groups.length > 0

function openPopover() {
  wantsAdvanced.value = false
  popoverOpen.value = true
}

function openAdvancedMode() {
  wantsAdvanced.value = true
  popoverOpen.value = true
}

function closePopover() {
  popoverOpen.value = false
  wantsAdvanced.value = false
  addBtnEl.value?.focus()
}

function summarizeAdvancedQuery(query: AdvancedQuery): string {
  const groupSummaries = query.groups.map((group) => {
    const parts = group.conditions.map((c) => `${c.key} ${c.operator} ${c.value}`)
    return parts.length === 1 ? parts[0] : `(${parts.join(` ${group.operator} `)})`
  })
  return groupSummaries.join(` ${query.groupOperator} `)
}

function operatorsFor(chip: FilterChip): string[] {
  return FILTERS.find((f) => f.id === chip.filterId)?.operators ?? ['is', 'is not']
}

function filterDefFor(chip: FilterChip): FilterDef | undefined {
  return FILTERS.find((f) => f.id === chip.filterId)
}

function isValueUsedElsewhere(chip: FilterChip, val: string): boolean {
  return props.filters.some((f) => f.id !== chip.id && f.filterId === chip.filterId && f.value === val)
}

function openValueEdit(chip: FilterChip) {
  const def = filterDefFor(chip)
  if (!def) return
  openOpId.value = null
  if (def.type === 'enum') {
    openValId.value = openValId.value === chip.id ? null : chip.id
  } else {
    openValId.value = chip.id
    editingVal.value = chip.value
  }
}

function submitVal(chip: FilterChip) {
  if (openValId.value !== chip.id) return
  const trimmed = editingVal.value.trim()
  openValId.value = null
  if (trimmed && trimmed !== chip.value) {
    emit('setValue', chip.id, trimmed)
  }
}

function handleDocClick() {
  openOpId.value = null
  openValId.value = null
}
onMounted(() => document.addEventListener('click', handleDocClick))
onUnmounted(() => document.removeEventListener('click', handleDocClick))
</script>

<template>
  <div class="filter-bar">
    <div class="filter-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
      </svg>
    </div>

    <!-- Advanced filter summary chip -->
    <template v-if="hasAdvanced()">
      <div class="adv-chip" role="group" aria-label="Advanced filter active">
        <button
          class="adv-chip-body"
          :aria-label="`Advanced filter: ${summarizeAdvancedQuery(advancedQuery!)}. Click to edit.`"
          @click="openAdvancedMode"
        >
          <svg class="adv-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M3 6h18M7 12h10M11 18h2"/>
          </svg>
          <span class="adv-chip-text">{{ summarizeAdvancedQuery(advancedQuery!) }}</span>
        </button>
        <button
          class="adv-chip-clear"
          aria-label="Clear advanced filter"
          @click="$emit('clearAdvanced')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Simple filter chips -->
    <template v-else>
      <div class="chips" role="list" aria-label="Active filters">
        <div
          v-for="filter in filters"
          :key="filter.id"
          class="chip"
          role="listitem"
        >
          <span class="chip-key">{{ filter.key }}</span>
          <div class="chip-op-wrap">
            <button
              class="chip-operator"
              :aria-label="`Operator: ${filter.operator}. Click to change.`"
              :aria-expanded="openOpId === filter.id"
              aria-haspopup="listbox"
              @click.stop="openOpId = openOpId === filter.id ? null : filter.id"
            >
              {{ filter.operator }}
              <svg viewBox="0 0 24 24" fill="currentColor" class="chevron" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
            <div
              v-if="openOpId === filter.id"
              class="chip-op-dropdown"
              role="listbox"
              :aria-label="`Operator options for ${filter.key}`"
            >
              <button
                v-for="op in operatorsFor(filter)"
                :key="op"
                role="option"
                :aria-selected="op === filter.operator"
                class="chip-op-option"
                :class="{ 'chip-op-option--active': op === filter.operator }"
                @click.stop="$emit('setOperator', filter.id, op); openOpId = null"
              >
                {{ op }}
              </button>
            </div>
          </div>
          <div class="chip-val-wrap" @click.stop>
            <button
              class="chip-value-btn"
              :aria-label="`Value: ${filter.value}. Click to change.`"
              :aria-expanded="openValId === filter.id"
              @click.stop="openValueEdit(filter)"
            >
              {{ filter.value }}
              <svg viewBox="0 0 24 24" fill="currentColor" class="chevron" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            <!-- enum value dropdown -->
            <div
              v-if="openValId === filter.id && filterDefFor(filter)?.type === 'enum'"
              class="chip-val-dropdown"
              role="listbox"
              :aria-label="`Value options for ${filter.key}`"
            >
              <button
                v-for="val in filterDefFor(filter)?.values ?? []"
                :key="val"
                role="option"
                :aria-selected="val === filter.value"
                :disabled="isValueUsedElsewhere(filter, val)"
                class="chip-val-option"
                :class="{
                  'chip-val-option--active': val === filter.value,
                  'chip-val-option--disabled': isValueUsedElsewhere(filter, val),
                }"
                @click.stop="$emit('setValue', filter.id, val); openValId = null"
              >
                {{ val }}
              </button>
            </div>

            <!-- free-text / number input -->
            <div
              v-else-if="openValId === filter.id"
              class="chip-val-dropdown chip-val-dropdown--input"
            >
              <input
                :ref="(el) => el && (el as HTMLInputElement).focus()"
                v-model="editingVal"
                class="chip-val-input"
                @keydown.enter.stop="submitVal(filter)"
                @keydown.escape.stop="openValId = null"
                @blur="submitVal(filter)"
              />
            </div>
          </div>
          <button
            class="chip-remove"
            :aria-label="`Remove filter: ${filter.key} ${filter.operator} ${filter.value}`"
            @click="$emit('remove', filter.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <button
          v-if="filters.length === 0"
          ref="addBtnEl"
          class="add-btn add-btn--text"
          aria-label="Add filter"
          :aria-expanded="popoverOpen"
          aria-haspopup="dialog"
          @click="openPopover"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add filter
        </button>
        <button
          v-else
          ref="addBtnEl"
          class="add-btn add-btn--icon"
          aria-label="Add filter"
          :aria-expanded="popoverOpen"
          aria-haspopup="dialog"
          @click="openPopover"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>
    </template>
  </div>

  <FilterPopover
    :open="popoverOpen"
    :anchor-el="addBtnEl"
    :current-filters="filters"
    :current-advanced-query="advancedQuery"
    :start-advanced="wantsAdvanced"
    @close="closePopover"
    @add="(chip) => $emit('add', chip)"
    @apply-advanced="(q) => $emit('applyAdvanced', q)"
  />
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.filter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}
.filter-icon svg {
  width: 20px;
  height: 20px;
  color: #9ca3af;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  flex: 1;
  min-width: 0;
}

/* ── Advanced summary chip ─────── */
.adv-chip {
  display: flex;
  align-items: center;
  height: 28px;
  border: 1px solid #a78bfa;
  border-radius: 6px;
  background: #f5f3ff;
  max-width: min(720px, calc(100vw - 120px));
  flex-shrink: 1;
  min-width: 0;
}

.adv-chip-body {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  min-width: 0;
  flex: 1;
  border-radius: 5px 0 0 5px;
  outline: none;
}
.adv-chip-body:hover { background: #ede9fe; }
.adv-chip-body:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: -2px;
}

.adv-chip-icon {
  width: 13px;
  height: 13px;
  color: #7c3aed;
  flex-shrink: 0;
}

.adv-chip-text {
  font-size: 13px;
  color: #4c1d95;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.adv-chip-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 100%;
  border: none;
  border-left: 1px solid #c4b5fd;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  border-radius: 0 5px 5px 0;
  outline: none;
}
.adv-chip-clear:hover { background: #ede9fe; }
.adv-chip-clear:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: -2px;
}
.adv-chip-clear svg {
  width: 13px;
  height: 13px;
  color: #7c3aed;
}

/* ── Filter chip ──────────────────── */
.chip {
  display: flex;
  align-items: center;
  height: 24px;
  border: 1px solid #b3b2bd;
  border-radius: 6px;
  background: #fff;
  flex-shrink: 0;
  position: relative;
}
.chip-key { border-radius: 5px 0 0 5px; }
.chip-remove { border-radius: 0 5px 5px 0; }

.chip-key {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  font-size: 14px;
  line-height: 20px;
  color: #1c1c21;
  white-space: nowrap;
}

.chip-val-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  border-left: 1px solid #f2f1f4;
}

.chip-value-btn {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px 0 8px;
  font-size: 14px;
  line-height: 20px;
  color: #1c1c21;
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  gap: 0;
}
.chip-value-btn:hover { background: #f4f3f7; }
.chip-value-btn:focus-visible {
  background: #f4f3f7;
  outline: 2px solid #7c3aed;
  outline-offset: -2px;
}

.chip-val-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1001;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
  padding: 4px 0;
  min-width: max(100%, 140px);
  white-space: nowrap;
  max-height: 240px;
  overflow-y: auto;
}
.chip-val-dropdown--input {
  padding: 8px;
  min-width: 160px;
}

.chip-val-option {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1c1c21;
  cursor: pointer;
  text-align: left;
  outline: none;
}
.chip-val-option:not(:disabled):hover,
.chip-val-option:not(:disabled):focus-visible { background: #f4f3f7; }
.chip-val-option--active { color: #7c3aed; font-weight: 600; }
.chip-val-option--disabled,
.chip-val-option:disabled { opacity: 0.4; cursor: default; }

.chip-val-input {
  width: 140px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  color: #1c1c21;
  outline: none;
  background: #fff;
}
.chip-val-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
}

.chip-op-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  border-left: 1px solid #f2f1f4;
}

.chip-operator {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 2px 0 6px;
  font-size: 14px;
  line-height: 20px;
  color: #717083;
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  gap: 0;
}
.chip-operator:hover {
  background: #f4f3f7;
}
.chip-operator:focus-visible {
  background: #f4f3f7;
  outline: 2px solid #7c3aed;
  outline-offset: -2px;
}

.chip-op-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1001;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
  padding: 4px 0;
  min-width: 100%;
  white-space: nowrap;
}
.chip-op-option {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1c1c21;
  cursor: pointer;
  text-align: left;
  outline: none;
}
.chip-op-option:hover,
.chip-op-option:focus-visible {
  background: #f4f3f7;
}
.chip-op-option--active {
  color: #7c3aed;
  font-weight: 600;
}

.chevron {
  width: 16px;
  height: 16px;
  color: #717083;
  flex-shrink: 0;
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 100%;
  border: none;
  border-left: 1px solid #f2f1f4;
  background: transparent;
  cursor: pointer;
  transition: background 0.1s;
  flex-shrink: 0;
  padding: 0;
  outline: none;
}
.chip-remove:hover {
  background: #f0f0f2;
}
.chip-remove:focus-visible {
  background: #f0f0f2;
  outline: 2px solid #7c3aed;
  outline-offset: -2px;
}
.chip-remove svg {
  width: 14px;
  height: 14px;
  color: #9ca3af;
}

/* ── Add filter button ────────────── */
.add-btn {
  display: flex;
  align-items: center;
  height: 24px;
  border: 1px solid #b3b2bd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 3px 2px -2px rgba(28, 28, 33, 0.2);
  transition: background 0.1s;
  flex-shrink: 0;
  outline: none;
}
.add-btn:hover {
  background: #f9fafb;
}
.add-btn:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}
.add-btn svg {
  width: 16px;
  height: 16px;
  color: #374151;
  flex-shrink: 0;
}

.add-btn--text {
  gap: 5px;
  padding: 0 8px;
  font-size: 14px;
  color: #1c1c21;
}

.add-btn--icon {
  width: 24px;
  justify-content: center;
  padding: 0;
}
</style>
