import { eq } from 'drizzle-orm'
import { plannedBullet, validateBullet } from '@/domain/guard'
import type { ProjectStatus } from '@/domain/score'
import { shouldQueueOnStatusChange } from '@/domain/sync'
import { getAiClient } from '@/server/ai/client'
import { getDb } from '@/server/db'
import { projects } from '@/server/db/schema'
import { newId, nowIso, parseTags } from '@/server/ids'
import { proposeForProject } from '@/server/sync'

const STATUSES = new Set<ProjectStatus>(['planned', 'active', 'done'])

export function listProjects() {
  return getDb().select().from(projects).all().map(toProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getProject(id: string) {
  const row = getDb().select().from(projects).where(eq(projects.id, id)).get()
  return row ? toProject(row) : null
}

export function createProject(title: string) {
  const timestamp = nowIso()
  const row = {
    id: newId(),
    title: title.trim() || '未命名项目',
    status: 'planned',
    summary: '',
    tagsJson: '[]',
    factsMarkdown: '',
    todos: '',
    resumeBullet: '',
    org: '',
    periodStart: '',
    periodEnd: '',
    factsUpdatedAt: null,
    bulletUpdatedAt: null,
    masterSyncedAt: null,
    updatedAt: timestamp,
  }
  getDb().insert(projects).values(row).run()
  return toProject(row)
}

export async function updateProject(id: string, patch: {
  title?: string
  status?: ProjectStatus
  tags?: string[]
  factsMarkdown?: string
  todos?: string
  resumeBullet?: string
  org?: string
  periodStart?: string
  periodEnd?: string
}) {
  const current = getDb().select().from(projects).where(eq(projects.id, id)).get()
  if (!current) return null
  if (patch.status && !STATUSES.has(patch.status)) throw new Error('无效的项目状态')
  const timestamp = nowIso()
  const nextStatus = patch.status ?? current.status as ProjectStatus
  const factsUpdatedAt = patch.factsMarkdown !== undefined && patch.factsMarkdown !== current.factsMarkdown
    ? timestamp
    : current.factsUpdatedAt
  getDb().update(projects).set({
    title: patch.title?.trim() || current.title,
    status: nextStatus,
    tagsJson: patch.tags ? JSON.stringify(patch.tags.map((tag) => tag.trim()).filter(Boolean)) : current.tagsJson,
    factsMarkdown: patch.factsMarkdown ?? current.factsMarkdown,
    todos: patch.todos ?? current.todos,
    resumeBullet: patch.resumeBullet ?? current.resumeBullet,
    org: patch.org ?? current.org,
    periodStart: patch.periodStart ?? current.periodStart,
    periodEnd: patch.periodEnd ?? current.periodEnd,
    factsUpdatedAt,
    bulletUpdatedAt: patch.resumeBullet !== undefined && patch.resumeBullet !== current.resumeBullet ? timestamp : current.bulletUpdatedAt,
    updatedAt: timestamp,
  }).where(eq(projects.id, id)).run()

  if (patch.status && shouldQueueOnStatusChange({
    nextStatus,
    factsUpdatedAt,
    masterSyncedAt: current.masterSyncedAt,
  })) {
    await proposeForProject(id)
  }
  return getProject(id)
}

export async function refineProject(id: string) {
  const current = getProject(id)
  if (!current) return null
  if (current.status === 'planned') {
    const bullet = plannedBullet(current.title)
    await updateProject(id, { resumeBullet: bullet })
    return { bullet, aiAvailable: true }
  }
  const client = getAiClient()
  if (!client) {
    const error = new Error('未配置模型，不能提炼简历句')
    error.name = 'AiUnavailable'
    throw error
  }
  const bullet = await client.refineBullet({
    title: current.title,
    status: current.status,
    facts: current.factsMarkdown,
  })
  const verdict = validateBullet({ status: current.status, facts: current.factsMarkdown, bullet })
  if (!verdict.ok) throw new Error(verdict.reason)
  await updateProject(id, { resumeBullet: bullet })
  return { bullet, aiAvailable: true }
}

export function toProject(row: typeof projects.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    status: row.status as ProjectStatus,
    summary: row.summary,
    tags: parseTags(row.tagsJson),
    factsMarkdown: row.factsMarkdown,
    todos: row.todos,
    resumeBullet: row.resumeBullet,
    org: row.org,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    factsUpdatedAt: row.factsUpdatedAt,
    bulletUpdatedAt: row.bulletUpdatedAt,
    masterSyncedAt: row.masterSyncedAt,
    updatedAt: row.updatedAt,
    todoCount: row.todos.split('\n').map((line) => line.trim()).filter(Boolean).length,
  }
}

export function cardSummary(project: { summary: string; factsMarkdown: string }): string {
  if (project.summary.trim()) return project.summary.trim()
  return project.factsMarkdown.split('\n').map((line) => line.trim()).find(Boolean) ?? ''
}
