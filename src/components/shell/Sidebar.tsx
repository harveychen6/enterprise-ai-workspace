'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { copy } from '@/content/zh-CN'
import { api, notifyChanged } from '@/lib/api'

interface Meta {
  aiAvailable: boolean
  profile: { name: string; headline: string }
  projectCount: number
  jobCount: number
  completeness: number | null
  readiness: { ready: number; total: number } | null
}

export function Sidebar() {
  const pathname = usePathname()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [days, setDays] = useState(7)

  async function load() {
    const [nextMeta, settings] = await Promise.all([
      api<Meta>('/api/meta'),
      api<{ syncIntervalDays: number }>('/api/settings'),
    ])
    setMeta(nextMeta)
    setDays(settings.syncIntervalDays)
  }

  useEffect(() => {
    void load()
    const onChange = () => void load()
    window.addEventListener('careerdesk:changed', onChange)
    return () => window.removeEventListener('careerdesk:changed', onChange)
  }, [])

  const items = [
    { href: '/projects', label: copy.navProjects, hint: copy.navProjectsHint },
    { href: '/jobs', label: copy.navJobs, hint: copy.navJobsHint },
    { href: '/resume', label: copy.navResume, hint: copy.navResumeHint },
  ]

  return (
    <aside className="flex h-full w-[228px] shrink-0 flex-col border-r border-[#e6eaf1] bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#eef1f6] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#2f6bff] text-sm font-semibold text-white">C</div>
        <div>
          <p className="text-[14.5px] font-semibold">{copy.appName}</p>
          <p className="text-[10.5px] text-[#93a0b4]">{copy.tagline}</p>
        </div>
      </div>
      <nav className="space-y-1 px-3 pt-4">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${active ? 'bg-[#eef3ff] font-medium text-[#2f6bff]' : 'text-[#546074] hover:bg-[#f6f8fc]'}`}>
              {item.label}
              <span className="ml-auto text-[10.5px] text-[#9aa7ba]">{item.hint}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mx-3 mt-5 rounded-xl border border-[#e8eefb] bg-[#f7faff] p-3.5 text-[11.5px] text-[#5c6980]">
        <div className="flex justify-between">
          <span>{copy.completeness}</span>
          <span className="font-semibold text-[#2f6bff]">{meta?.completeness === null || meta?.completeness === undefined ? '—' : `${meta.completeness}%`}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#e2eaf9]">
          <div className="h-full rounded-full bg-[#2f6bff]" style={{ width: `${meta?.completeness ?? 0}%` }} />
        </div>
        <div className="mt-3 flex justify-between">
          <span>{copy.readiness}</span>
          <span className="font-semibold text-[#2f6bff]">{meta?.readiness ? `${meta.readiness.ready} / ${meta.readiness.total}` : '—'}</span>
        </div>
        {!meta?.aiAvailable && <p className="mt-2 text-[11px] leading-5 text-[#8290a6]">{copy.aiMissing}</p>}
      </div>
      <div className="mx-3 mt-3 space-y-2 text-[12px]">
        <label className="block text-[11px] text-[#7c8899]">
          {copy.syncInterval}
          <input className="mt-1 h-8 w-full rounded-lg border border-[#e2e8f0] px-2" type="number" min={1} value={days} onChange={(event) => setDays(Number(event.target.value))} onBlur={() => void api('/api/settings', { method: 'PATCH', body: JSON.stringify({ syncIntervalDays: days }) })} />
        </label>
        <div className="flex gap-2">
          <a className="rounded-lg border border-[#e2e8f0] px-2 py-1" href="/api/backup">{copy.exportData}</a>
          <label className="cursor-pointer rounded-lg border border-[#e2e8f0] px-2 py-1">
            {copy.importData}
            <input className="hidden" type="file" accept="application/json" onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const backup = JSON.parse(await file.text()) as unknown
              if (!window.confirm(copy.backupConfirm)) return
              await api('/api/backup', { method: 'POST', body: JSON.stringify({ confirm: true, backup }) })
              notifyChanged()
              window.location.reload()
            }} />
          </label>
        </div>
      </div>
      <div className="mt-auto border-t border-[#eef1f6] p-3">
        <p className="truncate text-[12.5px] font-medium">{meta?.profile.name || copy.emptyName}</p>
        <p className="truncate text-[10.5px] text-[#9aa7ba]">{meta?.profile.headline || copy.tagline}</p>
      </div>
    </aside>
  )
}
