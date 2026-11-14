import { ResumeSheet } from '@/components/resume/ResumeSheet'
import { getResume } from '@/server/resumes'

export const dynamic = 'force-dynamic'

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ autoprint?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const resume = getResume(id)
  if (!resume?.profile) return <p>简历不存在</p>
  const included = resume.projects.filter((project) => project.included)
  return (
    <main className="bg-white">
      <ResumeSheet profile={resume.profile} job={resume.job} projects={included} />
      <style>{'@page { size: A4; margin: 0; }'}</style>
      {query.autoprint ? <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("load", () => window.print())' }} /> : null}
    </main>
  )
}
