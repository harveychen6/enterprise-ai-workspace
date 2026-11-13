'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { copy } from '@/content/zh-CN'
import { api, notifyChanged, statusLabel, toneClass } from '@/lib/api'

interface JobSummary {
  id: string
  company: string
  role: string
  city: string
  salary: string
  matchScore: number
  hasResume: boolean
  updatedAt: string
}

interface JobDetail extends JobSummary {
  department: string
  jdText: string
  resumeId: string | null
  aiAvailable: boolean
  keywords: { text: string; evidence: string }[]
  matches: { projectId: string; title: string; status: string; relevance: number; reason: string; todoCount: number }[]
}

export function JobsWorkspace() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [current, setCurrent] = useState<JobDetail | null>(null)
  const [adding, setAdding] = useState(false)

  async function loadList(selectId?: string) {
    const rows = await api<JobSummary[]>('/api/jobs')
    setJobs(rows)
    const id = selectId ?? current?.id ?? rows[0]?.id
    if (id) setCurrent(await api<JobDetail>(`/api/jobs/${id}`))
    else setCurrent(null)
    notifyChanged()
  }

  useEffect(() => { void loadList() }, [])

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-end gap-4 border-b border-[#e9edf4] px-6 py-4">
        <div>
          <h1 className="text-[21px] font-semibold">{copy.jobsTitle}</h1>
          <p className="mt-1 text-[12.5px] text-[#7c8899]">{copy.jobsLead}</p>
        </div>
        <button className="ml-auto h-9 rounded-lg bg-[#2f6bff] px-3.5 text-[12.5px] text-white" onClick={() => setAdding(true)}>{copy.addJob}</button>
      </header>
      <section className="flex min-h-0 flex-1">
        <div className="w-[318px] shrink-0 overflow-y-auto border-r border-[#e6eaf1] bg-white p-2.5">
          {jobs.length === 0 && <p className="px-2 py-6 text-[12.5px] text-[#9aa7ba]">{copy.noJob}</p>}
          {jobs.map((job) => (
            <button key={job.id} className={`mb-1.5 w-full rounded-xl px-3.5 py-3 text-left ${current?.id === job.id ? 'border border-[#dbe6ff] bg-[#f7faff]' : 'hover:bg-[#fafbfd]'}`} onClick={async () => setCurrent(await api<JobDetail>(`/api/jobs/${job.id}`))}>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{job.role}</p>
                  <p className="truncate text-[11px] text-[#8b98ab]">{[job.company, job.city, job.salary].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`h-fit rounded-md px-1.5 text-[11px] font-semibold ${toneClass(job.matchScore)}`}>{job.matchScore}%</span>
              </div>
              <p className="mt-2 text-[10px] text-[#9aa7ba]">{job.hasResume ? '投递版已生成' : '待生成投递版'}</p>
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {current && (
            <>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-semibold">{current.role}</h2>
                  <p className="mt-1 text-[12.5px] text-[#7c8899]">{[current.company, current.city, current.salary, current.department].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[26px] font-semibold ${toneClass(current.matchScore).split(' ')[0]}`}>{current.matchScore}<span className="text-[12px] text-[#9aa7ba]">%</span></p>
                  <p className="text-[10.5px] text-[#9aa7ba]">岗位匹配度</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#e6eaf1] bg-white p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-[12.5px] font-semibold">{copy.keywords}</h3>
                  <button className="ml-auto text-[11px] text-[#7c8899]" disabled={!current.aiAvailable} onClick={async () => setCurrent(await api<JobDetail>(`/api/jobs/${current.id}/analyze`, { method: 'POST' }))}>{copy.reanalyze}</button>
                </div>
                {!current.aiAvailable && <p className="mt-2 text-[11px] text-[#9aa7ba]">{copy.aiMissing}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.keywords.map((keyword) => (
                    <span key={keyword.text} className={`rounded-md border px-2.5 py-1 text-[11.5px] ${keyword.evidence === 'supported' ? 'border-[#dfe8f8] bg-[#f4f7fd]' : 'border-[#f3e4c2] bg-[#fffaf0]'}`}>
                      {keyword.text}
                      <span className="ml-1 text-[10px] text-[#9aa7ba]">{keyword.evidence === 'supported' ? copy.supported : copy.gap}</span>
                    </span>
                  ))}
                </div>
              </div>
              <h3 className="mb-2 mt-5 text-[13.5px] font-semibold">{copy.matchedProjects}</h3>
              <div className="space-y-2.5">
                {current.matches.map((match) => (
                  <div key={match.projectId} className="rounded-xl border border-[#e6eaf1] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-semibold">{match.title}</h4>
                      <span className="rounded bg-[#f4f6f9] px-1.5 text-[10px]">{statusLabel(match.status)}</span>
                      <span className="ml-auto text-[11px] text-[#0d8a6c]">相关度 {match.relevance}</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-6 text-[#5d6a7e]">{match.reason}</p>
                    {match.status !== 'done' && <p className="mt-2 text-[10.5px] text-[#b98217]">{copy.unfinishedWarn}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e6eaf1] bg-white p-4">
                <p className="flex-1 text-[12px] text-[#2b3a52]">生成后仍可在简历编辑器里增减项目与微调措辞。</p>
                <button className="h-10 rounded-lg bg-[#2f6bff] px-4 text-[13px] text-white" onClick={async () => {
                  const result = await api<{ resumeId: string }>(`/api/jobs/${current.id}/resume`, { method: 'POST' })
                  router.push(`/resume?id=${result.resumeId}`)
                }}>{copy.generateResume}</button>
              </div>
            </>
          )}
        </div>
      </section>
      {adding && <AddJob onClose={() => setAdding(false)} onCreated={async (id) => { setAdding(false); await loadList(id) }} />}
    </main>
  )
}

function AddJob({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ company: '', role: '', city: '', salary: '', department: '', jdText: '' })
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/35 p-6" onClick={onClose}>
      <form className="w-[640px] rounded-2xl bg-white" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
        event.preventDefault()
        setSaving(true)
        const created = await api<{ id: string }>('/api/jobs', { method: 'POST', body: JSON.stringify(form) })
        onCreated(created.id)
      }}>
        <div className="border-b border-[#eef1f6] px-6 py-4">
          <h2 className="text-[16px] font-semibold">{copy.addJob}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 py-4">
          <Field label={copy.company} value={form.company} onChange={(company) => setForm({ ...form, company })} />
          <Field label={copy.role} value={form.role} onChange={(role) => setForm({ ...form, role })} />
          <Field label={copy.city} value={form.city} onChange={(city) => setForm({ ...form, city })} />
          <Field label={copy.salary} value={form.salary} onChange={(salary) => setForm({ ...form, salary })} />
          <Field label={copy.department} value={form.department} onChange={(department) => setForm({ ...form, department })} />
          <label className="col-span-2 text-[11.5px] font-medium">
            {copy.jd}
            <textarea className="mt-1.5 h-40 w-full rounded-lg border border-[#e2e8f0] p-2 text-[12px] font-normal" value={form.jdText} onChange={(event) => setForm({ ...form, jdText: event.target.value })} />
          </label>
          <p className="col-span-2 text-[10.5px] text-[#7f8ea6]">{copy.guardNote}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eef1f6] px-6 py-3">
          <button type="button" className="h-9 rounded-lg border px-4 text-[12.5px]" onClick={onClose}>取消</button>
          <button className="h-9 rounded-lg bg-[#2f6bff] px-4 text-[12.5px] text-white" disabled={saving}>{saving ? '提取关键词中…' : copy.saveMatch}</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-[11.5px] font-medium">
      {label}
      <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-3 text-[12.5px] font-normal" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
