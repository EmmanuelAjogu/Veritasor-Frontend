import { describe, expect, it } from 'vitest'
import {
  ENTITY_LABEL,
  MOCK_ISSUES,
  SEVERITY_META,
  SEVERITY_ORDER,
  filterBySeverities,
  isA11ySeverity,
  matchesQuery,
  type A11yIssue,
  type A11ySeverity,
} from './a11yAuditData'

const expectedOrder: readonly A11ySeverity[] = [
  'critical',
  'serious',
  'moderate',
  'minor',
]

describe('a11yAuditData severity contract', () => {
  it('exposes the documented triage order and metadata for each severity', () => {
    expect(SEVERITY_ORDER).toEqual(expectedOrder)
    expect(Object.keys(SEVERITY_META)).toEqual(expectedOrder)
    for (const severity of expectedOrder) {
      expect(SEVERITY_META[severity].label).toBeTruthy()
      expect(SEVERITY_META[severity].ariaLabel).toContain('severity')
      expect(SEVERITY_META[severity].glyph).toBeTruthy()
    }
    expect(ENTITY_LABEL).toBe('accessibility issue')
  })

  it.each(expectedOrder)('accepts %s as an A11ySeverity', (severity) => {
    const value: string = severity
    expect(isA11ySeverity(value)).toBe(true)
    if (isA11ySeverity(value)) {
      const narrowed: A11ySeverity = value
      expect(narrowed).toBe(severity)
    }
  })

  it.each(['', 'CRITICAL', 'Critical', ' critical', 'minor ', 'unknown', 'impact'])(
    'rejects invalid severity string %j',
    (value) => {
      expect(isA11ySeverity(value)).toBe(false)
    },
  )

  it.each([null, undefined, 0, {}, []])(
    'rejects non-string severity input %j at runtime',
    (value) => {
      expect(isA11ySeverity(value as string)).toBe(false)
    },
  )

  it('keeps every mock issue within the severity contract', () => {
    expect(MOCK_ISSUES).toHaveLength(12)
    expect(new Set(MOCK_ISSUES.map((issue) => issue.id)).size).toBe(MOCK_ISSUES.length)
    for (const issue of MOCK_ISSUES) {
      expect(isA11ySeverity(issue.severity)).toBe(true)
    }
  })
})

describe('a11yAuditData filtering and search', () => {
  const issues: readonly A11yIssue[] = [
    MOCK_ISSUES[0],
    MOCK_ISSUES[2],
    MOCK_ISSUES[5],
    MOCK_ISSUES[8],
  ]

  it('returns a separate array of all issues when no severity is active', () => {
    const result = filterBySeverities(issues, [])
    expect(result.map((issue) => issue.id)).toEqual([
      'issue-001',
      'issue-003',
      'issue-006',
      'issue-009',
    ])
    expect(result).not.toBe(issues)
  })

  it('transitions between one, multiple, and no active severities', () => {
    expect(filterBySeverities(issues, ['critical']).map((issue) => issue.id))
      .toEqual(['issue-001'])
    expect(filterBySeverities(issues, ['minor', 'critical']).map((issue) => issue.id))
      .toEqual(['issue-001', 'issue-009'])
    expect(filterBySeverities(issues, [])).toHaveLength(4)
    expect(issues.map((issue) => issue.id)).toEqual([
      'issue-001',
      'issue-003',
      'issue-006',
      'issue-009',
    ])
  })

  it('returns no issues when the active severity is absent', () => {
    expect(filterBySeverities([MOCK_ISSUES[0]], ['minor'])).toEqual([])
    expect(filterBySeverities([], ['critical'])).toEqual([])
  })

  it('matches supported search fields without case or surrounding whitespace sensitivity', () => {
    const issue = MOCK_ISSUES[0]
    for (const query of ['IMAGE-ALT', 'Images must', '#HERO-ILLUSTRATION', 'load-bearing', '1.1.1', 'Landing Page']) {
      expect(matchesQuery(issue, `  ${query}  `)).toBe(true)
    }
  })

  it('treats empty searches as unfiltered and rejects a missing term', () => {
    const issue = MOCK_ISSUES[0]
    expect(matchesQuery(issue, '')).toBe(true)
    expect(matchesQuery(issue, '   ')).toBe(true)
    expect(matchesQuery(issue, 'not-in-this-issue')).toBe(false)
  })
})
