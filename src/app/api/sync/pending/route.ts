import { json } from '@/server/http'
import { listPendingProposals } from '@/server/sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  return json(await listPendingProposals())
}
