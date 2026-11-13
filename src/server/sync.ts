import { eq } from 'drizzle-orm'
import { validateBullet } from '@/domain/guard'
import type { ProjectStatus } from '@/domain/score'
import { isIntervalDue } from '@/domain/sync'
import { getAiClient } from '@/server/ai/client'
import { getDb } from '@/server/db'
import { projects, settings, syncProposals } from '@/server/db/schema'
import { newId, nowIso } from '@/server/ids'

export async function listPendingProposals() {
  await maybeGenerateIntervalProposals()
  const rows = getDb().select().from(syncProposals).all()
  const projectRows = getDb().select().from(projects).all()
  const byId = new Map(projectRows.map((row) => [row.id, row]))
  return rows
    .filter((row) => row.status === 'pending' || row.status === 'rejected')
    .map((row) => ({
      id: row.id,
      projectId: row.projectId,
      title: byId.get(row.projectId)?.title ?? '',
      status: byId.get(row.projectId)?.status ?? 'done',
      baseBullet: row.baseBullet,
      proposedBullet: row.proposedBullet,
      evidenceNote: row.evidenceNote,
      proposalStatus: row.status,
    }))
}

export async function proposeForProject(projectId: string) {
  const project = getDb().select().from(projects).where(eq(projects.id, projectId)).get()
  if (!project || project.status === 'planned') return
  const client = getAiClient()
  if (!client) return
  const existing = getDb().select().from(syncProposals).all()
    .find((row) => row.projectId === projectId && (row.status === 'pending' || row.status === 'rejected'))
  const bullet = await client.refineBullet({
    title: project.title,
    status: project.status as ProjectStatus,
    facts: project.factsMarkdown,
    current: project.resumeBullet,
  })
  const verdict = validateBullet({
    status: project.status as ProjectStatus,
    facts: project.factsMarkdown,
    bullet,
  })
  const next = {
    projectId,
    baseBullet: project.resumeBullet,
    proposedBullet: verdict.ok ? bullet : project.resumeBullet,
    evidenceNote: project.factsMarkdown.split('\n').map((line) => line.trim()).find(Boolean)?.slice(0, 80) ?? '',
    status: verdict.ok ? 'pending' : 'rejected',
  }
  if (existing) {
    getDb().update(syncProposals).set(next).where(eq(syncProposals.id, existing.id)).run()
    return
  }
  getDb().insert(syncProposals).values({ id: newId(), ...next }).run()
}

export function applyProposals(ids: string[]) {
  const db = getDb()
  const selected = db.select().from(syncProposals).all().filter((row) => ids.includes(row.id) && row.status === 'pending')
  for (const proposal of selected) {
    db.update(projects).set({
      resumeBullet: proposal.proposedBullet,
      masterSyncedAt: nowIso(),
      bulletUpdatedAt: nowIso(),
      updatedAt: nowIso(),
    }).where(eq(projects.id, proposal.projectId)).run()
    db.update(syncProposals).set({ status: 'accepted' }).where(eq(syncProposals.id, proposal.id)).run()
  }
  if (selected.length > 0) {
    db.update(settings).set({ lastMasterSyncAt: nowIso() }).where(eq(settings.id, 1)).run()
  }
  return { applied: selected.length }
}

export function dismissProposals(ids: string[]) {
  for (const id of ids) {
    getDb().update(syncProposals).set({ status: 'dismissed' }).where(eq(syncProposals.id, id)).run()
  }
}

async function maybeGenerateIntervalProposals() {
  const setting = getDb().select().from(settings).where(eq(settings.id, 1)).get()
  if (!setting) return
  const due = isIntervalDue({
    now: nowIso(),
    lastMasterSyncAt: setting.lastMasterSyncAt,
    intervalDays: setting.syncIntervalDays,
  })
  if (!due || !getAiClient()) return
  const open = new Set(
    getDb().select().from(syncProposals).all()
      .filter((row) => row.status === 'pending' || row.status === 'rejected')
      .map((row) => row.projectId),
  )
  const stale = getDb().select().from(projects).all().filter((project) => {
    if (project.status === 'planned' || !project.factsUpdatedAt) return false
    if (open.has(project.id)) return false
    return !project.masterSyncedAt || project.factsUpdatedAt > project.masterSyncedAt
  })
  for (const project of stale) {
    await proposeForProject(project.id)
  }
}
