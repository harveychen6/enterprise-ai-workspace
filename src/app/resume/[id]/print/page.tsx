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
      <article className="mx-auto min-h-[297mm] w-[210mm] px-10 py-8">
        <h1 className="text-[22px] font-semibold">{resume.profile.name || '未填写姓名'}</h1>
        <p className="mt-1 text-[12px] text-[#7c8899]">{[resume.profile.headline, resume.profile.years, resume.profile.location, resume.profile.phone, resume.profile.email].filter(Boolean).join(' · ')}</p>
        <h2 className="mt-4 text-[12px] font-semibold text-[#2f6bff]">个人简介</h2>
        <p className="text-[12px] leading-7">{resume.summary}</p>
        <h2 className="mt-3 text-[12px] font-semibold text-[#2f6bff]">项目经历</h2>
        {included.map((project) => (
          <section key={project.projectId} className="mt-2">
            <h3 className="text-[13px] font-medium">{project.title}</h3>
            <p className="text-[11px] text-[#9aa7ba]">{[project.org, project.periodStart, project.periodEnd].filter(Boolean).join(' · ')}</p>
            <p className="text-[12px] leading-7">{project.bullet}</p>
          </section>
        ))}
        <h2 className="mt-3 text-[12px] font-semibold text-[#2f6bff]">技术栈</h2>
        <p className="text-[12px]">{resume.profile.skills.join('、')}</p>
        <h2 className="mt-3 text-[12px] font-semibold text-[#2f6bff]">教育经历</h2>
        <p className="text-[12px]">{resume.profile.education}</p>
      </article>
      <style>{'@page { size: A4; margin: 12mm; }'}</style>
      {query.autoprint ? <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("load", () => window.print())' }} /> : null}
    </main>
  )
}
