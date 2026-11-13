import { json } from '@/server/http'
import { getMeta } from '@/server/meta'

export const dynamic = 'force-dynamic'

export function GET() {
  return json(getMeta())
}
