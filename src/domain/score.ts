export type ProjectStatus = 'planned' | 'active' | 'done'
export type ScoreTone = 'high' | 'mid' | 'low'
export type EvidenceStatus = 'supported' | 'gap'

export interface ScoreProject {
  id: string
  status: ProjectStatus
  tags: string[]
  facts: string
  bullet: string
}

export interface KeywordEvidence {
  text: string
  evidence: EvidenceStatus
}

export interface ProjectMatch {
  projectId: string
  relevance: number
  matchedKeywords: string[]
}

export interface MatchResult {
  score: number
  keywords: KeywordEvidence[]
  matches: ProjectMatch[]
  defaultProjectIds: string[]
}

const STATUS_WEIGHT: Record<ProjectStatus, number> = {
  done: 1,
  active: 0.7,
  planned: 0.35,
}

function haystack(project: ScoreProject): string {
  return [project.tags.join(' '), project.facts, project.bullet].join('\n').toLowerCase()
}

function contains(project: ScoreProject, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase()
  return needle.length > 0 && haystack(project).includes(needle)
}

function numericFactor(facts: string): number {
  return /\d/.test(facts) ? 1 : 0.85
}

function projectFactor(project: ScoreProject): number {
  return STATUS_WEIGHT[project.status] * numericFactor(project.facts)
}

export function matchJob(keywords: string[], projects: ScoreProject[]): MatchResult {
  const keys = keywords.map((keyword) => keyword.trim()).filter(Boolean)
  const keywordsOut: KeywordEvidence[] = keys.map((text) => ({
    text,
    evidence: projects.some((project) => contains(project, text)) ? 'supported' : 'gap',
  }))

  const ranked = projects
    .map((project) => {
      const matchedKeywords = keys.filter((keyword) => contains(project, keyword))
      const relevance = keys.length === 0
        ? 0
        : Math.round((100 * matchedKeywords.length * projectFactor(project)) / keys.length)
      return { project, relevance, matchedKeywords }
    })
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)

  const contributions = keys.map((keyword) => {
    const holders = projects.filter((project) => contains(project, keyword))
    if (holders.length === 0) return 0
    return Math.max(...holders.map(projectFactor))
  })
  const score = keys.length === 0
    ? 0
    : Math.round((100 * contributions.reduce((sum, value) => sum + value, 0)) / keys.length)

  return {
    score,
    keywords: keywordsOut,
    matches: ranked.slice(0, 3).map((item) => ({
      projectId: item.project.id,
      relevance: item.relevance,
      matchedKeywords: item.matchedKeywords,
    })),
    defaultProjectIds: ranked
      .filter((item) => item.project.status !== 'planned')
      .slice(0, 3)
      .map((item) => item.project.id),
  }
}

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return 'high'
  if (score >= 65) return 'mid'
  return 'low'
}
