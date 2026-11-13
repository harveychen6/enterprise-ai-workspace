import { json } from '@/server/http'
import { getJob } from '@/server/jobs'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const job = await getJob(id)
  if (!job) return json({ error: '岗位不存在' }, 404)
  return json(job)
}
