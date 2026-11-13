import { json } from '@/server/http'
import { listResumes } from '@/server/resumes'

export const dynamic = 'force-dynamic'

export function GET() {
  return json(listResumes())
}
