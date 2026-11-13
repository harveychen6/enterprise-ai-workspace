import type { ProjectStatus } from '@/domain/score'
import { fail, json } from '@/server/http'
import { updateProject } from '@/server/projects'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json() as {
      title?: string
      status?: ProjectStatus
      tags?: string[]
      factsMarkdown?: string
      todos?: string
      resumeBullet?: string
      org?: string
      periodStart?: string
      periodEnd?: string
    }
    const project = await updateProject(id, body)
    if (!project) return json({ error: '项目不存在' }, 404)
    return json(project)
  } catch (error) {
    return fail(error)
  }
}
