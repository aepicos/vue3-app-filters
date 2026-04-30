<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { FilterChip, FilterCondition, AdvancedQuery } from '../data/filters'

/* ============================================================
   PROPS
   ============================================================ */

const props = defineProps<{
  search?: string
  filters?: FilterChip[]
  advancedQuery?: AdvancedQuery | null
}>()

/* ============================================================
   CONSTANTS
   ============================================================ */

const PAGE_SIZE = 100

type ColId =
  | 'select'
  | 'name'
  | 'type'
  | 'assetClass'
  | 'issueCounts'
  | 'riskScore'
  | 'coverage'
  | 'team'
  | 'language'
  | 'environment'
  | 'lastScan'
  | 'source'
  | 'visibility'
  | 'actions'

interface ColDef {
  id: ColId
  label: string
  width: number
  sticky: boolean
  visible: boolean
  sortable: boolean
}

const INITIAL_COLUMNS: ColDef[] = [
  { id: 'select',      label: '',            width: 48,  sticky: true,  visible: true,  sortable: false },
  { id: 'name',        label: 'Asset name',  width: 260, sticky: true,  visible: true,  sortable: true  },
  { id: 'type',        label: 'Type',        width: 140, sticky: false, visible: true,  sortable: true  },
  { id: 'assetClass',  label: 'Class',       width: 80,  sticky: false, visible: true,  sortable: true  },
  { id: 'issueCounts', label: 'Issues',      width: 200, sticky: false, visible: true,  sortable: false },
  { id: 'riskScore',   label: 'Risk score',       width: 100, sticky: false, visible: true,  sortable: true  },
  { id: 'coverage',    label: 'Coverage',    width: 180, sticky: false, visible: true,  sortable: false },
  { id: 'team',        label: 'Team',        width: 200, sticky: false, visible: true,  sortable: true  },
  { id: 'language',    label: 'Language',    width: 110, sticky: false, visible: false, sortable: true  },
  { id: 'environment', label: 'Environment', width: 110, sticky: false, visible: false, sortable: true  },
  { id: 'lastScan',    label: 'Last scan',   width: 120, sticky: false, visible: false, sortable: false },
  { id: 'source',      label: 'Source',      width: 130, sticky: false, visible: false, sortable: false },
  { id: 'visibility',  label: 'Visibility',  width: 100, sticky: false, visible: false, sortable: true  },
  { id: 'actions',     label: '',            width: 56,  sticky: false, visible: true,  sortable: false },
]

/* ============================================================
   DATA TYPES
   ============================================================ */

type AssetType = 'API' | 'Application' | 'Container image' | 'Package' | 'Repository' | 'SBOM' | 'Service' | 'Website'
type TeamName = 'Legendary Shack Shakers' | 'Love and Rockets' | 'Nouvelle Vague' | 'Public Service Broadcasting' | 'The Bad Seeds' | 'Trimdon Grange Explosion'
type LanguageName = 'C#' | 'Go' | 'Java' | 'Javascript' | 'Python' | 'Ruby' | 'Typescript'

interface AssetItem {
  id: string
  name: string
  assetClass: string
  type: AssetType
  issues: { critical: number; high: number; medium: number; low: number }
  riskScore: number
  coverage: string[]
  team: TeamName
  language: LanguageName
  source: string[]
  environment: string
  firstSeen: string
  lastScan: string
  visibility: string
  activityStatus: string
  ecosystem: string
  lifecycleStage: string
  fixability: string
  exploitability: string
  issueType: string
  license: string
  licenseType: string
  tags: string[]
}

/* ============================================================
   DATA GENERATOR
   ============================================================ */

const NAMES = [
  'auth-service','payment-api','user-service','notification-svc','reporting-api',
  'search-svc','ml-inference','data-pipeline','config-service','gateway-api',
  'frontend-app','admin-console','billing-svc','analytics-api','asset-manager',
  'secret-manager','cert-rotator','log-aggregator','event-bus','scheduler-svc',
  'cache-service','queue-worker','batch-processor','file-storage','image-resize',
  'email-service','sms-gateway','push-notification','webhook-relay','rate-limiter',
  'feature-flags','ab-testing','session-svc','token-service','audit-log',
  'compliance-checker','vuln-scanner','dep-tracker','sbom-generator','policy-engine',
  'k8s-operator','helm-chart','terraform-module','ansible-role','docker-base-img',
  'nginx-proxy','haproxy-lb','istio-config','envoy-filter','otel-collector',
]

const TEAMS: TeamName[] = [
  'Legendary Shack Shakers','Love and Rockets','Nouvelle Vague',
  'Public Service Broadcasting','The Bad Seeds','Trimdon Grange Explosion',
]

const LANGUAGES: LanguageName[] = ['C#', 'Go', 'Java', 'Javascript', 'Python', 'Ruby', 'Typescript']
const CLASS_CYCLE = ['A','B','C','C','D','B','C','D','B','C','A','C','D','B','C','D','C','B','D','C']
const TYPES: AssetType[] = ['API','Application','Container image','Package','Repository','SBOM','Service','Website']
const ENVS = ['Production','Staging','Development','Testing']
const VISIBILITIES = ['Public','Private','Internal']
const COVERAGE_TYPES = ['SCM','SAST','Secrets','DAST','Container','IaC']
const SOURCE_TYPES = ['SCM','CLI','CI/CD','Docker','Registry','API']
const LAST_SCAN_LABELS = [
  'just now','15 min ago','1 hour ago','3 hours ago','6 hours ago','12 hours ago',
  '1 day ago','2 days ago','5 days ago','8 days ago','14 days ago','21 days ago','30+ days ago',
]
const NAME_SUFFIXES = ['','-v2','-prod','-staging','-svc','-api','-worker','-gateway','']
const REFERENCE_DATE = new Date('2026-04-20')

const COVERAGE_ABBREV: Record<string, string> = {
  SCM: 'SCM', SAST: 'SAT', Secrets: 'SEC', DAST: 'DST', Container: 'CTR', IaC: 'IaC',
}

const LIFECYCLE_STAGES = ['Experimental', 'Active', 'Deprecated', 'Retired']
const FIXABILITIES = ['Fix available', 'No fix', 'Workaround']
const EXPLOITABILITIES = ['Known exploit', 'Proof of concept', 'None']
const ISSUE_TYPES = ['Code quality', 'License', 'Misconfiguration', 'Vulnerability']
const LICENSES = ['Apache 2.0', 'BSD 3-Clause', 'GPL', 'LGPL', 'MIT', 'MPL 2.0', 'Unlicense']
const LICENSE_TYPE_MAP: Record<string, string> = {
  'Apache 2.0': 'Permissive',
  'BSD 3-Clause': 'Permissive',
  'MIT': 'Permissive',
  'Unlicense': 'Permissive',
  'MPL 2.0': 'Weak copyleft',
  'LGPL': 'Weak copyleft',
  'GPL': 'Strong copyleft',
}
const LANG_ECOSYSTEM: Record<LanguageName, string> = {
  'Java': 'Maven', 'Javascript': 'npm', 'Typescript': 'npm',
  'Python': 'PyPI', 'Go': 'Go', 'C#': 'NuGet', 'Ruby': 'RubyGems',
}
const ALL_TAGS = ['pci-dss','hipaa','gdpr','soc2','internal-tool','customer-facing','ml-model','data-processing','auth','payments','legacy','greenfield']

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getBitmaskSubset(arr: string[], bitmask: number): string[] {
  const result: string[] = []
  for (let j = 0; j < arr.length; j++) {
    if (bitmask & (1 << j)) result.push(arr[j])
  }
  return result
}

function getSecondaryLine(item: AssetItem): string {
  const name = item.name
  switch (item.type) {
    case 'Repository':      return `github.com/org/${name}`
    case 'Container image': return `docker.io/org/${name}`
    case 'Package':         return item.language === 'Java' ? `pkg:maven/${name}` : `pkg:npm/${name}`
    case 'API':             return `${name}.api.internal`
    case 'SBOM':            return item.id
    case 'Service':         return `${name}.svc.cluster.local`
    case 'Website':         return `https://${name}.io`
    case 'Application':     return `app:${name}`
    default:                return name
  }
}

function generateDataset(): AssetItem[] {
  const items: AssetItem[] = []
  for (let i = 0; i < 10473; i++) {
    const assetClass = CLASS_CYCLE[i % CLASS_CYCLE.length]
    let critIssues: number, highIssues: number, medIssues: number, lowIssues: number
    if (assetClass === 'A') {
      critIssues = (i % 5) + 8;  highIssues = (i % 7) + 10; medIssues = (i % 8) + 12; lowIssues = (i % 10) + 5
    } else if (assetClass === 'B') {
      critIssues = (i % 6) + 6;  highIssues = (i % 7) + 8;  medIssues = (i % 8) + 10; lowIssues = (i % 10) + 5
    } else if (assetClass === 'C') {
      critIssues = (i % 6) + 8;  highIssues = (i % 7) + 10; medIssues = (i % 8) + 12; lowIssues = (i % 10) + 5
    } else {
      critIssues = (i % 4) + 2;  highIssues = (i % 6) + 4;  medIssues = (i % 8) + 6;  lowIssues = (i % 10) + 5
    }

    const classMultiplier = assetClass === 'A' ? 4 : assetClass === 'B' ? 3 : assetClass === 'C' ? 2 : 1
    const riskScore = Math.min(1000, (critIssues * 10 + highIssues * 7 + medIssues * 4 + lowIssues * 1) * classMultiplier)

    const nameBase = NAMES[i % NAMES.length]
    const cycle = Math.floor(i / NAMES.length)
    const suffix = NAME_SUFFIXES[i % NAME_SUFFIXES.length]
    const namePart = cycle > 0 ? String(cycle).padStart(2, '0') : ''
    const name = nameBase + (namePart ? '-' + namePart : '') + suffix

    const coverageMask = i % 64
    const coverage = getBitmaskSubset(COVERAGE_TYPES, coverageMask || 1)
    const sourceMask = (i * 7) % 64
    const source = getBitmaskSubset(SOURCE_TYPES, sourceMask || 1)

    let activityStatus: string
    const actMod = i % 10
    if (actMod < 7) activityStatus = 'Active'
    else if (actMod < 9) activityStatus = 'Inactive'
    else activityStatus = 'Stale'

    const daysAgo = 10473 - i
    const firstSeenDate = new Date(REFERENCE_DATE)
    firstSeenDate.setDate(firstSeenDate.getDate() - daysAgo)

    const lang = LANGUAGES[i % LANGUAGES.length]
    const lic = LICENSES[i % LICENSES.length]
    const tagMask = (i * 13) % (1 << ALL_TAGS.length)
    const tags = ALL_TAGS.filter((_, j) => tagMask & (1 << j)).slice(0, 3)

    items.push({
      id: 'asset-' + String(i + 1).padStart(5, '0'),
      name,
      assetClass,
      type: TYPES[i % TYPES.length],
      issues: { critical: critIssues, high: highIssues, medium: medIssues, low: lowIssues },
      riskScore,
      coverage,
      team: TEAMS[i % TEAMS.length],
      language: lang,
      source,
      environment: ENVS[(i * 3) % ENVS.length],
      firstSeen: formatDate(firstSeenDate),
      lastScan: LAST_SCAN_LABELS[i % LAST_SCAN_LABELS.length],
      visibility: VISIBILITIES[i % 3],
      activityStatus,
      ecosystem: LANG_ECOSYSTEM[lang],
      lifecycleStage: LIFECYCLE_STAGES[(i * 3) % LIFECYCLE_STAGES.length],
      fixability: FIXABILITIES[i % FIXABILITIES.length],
      exploitability: EXPLOITABILITIES[(i * 7) % EXPLOITABILITIES.length],
      issueType: ISSUE_TYPES[(i * 5) % ISSUE_TYPES.length],
      license: lic,
      licenseType: LICENSE_TYPE_MAP[lic] ?? 'Proprietary',
      tags: tags.length ? tags : [ALL_TAGS[i % ALL_TAGS.length]],
    })
  }
  return items
}

// Generated at module level — fine for prototype
const DATASET = generateDataset()

/* ============================================================
   MOCK API
   ============================================================ */

interface PageResult {
  items: AssetItem[]
  nextCursor: number
  hasMore: boolean
}

interface GroupMeta {
  id: string
  label: string
  count: number
  issues: { critical: number; high: number; medium: number; low: number }
}

interface GroupState extends GroupMeta {
  expanded: boolean
  items: AssetItem[]
  cursor: number
  hasMore: boolean
  loading: boolean
}

function fetchPage(allItems: AssetItem[], cursor: number, signal?: AbortSignal): Promise<PageResult> {
  return new Promise((resolve, reject) => {
    const delay = 200 + (cursor === 0 ? 100 : 0)
    const t = setTimeout(() => {
      const slice = allItems.slice(cursor, cursor + PAGE_SIZE)
      resolve({ items: slice, nextCursor: cursor + slice.length, hasMore: cursor + slice.length < allItems.length })
    }, delay)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }
  })
}

function computeGroups(allItems: AssetItem[], groupByField: string): GroupMeta[] {
  const map = new Map<string, GroupMeta>()
  for (const item of allItems) {
    const key = String((item as unknown as Record<string, unknown>)[groupByField])
    if (!map.has(key)) {
      map.set(key, { id: key, label: key, count: 0, issues: { critical: 0, high: 0, medium: 0, low: 0 } })
    }
    const g = map.get(key)!
    g.count++
    g.issues.critical += item.issues.critical
    g.issues.high += item.issues.high
    g.issues.medium += item.issues.medium
    g.issues.low += item.issues.low
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function fetchGroupMetadata(allItems: AssetItem[], groupByField: string): Promise<GroupMeta[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(computeGroups(allItems, groupByField)), 300)
  })
}

function fetchGroupPage(allItems: AssetItem[], groupId: string, groupByField: string, cursor: number): Promise<PageResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const groupItems = allItems.filter(
        (item) => String((item as unknown as Record<string, unknown>)[groupByField]) === groupId
      )
      const slice = groupItems.slice(cursor, cursor + PAGE_SIZE)
      resolve({ items: slice, nextCursor: cursor + slice.length, hasMore: cursor + slice.length < groupItems.length })
    }, 250)
  })
}

/* ============================================================
   REACTIVE STATE
   ============================================================ */

type SelMode = 'none' | 'some' | 'all'
type Density = 'comfortable' | 'compact'
type SortDir = 'asc' | 'desc'

const columns = ref<ColDef[]>(INITIAL_COLUMNS.map((c) => ({ ...c })))
const density = ref<Density>('comfortable')
const groupBy = ref<string | null>(null)
const sortCol = ref<ColId | null>(null)
const sortDir = ref<SortDir>('asc')

// Selection
const selMode = ref<SelMode>('none')
const selIncluded = ref<Set<string>>(new Set())
const selExcluded = ref<Set<string>>(new Set())

// Flat mode
const flatItems = ref<AssetItem[]>([])
const flatCursor = ref(0)
const flatHasMore = ref(true)
const flatLoading = ref(false)

// Group mode
const groups = ref<GroupState[]>([])

// UI state
const colPanelOpen = ref(false)
const scrolledX = ref(false)
const loadStatus = ref('')

// Refs
const scrollWrapperRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const headerCheckboxRef = ref<HTMLInputElement | null>(null)

// AbortController for inflight requests
let abortCtrl: AbortController | null = null
let mainObserver: IntersectionObserver | null = null

/* ============================================================
   COMPUTED
   ============================================================ */

function applyChip(item: AssetItem, chip: FilterChip): boolean {
  const op = chip.operator
  const val = chip.value
  switch (chip.filterId) {
    case 'asset-type':
      return op === 'is' ? item.type === val : item.type !== val
    case 'asset-class':
      return op === 'is' ? item.assetClass === val : item.assetClass !== val
    case 'environment':
      return op === 'is' ? item.environment === val : item.environment !== val
    case 'team':
      return op === 'is' ? item.team === val : item.team !== val
    case 'language':
      return op === 'is' ? item.language === val : item.language !== val
    case 'exposure':
      return op === 'is' ? item.visibility === val : item.visibility !== val
    case 'issue-severity': {
      const has =
        val === 'Critical' ? item.issues.critical > 0 :
        val === 'High'     ? item.issues.high > 0 :
        val === 'Medium'   ? item.issues.medium > 0 :
        val === 'Low'      ? item.issues.low > 0 : false
      return op === 'is' ? has : !has
    }
    case 'risk-score': {
      const n = Number(val)
      if (isNaN(n)) return true
      if (op === '>') return item.riskScore > n
      if (op === '<') return item.riskScore < n
      if (op === '=') return item.riskScore === n
      return true
    }
    case 'ecosystem':
      return op === 'is' ? item.ecosystem === val : item.ecosystem !== val
    case 'lifecycle-stage':
      return op === 'is' ? item.lifecycleStage === val : item.lifecycleStage !== val
    case 'fixability':
      return op === 'is' ? item.fixability === val : item.fixability !== val
    case 'exploitability':
      return op === 'is' ? item.exploitability === val : item.exploitability !== val
    case 'issue-type':
      return op === 'is' ? item.issueType === val : item.issueType !== val
    case 'license':
      return op === 'is' ? item.license === val : item.license !== val
    case 'license-type':
      return op === 'is' ? item.licenseType === val : item.licenseType !== val
    case 'tag': {
      const lower = val.toLowerCase()
      if (op === 'is') return item.tags.some((t) => t.toLowerCase() === lower)
      if (op === 'is not') return !item.tags.some((t) => t.toLowerCase() === lower)
      const match = item.tags.some((t) => t.toLowerCase().includes(lower))
      return op === 'contains' ? match : !match
    }
    default:
      return true
  }
}

function applyAdvancedQuery(item: AssetItem, query: AdvancedQuery): boolean {
  if (query.groups.length === 0) return true
  const matchGroup = (group: { operator: 'AND' | 'OR'; conditions: FilterCondition[] }): boolean => {
    if (group.conditions.length === 0) return true
    return group.operator === 'AND'
      ? group.conditions.every((c) => applyChip(item, c))
      : group.conditions.some((c) => applyChip(item, c))
  }
  return query.groupOperator === 'AND'
    ? query.groups.every(matchGroup)
    : query.groups.some(matchGroup)
}

const filteredDataset = computed<AssetItem[]>(() => {
  let result: AssetItem[] = DATASET

  const q = props.search?.trim().toLowerCase()
  if (q) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.team.toLowerCase().includes(q) ||
      item.environment.toLowerCase().includes(q)
    )
  }

  if (props.advancedQuery && props.advancedQuery.groups.length > 0) {
    const aq = props.advancedQuery
    result = result.filter((item) => applyAdvancedQuery(item, aq))
  } else {
    const chips = props.filters ?? []
    if (chips.length) {
      const chipGroups = new Map<string, FilterChip[]>()
      for (const chip of chips) {
        const key = chip.filterId ?? chip.id
        if (!chipGroups.has(key)) chipGroups.set(key, [])
        chipGroups.get(key)!.push(chip)
      }
      result = result.filter((item) =>
        Array.from(chipGroups.values()).every((group) =>
          group.some((chip) => applyChip(item, chip))
        )
      )
    }
  }

  return result
})

const visibleCols = computed(() => columns.value.filter((c) => c.visible))

const colTemplate = computed(() => visibleCols.value.map((c) => c.width + 'px').join(' '))

const gridStyle = computed(() => ({ '--col-template': colTemplate.value }))

const sortedFlatItems = computed<AssetItem[]>(() => {
  if (!sortCol.value) return flatItems.value
  const col = sortCol.value
  return [...flatItems.value].sort((a, b) => {
    let cmp = 0
    if (col === 'riskScore') {
      cmp = a.riskScore - b.riskScore
    } else {
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      cmp = aVal.localeCompare(bVal)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

// Selection helpers
function isSelected(id: string): boolean {
  if (selMode.value === 'none') return false
  if (selMode.value === 'all') return !selExcluded.value.has(id)
  return selIncluded.value.has(id)
}

const selectedCount = computed((): number => {
  if (selMode.value === 'none') return 0
  if (selMode.value === 'all') return filteredDataset.value.length - selExcluded.value.size
  return selIncluded.value.size
})

const selectionDesc = computed((): string => {
  if (selMode.value === 'none') return '0 items selected'
  if (selMode.value === 'all') {
    const exc = selExcluded.value.size
    return exc > 0 ? `All items selected (${exc} excluded)` : 'All items in this view selected'
  }
  return `${selIncluded.value.size} items selected`
})

const hasSelection = computed(() => selectedCount.value > 0)

const headerCbAllChecked = computed(() => selMode.value === 'all' && selExcluded.value.size === 0)
const headerCbIndeterminate = computed(() => !headerCbAllChecked.value && selMode.value !== 'none')

/* ============================================================
   SELECTION ACTIONS
   ============================================================ */

function toggleItem(id: string) {
  if (selMode.value === 'all') {
    const next = new Set(selExcluded.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selExcluded.value = next
  } else {
    const next = new Set(selIncluded.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selIncluded.value = next
    selMode.value = next.size === 0 ? 'none' : 'some'
  }
}

function selectAll() {
  selMode.value = 'all'
  selExcluded.value = new Set()
}

function deselectAll() {
  selMode.value = 'none'
  selIncluded.value = new Set()
  selExcluded.value = new Set()
}

function toggleGroupItems(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group || group.items.length === 0) return
  const allSel = group.items.every((item) => isSelected(item.id))
  if (allSel) {
    if (selMode.value === 'all') {
      const next = new Set(selExcluded.value)
      group.items.forEach((item) => next.add(item.id))
      selExcluded.value = next
    } else {
      const next = new Set(selIncluded.value)
      group.items.forEach((item) => next.delete(item.id))
      if (next.size === 0) selMode.value = 'none'
      selIncluded.value = next
    }
  } else {
    if (selMode.value === 'all') {
      const next = new Set(selExcluded.value)
      group.items.forEach((item) => next.delete(item.id))
      selExcluded.value = next
    } else {
      selMode.value = 'some'
      const next = new Set(selIncluded.value)
      group.items.forEach((item) => next.add(item.id))
      selIncluded.value = next
    }
  }
}

/* ============================================================
   SORT
   ============================================================ */

function handleSort(colId: ColId) {
  if (sortCol.value === colId) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = colId
    sortDir.value = 'asc'
  }
}

/* ============================================================
   COLUMN VISIBILITY
   ============================================================ */

function toggleColVisibility(colId: ColId) {
  columns.value = columns.value.map((c) =>
    c.id === colId && !c.sticky ? { ...c, visible: !c.visible } : c
  )
}

/* ============================================================
   FLAT LOADING
   ============================================================ */

async function loadMoreFlat() {
  if (flatLoading.value || !flatHasMore.value || groupBy.value) return
  flatLoading.value = true
  abortCtrl = new AbortController()
  loadStatus.value = 'Loading assets…'
  try {
    const result = await fetchPage(filteredDataset.value, flatCursor.value, abortCtrl.signal)
    flatItems.value = [...flatItems.value, ...result.items]
    flatCursor.value = result.nextCursor
    flatHasMore.value = result.hasMore
    loadStatus.value = result.hasMore
      ? `Loaded ${result.nextCursor.toLocaleString()} of ${filteredDataset.value.length.toLocaleString()} assets`
      : `All ${filteredDataset.value.length.toLocaleString()} assets loaded`
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') {
      loadStatus.value = 'Error loading assets.'
    }
  } finally {
    flatLoading.value = false
    abortCtrl = null
  }
}

/* ============================================================
   GROUP LOADING
   ============================================================ */

async function loadGroupMeta(gBy: string) {
  loadStatus.value = 'Loading groups…'
  const metas = await fetchGroupMetadata(filteredDataset.value, gBy)
  groups.value = metas.map((g) => ({
    ...g,
    expanded: false,
    items: [],
    cursor: 0,
    hasMore: true,
    loading: false,
  }))
  loadStatus.value = `${metas.length} groups loaded`
}

async function loadGroupItems(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group || group.loading || !group.hasMore) return

  groups.value = groups.value.map((g) => g.id === groupId ? { ...g, loading: true } : g)

  try {
    const result = await fetchGroupPage(filteredDataset.value, groupId, groupBy.value!, group.cursor)
    groups.value = groups.value.map((g) => {
      if (g.id !== groupId) return g
      return { ...g, items: [...g.items, ...result.items], cursor: result.nextCursor, hasMore: result.hasMore, loading: false }
    })
  } catch (err) {
    console.error('Group load error:', err)
    groups.value = groups.value.map((g) => g.id === groupId ? { ...g, loading: false } : g)
  }
}

function toggleGroupExpand(groupId: string) {
  const group = groups.value.find((g) => g.id === groupId)
  const wasExpanded = group?.expanded ?? false
  groups.value = groups.value.map((g) =>
    g.id === groupId ? { ...g, expanded: !g.expanded } : g
  )
  if (!wasExpanded && group && group.items.length === 0) {
    setTimeout(() => loadGroupItems(groupId), 0)
  }
}

/* ============================================================
   RESET ON DATASET / GROUPBY CHANGE
   ============================================================ */

function resetAndReload() {
  abortCtrl?.abort()
  flatItems.value = []
  flatCursor.value = 0
  flatHasMore.value = true
  flatLoading.value = false
  loadStatus.value = ''
  groups.value = []

  if (groupBy.value) {
    loadGroupMeta(groupBy.value)
  } else {
    // trigger flat load via observer or direct call
    nextTick(() => loadMoreFlat())
  }
}

watch(() => props.search, resetAndReload)
watch(() => props.filters, resetAndReload, { deep: true })
watch(() => props.advancedQuery, resetAndReload, { deep: true })
watch(() => groupBy.value, resetAndReload)

/* ============================================================
   MAIN INTERSECTION OBSERVER (flat mode sentinel)
   ============================================================ */

function setupMainObserver() {
  mainObserver?.disconnect()
  mainObserver = null
  if (!sentinelRef.value || groupBy.value) return

  mainObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !flatLoading.value && flatHasMore.value) {
        loadMoreFlat()
      }
    },
    { rootMargin: '200px' }
  )
  mainObserver.observe(sentinelRef.value)
}

/* ============================================================
   GROUP SENTINEL OBSERVER
   ============================================================ */

// Map of groupId -> observer
const groupObservers = new Map<string, IntersectionObserver>()

function setupGroupSentinel(el: Element | null, groupId: string) {
  if (!el) return
  // Clean up existing observer for this group
  groupObservers.get(groupId)?.disconnect()

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadGroupItems(groupId)
      }
    },
    { rootMargin: '200px' }
  )
  obs.observe(el)
  groupObservers.set(groupId, obs)
}

function cleanupGroupObservers() {
  groupObservers.forEach((obs) => obs.disconnect())
  groupObservers.clear()
}

/* ============================================================
   HEADER CHECKBOX INDETERMINATE
   ============================================================ */

watch(headerCbIndeterminate, (val) => {
  if (headerCheckboxRef.value) {
    headerCheckboxRef.value.indeterminate = val
  }
})

/* ============================================================
   SCROLL HANDLER
   ============================================================ */

function onScroll() {
  scrolledX.value = (scrollWrapperRef.value?.scrollLeft ?? 0) > 0
}

/* ============================================================
   CLICK OUTSIDE to close col panel
   ============================================================ */

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.at-toolbar-item')) {
    colPanelOpen.value = false
  }
}

function handleKeyEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') colPanelOpen.value = false
}

/* ============================================================
   LIFECYCLE
   ============================================================ */

let scrollWrapperRo: ResizeObserver | null = null

onMounted(() => {
  // Initial load
  loadMoreFlat()
  nextTick(() => setupMainObserver())
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyEsc)

  nextTick(() => {
    const el = scrollWrapperRef.value
    if (!el) return
    const update = () => el.style.setProperty('--scroll-wrapper-width', el.clientWidth + 'px')
    update()
    scrollWrapperRo = new ResizeObserver(update)
    scrollWrapperRo.observe(el)
  })
})

onUnmounted(() => {
  mainObserver?.disconnect()
  cleanupGroupObservers()
  scrollWrapperRo?.disconnect()
  abortCtrl?.abort()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyEsc)
})

// Re-setup sentinel when sentinel mounts
watch(sentinelRef, (el) => {
  if (el && !groupBy.value) {
    setupMainObserver()
  }
})

/* ============================================================
   HELPERS
   ============================================================ */

function scoreVariant(score: number): string {
  if (score === 0)   return 'none'
  if (score >= 750)  return 'critical'
  if (score >= 500)  return 'high'
  if (score >= 250)  return 'medium'
  return 'low'
}

function envClass(env: string): string {
  return env.toLowerCase().replace(' ', '-')
}

function ariaSortFor(col: ColDef): 'ascending' | 'descending' | 'none' | undefined {
  if (!col.sortable) return undefined
  if (sortCol.value === col.id) return sortDir.value === 'asc' ? 'ascending' : 'descending'
  return 'none'
}
</script>

<template>
  <div class="at-table-container">
    <!-- Table toolbar -->
    <div class="at-table-header">
      <div class="at-table-header__caption">
        <span class="at-table-header__title">Assets</span>
        <span class="at-table-header__divider">|</span>
        <span class="at-table-header__count">
          {{ filteredDataset.length.toLocaleString() }} assets
        </span>
      </div>
      <div class="at-table-header__actions">
        <!-- Group by -->
        <div class="at-segmented-control">
          <label for="at-group-select" class="at-segmented-control__label">Group by:</label>
          <select
            id="at-group-select"
            class="at-segmented-select"
            :value="groupBy ?? ''"
            @change="(e) => { groupBy = (e.target as HTMLSelectElement).value || null }"
          >
            <option value="">None</option>
            <option value="assetClass">Class</option>
            <option value="team">Team</option>
            <option value="type">Type</option>
            <option value="environment">Environment</option>
          </select>
        </div>

        <!-- Density toggle -->
        <div class="at-density-toggle" role="group" aria-label="Row density">
          <button
            class="at-density-btn"
            :class="{ active: density === 'comfortable' }"
            :aria-pressed="density === 'comfortable'"
            title="Comfortable density"
            @click="density = 'comfortable'"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="14" height="4" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="1" y="8" width="14" height="4" rx="1" fill="currentColor" opacity="0.4"/>
            </svg>
          </button>
          <button
            class="at-density-btn"
            :class="{ active: density === 'compact' }"
            :aria-pressed="density === 'compact'"
            title="Compact density"
            @click="density = 'compact'"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="1" y="6" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="1" y="10" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.4"/>
            </svg>
          </button>
        </div>

        <!-- Column toggle -->
        <div class="at-toolbar-item">
          <button
            class="at-icon-btn at-icon-btn--labeled"
            :aria-expanded="colPanelOpen"
            aria-haspopup="dialog"
            @click.stop="colPanelOpen = !colPanelOpen"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Columns
          </button>
          <div v-if="colPanelOpen" class="at-dropdown-panel" role="dialog" aria-label="Column visibility">
            <h3 class="at-dropdown-panel__title">Columns</h3>
            <label
              v-for="col in columns.filter(c => !c.sticky && c.id !== 'actions')"
              :key="col.id"
              class="at-col-vis-item"
            >
              <input
                type="checkbox"
                :checked="col.visible"
                @change="toggleColVisibility(col.id)"
              />
              {{ col.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Selection bar -->
    <div v-if="hasSelection" class="at-selection-bar" role="status">
      <span class="at-selection-bar__count">{{ selectionDesc }}</span>
      <button v-if="selMode !== 'all'" class="at-selection-bar__link" @click="selectAll">
        Select all {{ filteredDataset.length.toLocaleString() }}
      </button>
      <button class="at-selection-bar__link" @click="deselectAll">Deselect all</button>
    </div>

    <!-- Scroll wrapper -->
    <div
      ref="scrollWrapperRef"
      class="at-grid-scroll-wrapper"
      :class="{ 'at-scrolled-x': scrolledX }"
      @scroll="onScroll"
    >
      <!-- Grid -->
      <div
        role="grid"
        class="at-grid"
        :class="`at-density-${density}`"
        :style="(gridStyle as any)"
        :aria-rowcount="filteredDataset.length"
        :aria-colcount="visibleCols.length"
      >
        <!-- Header -->
        <div class="at-grid-head">
          <div role="row" class="at-header-row">
            <template v-for="(col, colIndex) in visibleCols" :key="col.id">
              <!-- Select column header -->
              <div
                v-if="col.id === 'select'"
                role="columnheader"
                data-col-id="select"
                class="at-cell"
                :aria-colindex="colIndex + 1"
              >
                <input
                  ref="headerCheckboxRef"
                  type="checkbox"
                  id="at-header-checkbox"
                  aria-label="Select all visible rows"
                  :checked="headerCbAllChecked"
                  @change="selMode === 'all' ? deselectAll() : selectAll()"
                />
              </div>
              <!-- Other column headers -->
              <div
                v-else
                role="columnheader"
                :data-col-id="col.id"
                class="at-cell"
                :class="{ 'at-sortable': col.sortable }"
                :aria-colindex="colIndex + 1"
                :aria-sort="ariaSortFor(col)"
                :tabindex="col.sortable ? 0 : undefined"
                @keydown.enter.prevent="col.sortable && handleSort(col.id)"
                @keydown.space.prevent="col.sortable && handleSort(col.id)"
              >
                <button
                  v-if="col.label && col.sortable"
                  class="at-col-sort-btn"
                  :aria-label="`Sort by ${col.label}`"
                  @click="handleSort(col.id)"
                >
                  {{ col.label }}
                  <span class="at-sort-indicator" aria-hidden="true" />
                </button>
                <span v-else-if="col.label">{{ col.label }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Body -->
        <div id="at-grid-body">
          <!-- Grouped mode -->
          <template v-if="groupBy">
            <div v-for="group in groups" :key="group.id">
              <!-- Group header -->
              <div
                role="row"
                class="at-group-header-row"
                :data-group-id="group.id"
                tabindex="0"
                :aria-expanded="group.expanded"
                @click="toggleGroupExpand(group.id)"
                @keydown.enter.prevent="toggleGroupExpand(group.id)"
                @keydown.space.prevent="toggleGroupExpand(group.id)"
              >
                <div role="gridcell" class="at-group-header-cell">
                  <input
                    type="checkbox"
                    class="at-group-checkbox"
                    :aria-label="`Select all in ${group.label}`"
                    :aria-checked="group.items.every(i => isSelected(i.id)) && group.items.length > 0 ? 'true' : group.items.some(i => isSelected(i.id)) ? 'mixed' : 'false'"
                    :checked="group.items.length > 0 && group.items.every(i => isSelected(i.id))"
                    @change.stop="toggleGroupItems(group.id)"
                    @click.stop
                    :ref="(el) => {
                      if (el && group.items.length > 0) {
                        const someSelected = group.items.some(i => isSelected(i.id))
                        const allSelected = group.items.every(i => isSelected(i.id))
                        ;(el as HTMLInputElement).indeterminate = someSelected && !allSelected
                      }
                    }"
                  />
                  <button
                    class="at-group-toggle"
                    :aria-expanded="group.expanded"
                    :aria-label="`${group.expanded ? 'Collapse' : 'Expand'} group ${group.label}`"
                    @click.stop="toggleGroupExpand(group.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <div class="at-group-header-cell__left">
                    <span class="at-group-header-cell__name">{{ group.label }}</span>
                    <span class="at-group-header-cell__count">({{ group.count }} assets)</span>
                  </div>
                  <div class="at-group-header-cell__right">
                    <span class="at-group-header-cell__metric" style="color: var(--at-critical);">
                      {{ group.issues.critical }}c critical
                    </span>
                    <span class="at-group-header-cell__metric">
                      Issues: {{ group.issues.high }}h {{ group.issues.medium }}m
                    </span>
                  </div>
                </div>
              </div>

              <!-- Group body -->
              <div v-if="group.expanded" :data-group-body="group.id" class="at-group-body">
                <div v-if="group.loading && group.items.length === 0" class="at-group-loading">
                  Loading…
                </div>
                <!-- Data rows -->
                <div
                  v-for="(item, idx) in group.items"
                  :key="item.id"
                  role="row"
                  :aria-rowindex="idx + 1"
                  :aria-selected="isSelected(item.id)"
                  :data-id="item.id"
                  class="at-data-row"
                  tabindex="0"
                >
                  <template v-for="col in visibleCols" :key="col.id">
                    <div role="gridcell" :data-col-id="col.id" class="at-cell">
                      <!-- select -->
                      <input
                        v-if="col.id === 'select'"
                        type="checkbox"
                        :aria-label="`Select ${item.name}`"
                        :checked="isSelected(item.id)"
                        @change.stop="toggleItem(item.id)"
                      />
                      <!-- name -->
                      <div v-else-if="col.id === 'name'" class="at-asset-name-cell">
                        <button class="at-asset-name-primary" :aria-label="`Open ${item.name}`">
                          {{ item.name }}
                        </button>
                        <span class="at-asset-name-secondary">{{ getSecondaryLine(item) }}</span>
                      </div>
                      <!-- type -->
                      <span v-else-if="col.id === 'type'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.type }}
                      </span>
                      <!-- assetClass -->
                      <span v-else-if="col.id === 'assetClass'" :class="`at-class-badge at-class-badge--${item.assetClass.toLowerCase()}`">
                        {{ item.assetClass }}
                      </span>
                      <!-- issueCounts -->
                      <div v-else-if="col.id === 'issueCounts'" class="at-issue-counts">
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--critical" aria-hidden="true">C</div>
                          <span class="at-issue-count--critical">{{ item.issues.critical }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--high" aria-hidden="true">H</div>
                          <span class="at-issue-count--high">{{ item.issues.high }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--medium" aria-hidden="true">M</div>
                          <span class="at-issue-count--medium">{{ item.issues.medium }}</span>
                        </div>
                        <div class="at-issue-item">
                          <div class="at-issue-icon at-issue-icon--low" aria-hidden="true">L</div>
                          <span class="at-issue-count--low">{{ item.issues.low }}</span>
                        </div>
                      </div>
                      <!-- riskScore -->
                      <span v-else-if="col.id === 'riskScore'" :class="`at-score-badge at-score-badge--${scoreVariant(item.riskScore)}`" :aria-label="`Risk score: ${item.riskScore === 0 ? 'none' : item.riskScore}`">
                        {{ item.riskScore === 0 ? '—' : item.riskScore }}
                      </span>
                      <!-- coverage -->
                      <div v-else-if="col.id === 'coverage'" class="at-coverage-grid">
                        <div
                          v-for="cov in COVERAGE_TYPES"
                          :key="cov"
                          :class="`at-coverage-icon ${item.coverage.includes(cov) ? 'at-coverage-icon--active' : 'at-coverage-icon--empty'}`"
                          :title="cov"
                        >
                          {{ COVERAGE_ABBREV[cov] ?? cov.slice(0, 3) }}
                        </div>
                      </div>
                      <!-- team -->
                      <span v-else-if="col.id === 'team'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.team }}
                      </span>
                      <!-- language -->
                      <span v-else-if="col.id === 'language'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {{ item.language }}
                      </span>
                      <!-- environment -->
                      <span v-else-if="col.id === 'environment'" :class="`at-env-badge at-env-badge--${envClass(item.environment)}`">
                        {{ item.environment }}
                      </span>
                      <!-- lastScan -->
                      <span v-else-if="col.id === 'lastScan'" style="font-size: 12px; color: var(--at-text-2);">
                        {{ item.lastScan }}
                      </span>
                      <!-- source -->
                      <div v-else-if="col.id === 'source'" class="at-tags-list">
                        <span v-for="s in item.source.slice(0, 3)" :key="s" class="at-tag-badge">{{ s }}</span>
                        <span v-if="item.source.length > 3" class="at-tags-overflow">+{{ item.source.length - 3 }}</span>
                      </div>
                      <!-- visibility -->
                      <span v-else-if="col.id === 'visibility'" style="font-size: 12px; color: var(--at-text-2);">
                        {{ item.visibility }}
                      </span>
                      <!-- actions -->
                      <button
                        v-else-if="col.id === 'actions'"
                        class="at-row-action-btn"
                        :aria-label="`More actions for ${item.name}`"
                        @click.stop
                      >
                        ⋯
                      </button>
                    </div>
                  </template>
                </div>

                <!-- Group sentinel -->
                <div
                  v-if="group.hasMore"
                  class="at-sentinel"
                  aria-hidden="true"
                  :data-group-sentinel="group.id"
                  :ref="(el) => setupGroupSentinel(el as Element | null, group.id)"
                />
              </div>
            </div>
          </template>

          <!-- Flat mode -->
          <template v-else>
            <div
              v-for="(item, idx) in sortedFlatItems"
              :key="item.id"
              role="row"
              :aria-rowindex="idx + 1"
              :aria-selected="isSelected(item.id)"
              :data-id="item.id"
              class="at-data-row"
              tabindex="0"
            >
              <template v-for="col in visibleCols" :key="col.id">
                <div role="gridcell" :data-col-id="col.id" class="at-cell">
                  <input
                    v-if="col.id === 'select'"
                    type="checkbox"
                    :aria-label="`Select ${item.name}`"
                    :checked="isSelected(item.id)"
                    @change.stop="toggleItem(item.id)"
                  />
                  <div v-else-if="col.id === 'name'" class="at-asset-name-cell">
                    <button class="at-asset-name-primary" :aria-label="`Open ${item.name}`">
                      {{ item.name }}
                    </button>
                    <span class="at-asset-name-secondary">{{ getSecondaryLine(item) }}</span>
                  </div>
                  <span v-else-if="col.id === 'type'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.type }}
                  </span>
                  <span v-else-if="col.id === 'assetClass'" :class="`at-class-badge at-class-badge--${item.assetClass.toLowerCase()}`">
                    {{ item.assetClass }}
                  </span>
                  <div v-else-if="col.id === 'issueCounts'" class="at-issue-counts">
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--critical" aria-hidden="true">C</div>
                      <span class="at-issue-count--critical">{{ item.issues.critical }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--high" aria-hidden="true">H</div>
                      <span class="at-issue-count--high">{{ item.issues.high }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--medium" aria-hidden="true">M</div>
                      <span class="at-issue-count--medium">{{ item.issues.medium }}</span>
                    </div>
                    <div class="at-issue-item">
                      <div class="at-issue-icon at-issue-icon--low" aria-hidden="true">L</div>
                      <span class="at-issue-count--low">{{ item.issues.low }}</span>
                    </div>
                  </div>
                  <span v-else-if="col.id === 'riskScore'" :class="`at-score-badge at-score-badge--${scoreVariant(item.riskScore)}`">
                    {{ item.riskScore }}
                  </span>
                  <div v-else-if="col.id === 'coverage'" class="at-coverage-grid">
                    <div
                      v-for="cov in COVERAGE_TYPES"
                      :key="cov"
                      :class="`at-coverage-icon ${item.coverage.includes(cov) ? 'at-coverage-icon--active' : 'at-coverage-icon--empty'}`"
                      :title="cov"
                    >
                      {{ COVERAGE_ABBREV[cov] ?? cov.slice(0, 3) }}
                    </div>
                  </div>
                  <span v-else-if="col.id === 'team'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.team }}
                  </span>
                  <span v-else-if="col.id === 'language'" style="color: var(--at-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.language }}
                  </span>
                  <span v-else-if="col.id === 'environment'" :class="`at-env-badge at-env-badge--${envClass(item.environment)}`">
                    {{ item.environment }}
                  </span>
                  <span v-else-if="col.id === 'lastScan'" style="font-size: 12px; color: var(--at-text-2);">
                    {{ item.lastScan }}
                  </span>
                  <div v-else-if="col.id === 'source'" class="at-tags-list">
                    <span v-for="s in item.source.slice(0, 3)" :key="s" class="at-tag-badge">{{ s }}</span>
                    <span v-if="item.source.length > 3" class="at-tags-overflow">+{{ item.source.length - 3 }}</span>
                  </div>
                  <span v-else-if="col.id === 'visibility'" style="font-size: 12px; color: var(--at-text-2);">
                    {{ item.visibility }}
                  </span>
                  <button
                    v-else-if="col.id === 'actions'"
                    class="at-row-action-btn"
                    :aria-label="`More actions for ${item.name}`"
                    @click.stop
                  >
                    ⋯
                  </button>
                </div>
              </template>
            </div>

            <!-- Main flat sentinel -->
            <div
              ref="sentinelRef"
              class="at-sentinel"
              aria-hidden="true"
              id="at-sentinel"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="at-table-footer">
      <span class="at-load-status" aria-live="polite" id="at-load-status">
        {{ loadStatus }}
      </span>
    </div>

    <!-- SR announcer -->
    <div
      id="at-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="at-sr-only"
    />
  </div>
</template>
