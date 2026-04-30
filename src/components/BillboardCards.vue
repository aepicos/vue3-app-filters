<script setup lang="ts">
import { ref, computed } from 'vue'

type MetricKey =
  | 'total_assets'
  | 'high_risk'
  | 'critical_risk'
  | 'unmonitored'
  | 'packages'
  | 'repositories'
  | 'container_images'
  | 'web_apps'
  | 'apis'
  | 'dependencies'
  | 'monitored'
  | 'no_controls'
  | 'active_issues'
  | 'resolved_issues'

interface Metric {
  key: MetricKey
  label: string
  value: string
  delta: string
  deltaPositive: boolean | null
  iconColor: string
  iconBg: string
}

const ALL_METRICS: Metric[] = [
  { key: 'total_assets',     label: 'Total Assets',       value: '1,842', delta: '+24 this week',        deltaPositive: false, iconColor: '#2563eb', iconBg: '#eff6ff' },
  { key: 'critical_risk',    label: 'Critical Risk',      value: '48',    delta: '+5 since last scan',   deltaPositive: false, iconColor: '#dc2626', iconBg: '#fef2f2' },
  { key: 'high_risk',        label: 'High Risk',          value: '137',   delta: '+8 since last scan',   deltaPositive: false, iconColor: '#ea580c', iconBg: '#fff7ed' },
  { key: 'unmonitored',      label: 'Unmonitored',        value: '58',    delta: '-12 resolved',         deltaPositive: true,  iconColor: '#ca8a04', iconBg: '#fefce8' },
  { key: 'packages',         label: 'Packages',           value: '4,291', delta: 'Across all repos',     deltaPositive: null,  iconColor: '#16a34a', iconBg: '#f0fdf4' },
  { key: 'repositories',     label: 'Repositories',       value: '428',   delta: '+3 this week',         deltaPositive: false, iconColor: '#9333ea', iconBg: '#faf5ff' },
  { key: 'container_images', label: 'Container Images',   value: '241',   delta: '+11 this week',        deltaPositive: false, iconColor: '#0284c7', iconBg: '#f0f9ff' },
  { key: 'web_apps',         label: 'Web Applications',   value: '76',    delta: 'No change',            deltaPositive: null,  iconColor: '#4f46e5', iconBg: '#eef2ff' },
  { key: 'apis',             label: 'APIs',               value: '124',   delta: '+2 this week',         deltaPositive: false, iconColor: '#0d9488', iconBg: '#f0fdfa' },
  { key: 'dependencies',     label: 'Dependencies',       value: '2,092', delta: 'Direct libraries',     deltaPositive: null,  iconColor: '#7c3aed', iconBg: '#f5f3ff' },
  { key: 'monitored',        label: 'Monitored',          value: '1,784', delta: '96% coverage',         deltaPositive: true,  iconColor: '#059669', iconBg: '#ecfdf5' },
  { key: 'no_controls',      label: 'No Controls',        value: '203',   delta: '+17 this week',        deltaPositive: false, iconColor: '#e11d48', iconBg: '#fff1f2' },
  { key: 'active_issues',    label: 'Active Issues',      value: '93',    delta: 'Across all assets',    deltaPositive: null,  iconColor: '#d97706', iconBg: '#fffbeb' },
  { key: 'resolved_issues',  label: 'Resolved Issues',    value: '312',   delta: '+44 this month',       deltaPositive: true,  iconColor: '#16a34a', iconBg: '#f0fdf4' },
]

const MAX_CARDS = 4
const visibleKeys = ref<MetricKey[]>(['total_assets', 'high_risk', 'unmonitored', 'packages'])

const visibleMetrics = computed(() =>
  visibleKeys.value
    .map((k) => ALL_METRICS.find((m) => m.key === k))
    .filter(Boolean) as Metric[]
)

const availableToAdd = computed(() =>
  ALL_METRICS.filter((m) => !visibleKeys.value.includes(m.key))
)

function removeCard(key: MetricKey) {
  visibleKeys.value = visibleKeys.value.filter((k) => k !== key)
}

function addCard(key: MetricKey) {
  if (visibleKeys.value.length >= MAX_CARDS) return
  visibleKeys.value = [...visibleKeys.value, key]
}

function replaceCard(oldKey: MetricKey, newKey: MetricKey) {
  visibleKeys.value = visibleKeys.value.map((k) => (k === oldKey ? newKey : k))
}

// Dropdown state per card
const openDropdown = ref<MetricKey | null>(null)
const addDropdownOpen = ref(false)

function toggleDropdown(key: MetricKey, e: MouseEvent) {
  e.stopPropagation()
  openDropdown.value = openDropdown.value === key ? null : key
}

function closeAll() {
  openDropdown.value = null
  addDropdownOpen.value = false
}
</script>

<template>
  <div class="grid gap-3" style="grid-template-columns: repeat(4, 1fr);" @click.self="closeAll">
    <div
      v-for="metric in visibleMetrics"
      :key="metric.key"
      class="border rounded-lg p-4 flex flex-col gap-3 relative"
      style="background: #fff; border-color: #e5e7eb;"
    >
      <!-- Replace dropdown trigger -->
      <div class="absolute top-2 right-2">
        <button
          class="p-1 rounded transition-opacity"
          style="color: #6b7280;"
          :aria-label="`Change ${metric.label} metric`"
          @click="(e) => toggleDropdown(metric.key, e)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
          <div
            v-if="openDropdown === metric.key"
            class="absolute right-0 z-50 rounded-lg border shadow-lg py-1"
            style="top: calc(100% + 4px); min-width: 200px; background: #fff; border-color: #e5e7eb;"
          >
            <div class="px-2 py-1.5 text-xs font-medium" style="color: #6b7280;">Replace with</div>
            <div class="border-t mx-1 my-1" style="border-color: #f3f4f6;"></div>
            <button
              v-for="m in ALL_METRICS.filter(m => m.key !== metric.key && !visibleKeys.includes(m.key))"
              :key="m.key"
              class="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-gray-50"
              style="color: #111827;"
              @click="() => { replaceCard(metric.key, m.key); openDropdown = null }"
            >
              <div class="w-5 h-5 rounded flex items-center justify-center shrink-0" :style="`background: ${m.iconBg};`">
                <div class="w-2 h-2 rounded-full" :style="`background: ${m.iconColor};`" />
              </div>
              {{ m.label }}
            </button>
            <div class="border-t mx-1 my-1" style="border-color: #f3f4f6;"></div>
            <button
              class="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-gray-50"
              style="color: #6b7280;"
              @click="() => { removeCard(metric.key); openDropdown = null }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Remove card
            </button>
          </div>
        </div>

      <div>
        <div class="text-2xl font-semibold tabular-nums" style="color: #111827;">{{ metric.value }}</div>
        <div class="text-xs font-medium mt-0.5" style="color: #6b7280;">{{ metric.label }}</div>
      </div>

      <div
        class="text-xs font-medium"
        :style="metric.deltaPositive === true ? 'color: #15803d;' : metric.deltaPositive === false ? 'color: #dc2626;' : 'color: #6b7280;'"
      >
        {{ metric.delta }}
      </div>
    </div>

    <!-- Add card slot -->
    <div v-if="visibleKeys.length < MAX_CARDS" class="relative">
      <button
        class="w-full border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors"
        style="background: #fff; border-color: #e5e7eb; color: #6b7280; min-height: 120px;"
        @click.stop="addDropdownOpen = !addDropdownOpen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="text-xs font-medium">Add metric</span>
      </button>
      <div
        v-if="addDropdownOpen"
        class="absolute left-0 z-50 rounded-lg border shadow-lg py-1"
        style="top: calc(100% + 4px); min-width: 220px; background: #fff; border-color: #e5e7eb;"
      >
        <div class="px-2 py-1.5 text-xs font-medium" style="color: #6b7280;">Add a metric card</div>
        <div class="border-t mx-1 my-1" style="border-color: #f3f4f6;"></div>
        <button
          v-for="m in availableToAdd"
          :key="m.key"
          class="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-gray-50"
          style="color: #111827;"
          @click="() => { addCard(m.key); addDropdownOpen = false }"
        >
          <div class="w-5 h-5 rounded flex items-center justify-center shrink-0" :style="`background: ${m.iconBg};`">
            <div class="w-2 h-2 rounded-full" :style="`background: ${m.iconColor};`" />
          </div>
          {{ m.label }}
        </button>
      </div>
    </div>
  </div>
</template>
