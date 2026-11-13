import { fail, json } from '@/server/http'
import { analyzeJob } from '@/server/jobs'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const job = await analyzeJob(id)
    if (!job) return json({ error: '岗位不存在' }, 404)
    return json(job)
  } catch (error) {
    return fail(error)
  }
}
