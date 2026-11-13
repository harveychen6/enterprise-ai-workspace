import { fail, json } from '@/server/http'
import { createJob, listJobs } from '@/server/jobs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return json(await listJobs())
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { company?: string; role?: string; city?: string; salary?: string; department?: string; jdText?: string }
    return json(await createJob({
      company: body.company ?? '',
      role: body.role ?? '',
      city: body.city,
      salary: body.salary,
      department: body.department,
      jdText: body.jdText ?? '',
    }), 201)
  } catch (error) {
    return fail(error)
  }
}
