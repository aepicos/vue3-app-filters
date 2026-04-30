<script setup lang="ts">
import AssetManagementPage from './components/AssetManagementPage.vue'

const navItems = [
  { label: 'Analytics', active: false },
  { label: 'Inventory', active: true },
  { label: 'Projects', active: false },
  { label: 'Issues', active: false },
  { label: 'Policies', active: false },
]

const secondaryNavItems = [
  { label: 'Coverage', active: false },
  { label: 'Asset Management', active: true },
  { label: 'Dependencies', active: false },
  { label: 'Components', active: false },
]
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white" style="font-family: system-ui, -apple-system, sans-serif;">
    <!-- Primary icon sidebar -->
    <aside
      class="flex flex-col items-center shrink-0 border-r bg-white"
      style="width: 72px; border-color: #e5e7eb;"
      aria-label="Primary navigation"
    >
      <!-- Snyk wordmark -->
      <div class="flex items-center justify-center w-full border-b" style="height: 56px; border-color: #e5e7eb;">
        <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: #6366f1;">snyk</span>
      </div>

      <!-- Nav items -->
      <nav class="flex flex-col items-center gap-0.5 flex-1 pt-4 w-full px-2">
        <button
          v-for="item in navItems"
          :key="item.label"
          :title="item.label"
          :aria-label="item.label"
          class="flex flex-col items-center gap-1.5 w-full py-2 rounded transition-colors"
        >
          <div
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            :style="item.active ? 'border: 1px solid #e5e7eb; background: #fff;' : ''"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              class="w-5 h-5"
              :style="item.active ? 'color: #111827;' : 'color: #9ca3af;'"
            >
              <template v-if="item.label === 'Analytics'">
                <rect x="3" y="10" width="4" height="10" rx="1" />
                <rect x="10" y="6" width="4" height="14" rx="1" />
                <rect x="17" y="3" width="4" height="17" rx="1" />
              </template>
              <template v-else-if="item.label === 'Inventory'">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </template>
              <template v-else-if="item.label === 'Projects'">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </template>
              <template v-else-if="item.label === 'Issues'">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </template>
              <template v-else>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </template>
            </svg>
          </div>
          <span
            class="text-[11px] font-medium leading-none"
            :style="item.active ? 'color: #111827;' : 'color: #9ca3af;'"
          >{{ item.label }}</span>
        </button>
      </nav>

      <!-- Bottom icons -->
      <div class="flex flex-col items-center gap-1 pb-4 px-2 w-full">
        <button title="Settings" class="w-9 h-9 flex items-center justify-center rounded-lg" style="color: #9ca3af;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        <button title="Help" class="w-9 h-9 flex items-center justify-center rounded-lg" style="color: #9ca3af;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Right side: top nav + content -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Top navigation bar -->
      <div
        class="flex items-center justify-between px-4 bg-white border-b shrink-0"
        style="height: 56px; border-color: #e5e7eb;"
      >
        <div class="flex items-center gap-1">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style="background: #f3f4f6; color: #111827;"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Snyk
          </button>
          <span style="color: #9ca3af; margin: 0 4px;">/</span>
          <button class="flex items-center gap-1.5 px-2 py-1.5 text-sm" style="color: #6b7280;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
            </svg>
            All groups
          </button>
          <span style="color: #9ca3af; margin: 0 4px;">/</span>
          <button class="flex items-center gap-1.5 px-2 py-1.5 text-sm" style="color: #6b7280;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            All organizations
          </button>
        </div>
        <div class="flex items-center gap-1">
          <button class="w-9 h-9 flex items-center justify-center" style="color: #6b7280;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <button class="w-9 h-9 flex items-center justify-center" style="color: #6b7280;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center ml-1"
            style="background: #6366f1;"
          >
            <span style="color: white; font-size: 12px; font-weight: 600;">JB</span>
          </div>
        </div>
      </div>

      <!-- Content row: secondary sidebar + main -->
      <div class="flex flex-1 overflow-hidden min-w-0">
        <!-- Secondary sidebar -->
        <aside
          class="flex flex-col shrink-0 border-r bg-white overflow-hidden"
          style="width: 224px; border-color: #e5e7eb;"
          aria-label="Secondary navigation"
        >
          <nav class="flex flex-col gap-0.5 px-2 pt-3 pb-2">
            <button
              v-for="item in secondaryNavItems"
              :key="item.label"
              class="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-left"
              :style="item.active
                ? 'background: #f3f4f6; font-weight: 500; color: #111827;'
                : 'color: #6b7280;'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 shrink-0">
                <template v-if="item.label === 'Coverage'">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </template>
                <template v-else-if="item.label === 'Asset Management'">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </template>
                <template v-else-if="item.label === 'Dependencies'">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <path d="M11 18H8a2 2 0 0 1-2-2V9" />
                </template>
                <template v-else>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </template>
              </svg>
              <span class="truncate">{{ item.label }}</span>
              <svg
                v-if="item.active"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                class="w-3.5 h-3.5 ml-auto"
                style="color: #9ca3af;"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </nav>
        </aside>

        <!-- Main content -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <AssetManagementPage />
        </div>
      </div>
    </div>
  </div>
</template>
