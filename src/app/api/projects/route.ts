import { fail, json } from '@/server/http'
import { createProject, listProjects } from '@/server/projects'

export const dynamic = 'force-dynamic'

export function GET() {
  return json(listProjects())
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string }
    return json(createProject(body.title ?? ''), 201)
  } catch (error) {
    return fail(error)
  }
}
