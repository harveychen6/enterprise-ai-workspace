import { getSettings, updateSettings } from '@/server/backup'
import { fail, json } from '@/server/http'

export const dynamic = 'force-dynamic'

export function GET() {
  return json(getSettings())
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { syncIntervalDays?: number }
    return json(updateSettings(body.syncIntervalDays ?? 7))
  } catch (error) {
    return fail(error)
  }
}
