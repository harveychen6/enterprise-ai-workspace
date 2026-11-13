import { json } from '@/server/http'
import { generateTargetedResume } from '@/server/resumes'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resumeId = generateTargetedResume(id)
  if (!resumeId) return json({ error: '岗位不存在' }, 404)
  return json({ resumeId })
}
