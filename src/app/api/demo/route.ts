import { importDemo } from '@/server/backup'
import { fail, json } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { confirm?: boolean }
    importDemo(Boolean(body.confirm))
    return json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
