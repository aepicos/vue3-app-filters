<script setup lang="ts">
import { ref } from 'vue'
import BillboardCards from './BillboardCards.vue'
import AssetTable from './AssetTable.vue'
import FilterBar from './FilterBar.vue'
import { FILTERS, type FilterChip } from '../data/filters'

const TABS = [
  'All assets',
  'Repositories',
  'Container images',
  'Packages',
  'API',
  'Web applications',
]

const activeTab = ref('All assets')
const search = ref('')

const filters = ref<FilterChip[]>([])

function removeFilter(id: string) {
  filters.value = filters.value.filter((f) => f.id !== id)
}

function addFilter(chip: FilterChip) {
  filters.value.push(chip)
}

function setOperator(id: string, operator: string) {
  const chip = filters.value.find((f) => f.id === id)
  if (chip) chip.operator = operator
}

function setValue(id: string, value: string) {
  const chip = filters.value.find((f) => f.id === id)
  if (chip) chip.value = value
}
</script>

<template>
  <main
    class="flex flex-col flex-1 min-h-screen overflow-y-auto overflow-x-hidden"
    style="background: #f9fafb;"
  >
    <!-- Page header -->
    <div
      class="flex items-center justify-between px-6 border-b shrink-0"
      style="height: 56px; background: #fff; border-color: #e5e7eb;"
    >
      <div class="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5" style="color: #6b7280;">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <h1 class="text-sm font-semibold" style="color: #111827; margin: 0;">Asset Management</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors"
          style="color: #374151; border-color: #d1d5db; background: #fff;"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save view
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors"
          style="color: #374151; border-color: #d1d5db; background: #fff;"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Copy link
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div
      class="flex items-center gap-0 px-6 border-b shrink-0"
      style="background: #fff; border-color: #e5e7eb;"
    >
      <button
        v-for="tab in TABS"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
        :style="activeTab === tab
          ? 'border-color: #111827; color: #111827;'
          : 'border-color: transparent; color: #6b7280;'"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Filter bar -->
    <FilterBar
      :filters="filters"
      @remove="removeFilter"
      @add="addFilter"
      @set-operator="setOperator"
      @set-value="setValue"
    />

    <!-- Content area -->
    <div class="flex flex-col gap-4 px-6 pt-6 pb-8 flex-1">
      <!-- Billboard cards -->
      <BillboardCards />


      <!-- Data table — sticky so it never scrolls below viewport -->
      <div
        class="sticky top-0 flex flex-col"
        style="height: calc(100vh - 56px - 2rem);"
      >
        <AssetTable :search="search" :filters="filters" />
      </div>
    </div>
  </main>
</template>
