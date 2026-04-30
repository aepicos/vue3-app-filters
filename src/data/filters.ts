export type FilterOperator =
  | 'is'
  | 'is not'
  | 'contains'
  | 'does not contain'
  | 'is higher than'
  | 'is lower than'
  | 'equals'

export interface FilterPreset {
  operator: string
  value: string
}

export interface FilterDef {
  id: string
  label: string
  type: 'enum' | 'text' | 'number'
  operators: string[]
  values?: string[]
  presets?: FilterPreset[]
}

export interface FilterChip {
  id: string
  filterId?: string
  key: string
  operator: string
  value: string
}

// ── Advanced query types ──────────────────────────────────────────────────────

export interface FilterCondition {
  id: string
  filterId: string
  key: string
  operator: string
  value: string
}

export interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

export interface AdvancedQuery {
  groupOperator: 'AND' | 'OR'
  groups: FilterGroup[]
}

export const FILTERS: FilterDef[] = [
  {
    id: 'asset-type',
    label: 'Asset type',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['API', 'Application', 'Container image', 'Package', 'Repository', 'SBOM', 'Service', 'Website'],
  },
  {
    id: 'asset-class',
    label: 'Asset class',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['A', 'B', 'C', 'D'],
  },
  {
    id: 'environment',
    label: 'Environment',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Production', 'Staging', 'Development', 'Testing'],
  },
  {
    id: 'team',
    label: 'Team',
    type: 'enum',
    operators: ['is', 'is not'],
    values: [
      'Legendary Shack Shakers',
      'Love and Rockets',
      'Nouvelle Vague',
      'Public Service Broadcasting',
      'The Bad Seeds',
      'Trimdon Grange Explosion',
    ],
  },
  {
    id: 'issue-severity',
    label: 'Issue severity',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Critical', 'High', 'Medium', 'Low'],
  },
  {
    id: 'language',
    label: 'Language',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['C#', 'Go', 'Java', 'Javascript', 'Python', 'Ruby', 'Typescript'],
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Maven', 'npm', 'PyPI', 'Go', 'NuGet', 'RubyGems'],
  },
  {
    id: 'lifecycle-stage',
    label: 'Lifecycle stage',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Experimental', 'Active', 'Deprecated', 'Retired'],
  },
  {
    id: 'exposure',
    label: 'Exposure',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Public', 'Internal', 'Private'],
  },
  {
    id: 'fixability',
    label: 'Fixability',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Fix available', 'No fix', 'Workaround'],
  },
  {
    id: 'exploitability',
    label: 'Exploitability',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Known exploit', 'Proof of concept', 'None'],
  },
  {
    id: 'issue-type',
    label: 'Issue type',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Code quality', 'License', 'Misconfiguration', 'Vulnerability'],
  },
  {
    id: 'license',
    label: 'License',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Apache 2.0', 'BSD 3-Clause', 'GPL', 'LGPL', 'MIT', 'MPL 2.0', 'Unlicense'],
  },
  {
    id: 'license-type',
    label: 'License type',
    type: 'enum',
    operators: ['is', 'is not'],
    values: ['Permissive', 'Weak copyleft', 'Strong copyleft', 'Proprietary'],
  },
  {
    id: 'tag',
    label: 'Tag',
    type: 'text',
    operators: ['is', 'is not', 'contains', 'does not contain'],
  },
  {
    id: 'risk-score',
    label: 'Risk score',
    type: 'number',
    operators: ['>', '<', '='],
    presets: [
      { operator: '>', value: '400' },
      { operator: '>', value: '700' },
      { operator: '>', value: '800' },
      { operator: '>', value: '900' },
    ],
  },
]
