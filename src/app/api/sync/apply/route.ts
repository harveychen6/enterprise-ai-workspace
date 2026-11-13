import { json } from '@/server/http'
import { applyProposals } from '@/server/sync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json() as { ids?: string[] }
  return json(applyProposals(body.ids ?? []))
}
