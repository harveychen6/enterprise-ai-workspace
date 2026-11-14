import { eq } from 'drizzle-orm'
import { paperBullet } from '@/domain/resume'
import type { ProjectStatus } from '@/domain/score'
import { getDb } from '@/server/db'
import { jobMatches, jobTargets, profile, projects, resumeItems, resumes } from '@/server/db/schema'
import { newId, nowIso, parseSkills, parseTags } from '@/server/ids'

export function listResumes() {
  const db = getDb()
  const jobs = db.select().from(jobTargets).all()
  const byJob = new Map(jobs.map((job) => [job.id, job]))
  return db.select().from(resumes).all()
    .map((resume) => {
      const job = resume.jobId ? byJob.get(resume.jobId) : undefined
      return {
        id: resume.id,
        type: resume.type as 'master' | 'targeted',
        jobId: resume.jobId,
        title: resume.type === 'master' ? '经历母版' : `${job?.company ?? ''} · ${job?.role ?? ''}`,
        matchScore: job?.matchScore ?? null,
        updatedAt: resume.updatedAt,
      }
    })
    .sort((a, b) => (a.type === 'master' ? -1 : b.type === 'master' ? 1 : b.updatedAt.localeCompare(a.updatedAt)))
}

export function getResume(id: string) {
  const db = getDb()
  const resume = db.select().from(resumes).where(eq(resumes.id, id)).get()
  if (!resume) return null
  const items = db.select().from(resumeItems).where(eq(resumeItems.resumeId, id)).all()
  const itemByProject = new Map(items.map((item) => [item.projectId, item]))
  const projectRows = db.select().from(projects).all()
  const person = db.select().from(profile).where(eq(profile.id, 1)).get()
  const job = resume.jobId ? db.select().from(jobTargets).where(eq(jobTargets.id, resume.jobId)).get() : null
  return {
    id: resume.id,
    type: resume.type as 'master' | 'targeted',
    jobId: resume.jobId,
    summary: resume.type === 'master' ? (person?.summary ?? '') : resume.summary,
    updatedAt: resume.updatedAt,
    job: job ? { company: job.company, role: job.role, matchScore: job.matchScore } : null,
    profile: person ? {
      name: person.name,
      headline: person.headline,
      years: person.years,
      location: person.location,
      phone: person.phone,
      email: person.email,
      links: person.links,
      education: person.education,
      skills: parseSkills(person.skillsJson),
      workExperience: person.workExperience,
      photo: person.photo,
    } : null,
    projects: projectRows.map((project) => {
      const item = itemByProject.get(project.id)
      const override = item?.bulletOverride ?? ''
      return {
        projectId: project.id,
        title: project.title,
        status: project.status as ProjectStatus,
        tags: parseTags(project.tagsJson),
        org: project.org,
        periodStart: project.periodStart,
        periodEnd: project.periodEnd,
        included: Boolean(item?.included),
        bulletOverride: resume.type === 'master' ? '' : override,
        bullet: paperBullet(project.resumeBullet, resume.type === 'master' ? '' : override),
        sourceBullet: project.resumeBullet,
        sortOrder: item?.sortOrder ?? 0,
        todoCount: project.todos.split('\n').map((line) => line.trim()).filter(Boolean).length,
      }
    }).sort((a, b) => Number(b.included) - Number(a.included) || b.sortOrder - a.sortOrder),
  }
}

export function updateResume(id: string, patch: {
  summary?: string
  includedProjectIds?: string[]
  overrides?: { projectId: string; bulletOverride: string }[]
}) {
  const db = getDb()
  const resume = db.select().from(resumes).where(eq(resumes.id, id)).get()
  if (!resume) return null
  if (resume.type === 'targeted' && patch.summary !== undefined) {
    db.update(resumes).set({ summary: patch.summary, updatedAt: nowIso() }).where(eq(resumes.id, id)).run()
  }
  if (resume.type === 'master' && patch.summary !== undefined) {
    db.update(profile).set({ summary: patch.summary }).where(eq(profile.id, 1)).run()
  }
  if (patch.includedProjectIds) {
    const existing = db.select().from(resumeItems).where(eq(resumeItems.resumeId, id)).all()
    const byProject = new Map(existing.map((item) => [item.projectId, item]))
    patch.includedProjectIds.forEach((projectId, index) => {
      const current = byProject.get(projectId)
      if (current) {
        db.update(resumeItems).set({ included: 1, sortOrder: index }).where(eq(resumeItems.id, current.id)).run()
      } else {
        db.insert(resumeItems).values({
          id: newId(),
          resumeId: id,
          projectId,
          included: 1,
          bulletOverride: '',
          sortOrder: index,
        }).run()
      }
    })
    for (const item of existing) {
      if (!patch.includedProjectIds.includes(item.projectId)) {
        db.update(resumeItems).set({ included: 0 }).where(eq(resumeItems.id, item.id)).run()
      }
    }
  }
  if (resume.type === 'targeted' && patch.overrides) {
    for (const override of patch.overrides) {
      const current = db.select().from(resumeItems).all().find((item) => item.resumeId === id && item.projectId === override.projectId)
      if (current) {
        db.update(resumeItems).set({ bulletOverride: override.bulletOverride }).where(eq(resumeItems.id, current.id)).run()
      } else {
        db.insert(resumeItems).values({
          id: newId(),
          resumeId: id,
          projectId: override.projectId,
          included: 1,
          bulletOverride: override.bulletOverride,
          sortOrder: 0,
        }).run()
      }
    }
  }
  db.update(resumes).set({ updatedAt: nowIso() }).where(eq(resumes.id, id)).run()
  return getResume(id)
}

export function generateTargetedResume(jobId: string) {
  const db = getDb()
  const existing = db.select().from(resumes).all().find((item) => item.jobId === jobId)
  if (existing) return existing.id
  const job = db.select().from(jobTargets).where(eq(jobTargets.id, jobId)).get()
  if (!job) return null
  const person = db.select().from(profile).where(eq(profile.id, 1)).get()
  const id = newId()
  db.insert(resumes).values({
    id,
    type: 'targeted',
    jobId,
    summary: person?.summary ?? '',
    updatedAt: nowIso(),
  }).run()
  const matches = db.select().from(jobMatches).where(eq(jobMatches.jobId, jobId)).all()
  const projectRows = db.select().from(projects).all()
  const included = matches
    .map((match) => projectRows.find((project) => project.id === match.projectId))
    .filter((project): project is NonNullable<typeof project> => Boolean(project && project.status !== 'planned'))
  included.forEach((project, index) => {
    db.insert(resumeItems).values({
      id: newId(),
      resumeId: id,
      projectId: project.id,
      included: 1,
      bulletOverride: '',
      sortOrder: index,
    }).run()
  })
  return id
}

export function renderMarkdown(id: string): string | null {
  const resume = getResume(id)
  if (!resume || !resume.profile) return null
  const person = resume.profile
  const lines = [
    `# ${person.name || '未命名'}`,
    [person.headline, person.years].filter(Boolean).join(' · '),
    [person.location, person.phone, person.email, person.links].filter(Boolean).join(' · '),
    '',
    '## 工作经历',
    person.workExperience,
    '',
    '## 项目经历',
  ]
  for (const project of resume.projects.filter((item) => item.included)) {
    const period = [project.periodStart, project.periodEnd].filter(Boolean).join(' — ')
    lines.push(`### ${project.title}`, [project.org, period].filter(Boolean).join(' · '), project.bullet, '')
  }
  lines.push('## 专业技能', ...person.skills, '', '## 教育背景', person.education)
  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n')
}
