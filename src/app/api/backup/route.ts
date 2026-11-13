import { exportBackup, importBackup } from '@/server/backup'
import { fail, json } from '@/server/http'

export const dynamic = 'force-dynamic'

export function GET() {
  return new Response(JSON.stringify(exportBackup(), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="careerdesk-backup.json"',
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { confirm?: boolean; backup?: ReturnType<typeof exportBackup> }
    importBackup(body.backup ?? body as ReturnType<typeof exportBackup>, Boolean(body.confirm))
    return json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
