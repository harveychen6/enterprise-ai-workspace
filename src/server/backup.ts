import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { getDb, getSqlite } from '@/server/db'
import { jobKeywords, jobMatches, jobTargets, profile, projects, resumeItems, resumes, settings, syncProposals } from '@/server/db/schema'
import { newId, nowIso } from '@/server/ids'

export function exportBackup() {
  const db = getDb()
  return {
    version: 1,
    profile: db.select().from(profile).where(eq(profile.id, 1)).get(),
    projects: db.select().from(projects).all(),
    jobs: db.select().from(jobTargets).all(),
    keywords: db.select().from(jobKeywords).all(),
    matches: db.select().from(jobMatches).all(),
    resumes: db.select().from(resumes).all(),
    resumeItems: db.select().from(resumeItems).all(),
    proposals: db.select().from(syncProposals).all(),
    settings: db.select().from(settings).where(eq(settings.id, 1)).get(),
  }
}

export function importBackup(payload: ReturnType<typeof exportBackup>, confirm: boolean) {
  if (payload.version !== 1) throw new Error('无法识别的备份版本')
  const db = getDb()
  const nonempty = db.select().from(projects).all().length > 0 || Boolean(db.select().from(profile).where(eq(profile.id, 1)).get()?.name)
  if (nonempty && !confirm) {
    const error = new Error('库里已有内容，确认后才会覆盖')
    error.name = 'ConfirmRequired'
    throw error
  }
  const sqlite = getSqlite()
  const run = sqlite.transaction(() => {
    sqlite.exec('DELETE FROM resume_items; DELETE FROM sync_proposals; DELETE FROM job_matches; DELETE FROM job_keywords; DELETE FROM resumes; DELETE FROM job_targets; DELETE FROM projects;')
    if (payload.profile) db.update(profile).set(payload.profile).where(eq(profile.id, 1)).run()
    for (const row of payload.projects ?? []) db.insert(projects).values(row).run()
    for (const row of payload.jobs ?? []) db.insert(jobTargets).values(row).run()
    for (const row of payload.keywords ?? []) db.insert(jobKeywords).values(row).run()
    for (const row of payload.matches ?? []) db.insert(jobMatches).values(row).run()
    for (const row of payload.resumes ?? []) db.insert(resumes).values(row).run()
    for (const row of payload.resumeItems ?? []) db.insert(resumeItems).values(row).run()
    for (const row of payload.proposals ?? []) db.insert(syncProposals).values(row).run()
    if (payload.settings) db.update(settings).set(payload.settings).where(eq(settings.id, 1)).run()
  })
  run()
}

export function importDemo(confirm: boolean) {
  const raw = fs.readFileSync(path.join(process.cwd(), 'fixtures/demo.json'), 'utf8')
  const demo = JSON.parse(raw) as {
    profile: { name: string; headline: string; years: string; location: string; phone: string; email: string; links: string; summary: string; education: string; skills: string[] }
    projects: {
      id: string
      title: string
      status: string
      tags: string[]
      factsMarkdown: string
      todos: string
      resumeBullet: string
      org: string
      periodStart: string
      periodEnd: string
    }[]
  }
  const db = getDb()
  const current = db.select().from(profile).where(eq(profile.id, 1)).get()
  const nonempty = db.select().from(projects).all().length > 0 || Boolean(current?.name)
  if (nonempty && !confirm) {
    const error = new Error('库里已有内容，确认后才会导入示例')
    error.name = 'ConfirmRequired'
    throw error
  }
  if (!current?.name) {
    db.update(profile).set({
      name: demo.profile.name,
      headline: demo.profile.headline,
      years: demo.profile.years,
      location: demo.profile.location,
      phone: demo.profile.phone,
      email: demo.profile.email,
      links: demo.profile.links,
      summary: demo.profile.summary,
      education: demo.profile.education,
      skillsJson: JSON.stringify(demo.profile.skills),
    }).where(eq(profile.id, 1)).run()
  }
  const timestamp = nowIso()
  for (const project of demo.projects) {
    const exists = db.select().from(projects).where(eq(projects.id, project.id)).get()
    if (exists) continue
    db.insert(projects).values({
      id: project.id || newId(),
      title: project.title,
      status: project.status,
      summary: '',
      tagsJson: JSON.stringify(project.tags),
      factsMarkdown: project.factsMarkdown,
      todos: project.todos,
      resumeBullet: project.resumeBullet,
      org: project.org,
      periodStart: project.periodStart,
      periodEnd: project.periodEnd,
      factsUpdatedAt: timestamp,
      bulletUpdatedAt: timestamp,
      masterSyncedAt: null,
      updatedAt: timestamp,
    }).run()
  }
}

export function getSettings() {
  const row = getDb().select().from(settings).where(eq(settings.id, 1)).get()
  return { syncIntervalDays: row?.syncIntervalDays ?? 7 }
}

export function updateSettings(syncIntervalDays: number) {
  const days = Math.max(1, Math.round(syncIntervalDays))
  getDb().update(settings).set({ syncIntervalDays: days }).where(eq(settings.id, 1)).run()
  return getSettings()
}

export function getProfile() {
  const row = getDb().select().from(profile).where(eq(profile.id, 1)).get()
  return row
}

export function updateProfile(patch: Partial<{ name: string; headline: string; years: string; location: string; phone: string; email: string; links: string; summary: string; education: string; skills: string[] }>) {
  const current = getProfile()
  if (!current) return null
  getDb().update(profile).set({
    name: patch.name ?? current.name,
    headline: patch.headline ?? current.headline,
    years: patch.years ?? current.years,
    location: patch.location ?? current.location,
    phone: patch.phone ?? current.phone,
    email: patch.email ?? current.email,
    links: patch.links ?? current.links,
    summary: patch.summary ?? current.summary,
    education: patch.education ?? current.education,
    skillsJson: patch.skills ? JSON.stringify(patch.skills) : current.skillsJson,
  }).where(eq(profile.id, 1)).run()
  return getProfile()
}
