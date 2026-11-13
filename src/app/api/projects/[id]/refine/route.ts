import { fail, json } from '@/server/http'
import { refineProject } from '@/server/projects'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const result = await refineProject(id)
    if (!result) return json({ error: '项目不存在' }, 404)
    return json(result)
  } catch (error) {
    return fail(error)
  }
}
