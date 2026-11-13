import { fail, json } from '@/server/http'
import { getResume, updateResume } from '@/server/resumes'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resume = getResume(id)
  if (!resume) return json({ error: '简历不存在' }, 404)
  return json(resume)
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json() as {
      summary?: string
      includedProjectIds?: string[]
      overrides?: { projectId: string; bulletOverride: string }[]
    }
    const resume = updateResume(id, body)
    if (!resume) return json({ error: '简历不存在' }, 404)
    return json(resume)
  } catch (error) {
    return fail(error)
  }
}
