import { eq } from 'drizzle-orm'
import { aiConfigured } from '@/server/ai/client'
import { getDb } from '@/server/db'
import { jobTargets, profile, projects, resumes } from '@/server/db/schema'
import { parseSkills } from '@/server/ids'

export function getMeta() {
  const db = getDb()
  const person = db.select().from(profile).where(eq(profile.id, 1)).get()
  const projectRows = db.select().from(projects).all()
  const jobs = db.select().from(jobTargets).all()
  const targeted = db.select().from(resumes).all().filter((item) => item.type === 'targeted').length
  const complete = projectRows.filter((project) => project.factsMarkdown.trim() && !project.todos.trim()).length
  return {
    aiAvailable: aiConfigured(),
    profile: {
      name: person?.name ?? '',
      headline: person?.headline ?? '',
      skills: parseSkills(person?.skillsJson ?? '[]'),
    },
    projectCount: projectRows.length,
    jobCount: jobs.length,
    completeness: projectRows.length === 0 ? null : Math.round((complete / projectRows.length) * 100),
    readiness: jobs.length === 0 ? null : { ready: targeted, total: jobs.length },
  }
}
