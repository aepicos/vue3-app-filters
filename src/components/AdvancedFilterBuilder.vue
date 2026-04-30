<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { FILTERS, type AdvancedQuery } from '../data/filters'

const props = defineProps<{
  initialQuery: AdvancedQuery
}>()

const emit = defineEmits<{
  cancel: []
  apply: [query: AdvancedQuery]
}>()

// ── Local editable copy ───────────────────────────────────────────────────────

function cloneQuery(q: AdvancedQuery): AdvancedQuery {
  return {
    groupOperator: q.groupOperator,
    groups: q.groups.map((g) => ({
      id: g.id,
      operator: g.operator,
      conditions: g.conditions.map((c) => ({ ...c })),
    })),
  }
}

const query = reactive<AdvancedQuery>(cloneQuery(props.initialQuery))

// ── Draft condition (one at a time, per group) ────────────────────────────────

interface DraftCondition {
  groupId: string
  filterId: string
  operator: string
  value: string
}

const draft = ref<DraftCondition | null>(null)

function filterDefById(filterId: string) {
  return FILTERS.find((f) => f.id === filterId)
}

const draftDef = computed(() => draft.value ? filterDefById(draft.value.filterId) : null)

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ── Group actions ─────────────────────────────────────────────────────────────

function addGroup() {
  commitDraft()
  query.groups.push({ id: uid(), operator: 'AND', conditions: [] })
}

function removeGroup(groupId: string) {
  if (draft.value?.groupId === groupId) draft.value = null
  query.groups = query.groups.filter((g) => g.id !== groupId)
}

function toggleGroupOperator(groupId: string) {
  const g = query.groups.find((g) => g.id === groupId)
  if (g) g.operator = g.operator === 'AND' ? 'OR' : 'AND'
}

function toggleGroupOperator_all() {
  const next = query.groupOperator === 'AND' ? 'OR' : 'AND'
  query.groupOperator = next
}

// ── Condition actions ─────────────────────────────────────────────────────────

function removeCondition(groupId: string, condId: string) {
  const g = query.groups.find((g) => g.id === groupId)
  if (g) g.conditions = g.conditions.filter((c) => c.id !== condId)
}

function updateConditionOperator(groupId: string, condId: string, op: string) {
  const g = query.groups.find((g) => g.id === groupId)
  const c = g?.conditions.find((c) => c.id === condId)
  if (c) c.operator = op
}

function updateConditionValue(groupId: string, condId: string, val: string) {
  const g = query.groups.find((g) => g.id === groupId)
  const c = g?.conditions.find((c) => c.id === condId)
  if (c) c.value = val
}

// ── Draft management ──────────────────────────────────────────────────────────

function startDraft(groupId: string) {
  commitDraft()
  draft.value = { groupId, filterId: '', operator: '', value: '' }
}

function selectDraftFilter(filterId: string) {
  if (!draft.value) return
  const def = filterDefById(filterId)
  if (!def) return
  draft.value.filterId = filterId
  draft.value.operator = def.operators[0]
  draft.value.value = ''
}

function selectDraftValue(val: string) {
  if (!draft.value) return
  draft.value.value = val
  commitDraft()
}

function setDraftOperator(op: string) {
  if (!draft.value) return
  draft.value.operator = op
}

function commitDraft() {
  if (!draft.value) return
  const d = draft.value
  if (!d.filterId || !d.operator || !d.value.trim()) {
    draft.value = null
    return
  }
  const def = filterDefById(d.filterId)
  const g = query.groups.find((g) => g.id === d.groupId)
  if (g && def) {
    g.conditions.push({
      id: uid(),
      filterId: d.filterId,
      key: def.label,
      operator: d.operator,
      value: d.value.trim(),
    })
  }
  draft.value = null
}

function cancelDraft() {
  draft.value = null
}

function handleDraftTextKey(e: KeyboardEvent) {
  if (e.key === 'Enter') commitDraft()
  if (e.key === 'Escape') cancelDraft()
}

// ── Apply / cancel ────────────────────────────────────────────────────────────

function handleApply() {
  commitDraft()
  const nonEmpty = query.groups.filter((g) => g.conditions.length > 0)
  if (nonEmpty.length === 0) { emit('cancel'); return }
  emit('apply', { groupOperator: query.groupOperator, groups: nonEmpty })
}

// Exposed so FilterPopover can call this from its own footer button
defineExpose({ handleApply })

</script>

<template>
  <div class="afb" role="region" aria-label="Advanced filter builder">

    <!-- Groups ────────────────────────────────────────────────────────────── -->
    <div class="afb-body">
      <template v-for="(group, gi) in query.groups" :key="group.id">

        <!-- Group card -->
        <div class="afb-group" :aria-label="`Filter group ${gi + 1}`">

          <!-- Group header -->
          <div class="afb-group-header">
            <span class="afb-group-label">Group {{ gi + 1 }}</span>
            <button
              v-if="query.groups.length > 1"
              class="afb-group-remove"
              :aria-label="`Remove group ${gi + 1}`"
              @click="removeGroup(group.id)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Conditions -->
          <div class="afb-conditions">
            <template v-for="(cond, ci) in group.conditions" :key="cond.id">

              <!-- Condition row -->
              <div class="afb-cond-row" role="row">
                <!-- Field -->
                <div class="afb-cell afb-cell--field">
                  <select
                    class="afb-select"
                    :aria-label="`Field for condition ${ci + 1} in group ${gi + 1}`"
                    :value="cond.filterId"
                    @change="(e) => {
                      const def = filterDefById((e.target as HTMLSelectElement).value)
                      if (def) {
                        updateConditionOperator(group.id, cond.id, def.operators[0])
                        updateConditionValue(group.id, cond.id, def.type === 'enum' ? (def.values?.[0] ?? '') : '')
                      }
                      const g = query.groups.find(g => g.id === group.id)
                      const c = g?.conditions.find(c => c.id === cond.id)
                      if (c) { c.filterId = (e.target as HTMLSelectElement).value; c.key = def?.label ?? '' }
                    }"
                  >
                    <option v-for="f in FILTERS" :key="f.id" :value="f.id">{{ f.label }}</option>
                  </select>
                </div>

                <!-- Operator -->
                <div class="afb-cell afb-cell--op">
                  <select
                    class="afb-select"
                    :aria-label="`Operator for condition ${ci + 1} in group ${gi + 1}`"
                    :value="cond.operator"
                    @change="(e) => updateConditionOperator(group.id, cond.id, (e.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="op in filterDefById(cond.filterId)?.operators ?? ['is', 'is not']"
                      :key="op"
                      :value="op"
                    >{{ op }}</option>
                  </select>
                </div>

                <!-- Value -->
                <div class="afb-cell afb-cell--val">
                  <select
                    v-if="filterDefById(cond.filterId)?.type === 'enum'"
                    class="afb-select"
                    :aria-label="`Value for condition ${ci + 1} in group ${gi + 1}`"
                    :value="cond.value"
                    @change="(e) => updateConditionValue(group.id, cond.id, (e.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="v in filterDefById(cond.filterId)?.values ?? []"
                      :key="v"
                      :value="v"
                    >{{ v }}</option>
                  </select>
                  <input
                    v-else
                    class="afb-input"
                    :type="filterDefById(cond.filterId)?.type === 'number' ? 'number' : 'text'"
                    :aria-label="`Value for condition ${ci + 1} in group ${gi + 1}`"
                    :value="cond.value"
                    @input="(e) => updateConditionValue(group.id, cond.id, (e.target as HTMLInputElement).value)"
                  />
                </div>

                <!-- Remove condition -->
                <button
                  class="afb-cond-remove"
                  :aria-label="`Remove condition ${ci + 1} from group ${gi + 1}`"
                  @click="removeCondition(group.id, cond.id)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              <!-- Within-group operator badge (between conditions) -->
              <div v-if="ci < group.conditions.length - 1 || draft?.groupId === group.id" class="afb-op-row">
                <button
                  class="afb-op-badge"
                  :aria-label="`Toggle operator between conditions in group ${gi + 1}: currently ${group.operator}`"
                  @click="toggleGroupOperator(group.id)"
                >
                  {{ group.operator }}
                </button>
              </div>

            </template>

            <!-- Draft condition row -->
            <template v-if="draft?.groupId === group.id">
              <div class="afb-cond-row afb-cond-row--draft" role="row" aria-label="New condition">

                <!-- Draft field -->
                <div class="afb-cell afb-cell--field">
                  <select
                    class="afb-select"
                    aria-label="Select filter dimension"
                    :value="draft.filterId"
                    @change="(e) => selectDraftFilter((e.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>Select filter…</option>
                    <option v-for="f in FILTERS" :key="f.id" :value="f.id">{{ f.label }}</option>
                  </select>
                </div>

                <!-- Draft operator (shown once field selected) -->
                <div class="afb-cell afb-cell--op">
                  <select
                    class="afb-select"
                    aria-label="Select operator"
                    :disabled="!draft.filterId"
                    :value="draft.operator"
                    @change="(e) => setDraftOperator((e.target as HTMLSelectElement).value)"
                  >
                    <option v-if="!draft.filterId" value="" disabled>—</option>
                    <option
                      v-for="op in draftDef?.operators ?? []"
                      :key="op"
                      :value="op"
                    >{{ op }}</option>
                  </select>
                </div>

                <!-- Draft value -->
                <div class="afb-cell afb-cell--val">
                  <select
                    v-if="draftDef?.type === 'enum'"
                    class="afb-select"
                    aria-label="Select value"
                    :disabled="!draft.filterId"
                    value=""
                    @change="(e) => selectDraftValue((e.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>Select value…</option>
                    <option v-for="v in draftDef?.values ?? []" :key="v" :value="v">{{ v }}</option>
                  </select>
                  <input
                    v-else
                    class="afb-input"
                    :type="draftDef?.type === 'number' ? 'number' : 'text'"
                    aria-label="Enter value"
                    :disabled="!draft.filterId"
                    :placeholder="!draft.filterId ? '—' : draftDef?.type === 'number' ? 'Number…' : 'Value…'"
                    :value="draft.value"
                    @input="(e) => { if (draft) draft.value = (e.target as HTMLInputElement).value }"
                    @keydown="handleDraftTextKey"
                  />
                </div>

                <!-- Cancel draft -->
                <button
                  class="afb-cond-remove"
                  aria-label="Cancel new condition"
                  @click="cancelDraft"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </template>

            <!-- Add condition button -->
            <button
              v-if="draft?.groupId !== group.id"
              class="afb-add-cond"
              :aria-label="`Add condition to group ${gi + 1}`"
              @click="startDraft(group.id)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add condition
            </button>
          </div>
        </div>

        <!-- Between-group operator -->
        <div v-if="gi < query.groups.length - 1" class="afb-group-op-row">
          <button
            class="afb-op-badge afb-op-badge--group"
            :aria-label="`Toggle operator between groups: currently ${query.groupOperator}`"
            @click="toggleGroupOperator_all"
          >
            {{ query.groupOperator }}
          </button>
          <div class="afb-group-op-line" aria-hidden="true" />
        </div>

      </template>

      <!-- Add group -->
      <button class="afb-add-group" aria-label="Add filter group" @click="addGroup">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add group
      </button>
    </div>

  </div>
</template>

<style scoped>
.afb {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.afb-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Group card ───────────────────────────────────────────────────────────── */
.afb-group {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
}

.afb-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 12px;
  border-bottom: 1px solid #f2f1f4;
  background: #f4f3f7;
}

.afb-group-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.afb-group-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  color: #9ca3af;
  outline: none;
}
.afb-group-remove:hover { background: #e5e7eb; color: #374151; }
.afb-group-remove:focus-visible { outline: 2px solid #7c3aed; outline-offset: 1px; }
.afb-group-remove svg { width: 14px; height: 14px; }

/* ── Conditions ───────────────────────────────────────────────────────────── */
.afb-conditions {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.afb-cond-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}
.afb-cond-row--draft {
  opacity: 0.9;
}

.afb-cell {
  display: flex;
  align-items: center;
  min-width: 0;
}
.afb-cell--field { flex: 2; }
.afb-cell--op   { flex: 1.4; }
.afb-cell--val  { flex: 2; }

.afb-select,
.afb-input {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font-size: 13px;
  color: #1c1c21;
  background: #fff;
  outline: none;
  min-width: 0;
}
.afb-select:focus,
.afb-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
}
.afb-select:disabled,
.afb-input:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.afb-cond-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  color: #9ca3af;
  outline: none;
}
.afb-cond-remove:hover { background: #fee2e2; color: #ef4444; }
.afb-cond-remove:focus-visible { outline: 2px solid #7c3aed; outline-offset: 1px; }
.afb-cond-remove svg { width: 14px; height: 14px; }

/* ── Within-group operator badge ──────────────────────────────────────────── */
.afb-op-row {
  display: flex;
  align-items: center;
  padding: 2px 0;
}

.afb-op-badge {
  padding: 1px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  letter-spacing: 0.04em;
  outline: none;
  line-height: 18px;
  transition: background 0.1s, border-color 0.1s, color 0.1s;
}
.afb-op-badge:hover {
  background: #f4f3f7;
  border-color: #b3b2bd;
  color: #374151;
}
.afb-op-badge:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}

/* ── Add condition ────────────────────────────────────────────────────────── */
.afb-add-cond {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 4px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #7c3aed;
  cursor: pointer;
  border-radius: 5px;
  outline: none;
  margin-top: 2px;
}
.afb-add-cond:hover { background: #f5f3ff; }
.afb-add-cond:focus-visible { outline: 2px solid #7c3aed; outline-offset: 1px; }
.afb-add-cond svg { width: 14px; height: 14px; flex-shrink: 0; }

/* ── Between-group operator ───────────────────────────────────────────────── */
.afb-group-op-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}
.afb-group-op-line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}
.afb-op-badge--group {
  background: #fff;
  border-color: #b3b2bd;
  color: #374151;
  font-size: 12px;
  padding: 2px 12px;
}
.afb-op-badge--group:hover {
  background: #f4f3f7;
  border-color: #7c3aed;
  color: #7c3aed;
}

/* ── Add group ────────────────────────────────────────────────────────────── */
.afb-add-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  outline: none;
  margin-top: 8px;
  transition: border-color 0.1s, color 0.1s, background 0.1s;
}
.afb-add-group:hover {
  border-color: #7c3aed;
  color: #7c3aed;
  background: #faf5ff;
}
.afb-add-group:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.afb-add-group svg { width: 15px; height: 15px; flex-shrink: 0; }

</style>
