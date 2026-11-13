import { getProfile, updateProfile } from '@/server/backup'
import { fail, json } from '@/server/http'
import { parseSkills } from '@/server/ids'

export const dynamic = 'force-dynamic'

export function GET() {
  const profile = getProfile()
  if (!profile) return json({ error: '档案不存在' }, 404)
  return json({ ...profile, skills: parseSkills(profile.skillsJson) })
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { name?: string; headline?: string; years?: string; location?: string; phone?: string; email?: string; links?: string; summary?: string; education?: string; skills?: string[] }
    return json(updateProfile(body))
  } catch (error) {
    return fail(error)
  }
}
