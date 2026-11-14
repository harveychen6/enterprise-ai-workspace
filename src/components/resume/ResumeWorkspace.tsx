'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResumeSheet } from '@/components/resume/ResumeSheet'
import { copy } from '@/content/zh-CN'
import { api, notifyChanged, statusLabel } from '@/lib/api'

interface Version {
  id: string
  type: 'master' | 'targeted'
  title: string
  matchScore: number | null
  updatedAt: string
}

interface ResumeProject {
  projectId: string
  title: string
  status: 'planned' | 'active' | 'done'
  org: string
  periodStart: string
  periodEnd: string
  included: boolean
  bullet: string
  bulletOverride: string
  tags: string[]
}

interface ResumeDetail {
  id: string
  type: 'master' | 'targeted'
  summary: string
  job: { company: string; role: string } | null
  profile: { name: string; headline: string; years: string; location: string; phone: string; email: string; links: string; education: string; skills: string[]; workExperience: string; photo: string } | null
  projects: ResumeProject[]
}

export function ResumeWorkspace() {
  const params = useSearchParams()
  const [versions, setVersions] = useState<Version[]>([])
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  async function load(id?: string) {
    const rows = await api<Version[]>('/api/resumes')
    setVersions(rows)
    const nextId = id || params.get('id') || rows.find((item) => item.type === 'master')?.id
    if (nextId) setResume(await api<ResumeDetail>(`/api/resumes/${nextId}`))
    notifyChanged()
  }

  useEffect(() => { void load() }, [params])

  if (!resume) return <main className="flex-1 p-6 text-[13px] text-[#7c8899]">正在读取简历…</main>
  const included = resume.projects.filter((project) => project.included)
  const unfinished = included.filter((project) => project.status !== 'done').length

  async function setIncluded(projectId: string, checked: boolean) {
    const ids = resume!.projects.filter((project) => project.included ? project.projectId !== projectId : false).map((project) => project.projectId)
    if (checked) ids.push(projectId)
    setResume(await api<ResumeDetail>(`/api/resumes/${resume!.id}`, { method: 'PATCH', body: JSON.stringify({ includedProjectIds: ids }) }))
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-3">
        <div>
          <h1 className="text-[19px] font-semibold">{copy.resumeTitle}</h1>
          <p className="text-[11.5px] text-[#7c8899]">{copy.resumeLead}</p>
        </div>
        <button className="ml-auto h-8 rounded-lg border px-3 text-[12px]" onClick={() => setProfileOpen((value) => !value)}>{copy.profile}</button>
      </header>
      {profileOpen && resume.profile && (
        <ProfileForm initial={resume.profile} summary={resume.summary} onSaved={async (summary) => {
          const next = await api<ResumeDetail>(`/api/resumes/${resume.id}`, { method: 'PATCH', body: JSON.stringify({ summary }) })
          setResume(next)
          notifyChanged()
        }} />
      )}
      <section className="flex min-h-0 flex-1 gap-3 px-5 pb-4">
        <div className="flex w-[236px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#e6eaf1] bg-white">
          <div className="border-b px-3.5 py-3 text-[12px] font-semibold">{copy.versions}</div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {versions.map((version) => (
              <button key={version.id} className={`w-full rounded-lg px-2.5 py-2 text-left ${version.id === resume.id ? 'border border-[#2f6bff] bg-[#eef3ff]' : 'hover:bg-[#f7f9fc]'}`} onClick={() => void load(version.id)}>
                <span className="text-[12px] font-medium">{version.type === 'master' ? copy.master : version.title}</span>
                {version.matchScore !== null && <span className="ml-1 text-[10px] text-[#0d8a6c]">{version.matchScore}%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e6eaf1] bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-[12.5px] font-semibold">{resume.type === 'master' ? copy.master : copy.targeted}</h2>
            <p className="mt-1 text-[10.5px] text-[#9aa7ba]">{copy.selectedCount(included.length)} · {copy.unfinished(unfinished)}</p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {resume.projects.map((project) => (
              <label key={project.projectId} className={`flex gap-2 rounded-lg border px-2.5 py-2 ${project.status !== 'done' && project.included ? 'border-[#f0e2bd] bg-[#fffdf7]' : 'border-[#e8ecf3]'}`}>
                <input className="mt-1" type="checkbox" checked={project.included} onChange={(event) => void setIncluded(project.projectId, event.target.checked)} />
                <span className="min-w-0 flex-1">
                  <span className="text-[12px] font-medium">{project.title}</span>
                  <span className="ml-1 rounded bg-[#f4f6f9] px-1 text-[9.5px]">{statusLabel(project.status)}</span>
                  {project.included && project.status !== 'done' && <p className="mt-1 text-[10px] text-[#a3771a]">{copy.unfinishedWarn}</p>}
                </span>
              </label>
            ))}
            <p className="rounded-lg border border-[#dbe6ff] bg-[#f8fbff] px-3 py-2 text-[10px] text-[#7f8ea6]">{copy.guardNote}</p>
          </div>
        </div>
        <div className="flex w-[470px] shrink-0 flex-col">
          <div className="flex items-center px-1 pb-2 text-[11px] text-[#546074]">
            <span>{copy.preview}</span>
            <span className="ml-2 rounded border px-1.5 text-[10px] text-[#8b98ab]">A4</span>
          </div>
          <ScaledResume>
            {resume.profile && (
              <ResumeSheet
                profile={resume.profile}
                job={resume.job}
                projects={included}
                editable={resume.type === 'targeted'}
                onBullet={(projectId, bulletOverride) => {
                  if (resume.type !== 'targeted') return
                  void api(`/api/resumes/${resume.id}`, { method: 'PATCH', body: JSON.stringify({ overrides: [{ projectId, bulletOverride }] }) }).then((next) => setResume(next as ResumeDetail))
                }}
                onPhoto={(photo) => {
                  void api('/api/profile', { method: 'PATCH', body: JSON.stringify({ photo }) }).then(() => {
                    setResume((current) => current?.profile ? { ...current, profile: { ...current.profile, photo } } : current)
                  })
                }}
              />
            )}
          </ScaledResume>
          <p className="px-1 pt-1 text-center text-[9px] text-[#c2cbd8]">{resume.type === 'master' ? copy.masterReadonly : copy.editTip}</p>
          <div className="mt-2 flex justify-end gap-2">
            <a className="flex h-8 items-center rounded-lg border px-3 text-[11.5px]" href={`/api/resumes/${resume.id}/markdown`}>{copy.exportMd}</a>
            <a className="flex h-8 items-center rounded-lg bg-[#2f6bff] px-3 text-[11.5px] text-white" href={`/resume/${resume.id}/print?autoprint=1`} target="_blank">{copy.exportPdf}</a>
          </div>
        </div>
      </section>
    </main>
  )
}

function ScaledResume({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ scale: 0.52, height: 584 })
  useEffect(() => {
    const node = frame.current
    const sheet = paper.current
    if (!node || !sheet) return
    const update = () => {
      const style = getComputedStyle(node)
      const available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const scale = available / (sheet.scrollWidth || 794)
      setBox({ scale, height: sheet.scrollHeight * scale })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [children])
  return (
    <div ref={frame} className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#e3e8f0] bg-[#eef0f3] p-3">
      <div className="overflow-hidden" style={{ width: '100%', height: box.height }}>
        <div ref={paper} style={{ width: 794, transform: `scale(${box.scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  )
}

function ProfileForm({ initial, summary, onSaved }: { initial: NonNullable<ResumeDetail['profile']>; summary: string; onSaved: (summary: string) => void }) {
  const [form, setForm] = useState({
    name: initial.name,
    headline: initial.headline,
    years: initial.years,
    location: initial.location,
    phone: initial.phone,
    email: initial.email,
    links: initial.links,
    summary,
    education: initial.education,
    workExperience: initial.workExperience,
    skillsText: initial.skills.join('\n'),
  })
  return (
    <form className="mx-5 mb-2 grid grid-cols-4 gap-2 rounded-xl border bg-white p-3 text-[12px]" onSubmit={async (event) => {
      event.preventDefault()
      await api('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          headline: form.headline,
          years: form.years,
          location: form.location,
          phone: form.phone,
          email: form.email,
          links: form.links,
          summary: form.summary,
          education: form.education,
          workExperience: form.workExperience,
          skills: form.skillsText.split('\n').map((item) => item.trim()).filter(Boolean),
        }),
      })
      onSaved(form.summary)
    }}>
      <input className="rounded border px-2 py-1" placeholder={copy.name} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <input className="rounded border px-2 py-1" placeholder={copy.headline} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} />
      <input className="rounded border px-2 py-1" placeholder={copy.years} value={form.years} onChange={(event) => setForm({ ...form, years: event.target.value })} />
      <input className="rounded border px-2 py-1" placeholder={copy.location} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
      <input className="rounded border px-2 py-1" placeholder={copy.phone} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <input className="rounded border px-2 py-1" placeholder={copy.email} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <input className="col-span-2 rounded border px-2 py-1" placeholder={copy.links} value={form.links} onChange={(event) => setForm({ ...form, links: event.target.value })} />
      <textarea className="col-span-4 min-h-16 rounded border px-2 py-1" placeholder={copy.workExperienceHint} value={form.workExperience} onChange={(event) => setForm({ ...form, workExperience: event.target.value })} />
      <textarea className="col-span-2 min-h-16 rounded border px-2 py-1" placeholder={`${copy.skills}，${copy.skillsHint}`} value={form.skillsText} onChange={(event) => setForm({ ...form, skillsText: event.target.value })} />
      <textarea className="col-span-2 min-h-16 rounded border px-2 py-1" placeholder={copy.educationHint} value={form.education} onChange={(event) => setForm({ ...form, education: event.target.value })} />
      <button className="h-8 rounded bg-[#2f6bff] text-white">保存档案</button>
    </form>
  )
}
