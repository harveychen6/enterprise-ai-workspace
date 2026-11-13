'use client'

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { copy } from '@/content/zh-CN'
import { isOngoing, toMonthInput } from '@/domain/period'
import { api, notifyChanged, statusLabel } from '@/lib/api'

type Status = 'planned' | 'active' | 'done'

interface Project {
  id: string
  title: string
  status: Status
  tags: string[]
  factsMarkdown: string
  todos: string
  resumeBullet: string
  org: string
  periodStart: string
  periodEnd: string
  updatedAt: string
  todoCount: number
}

interface Proposal {
  id: string
  projectId: string
  title: string
  baseBullet: string
  proposedBullet: string
  evidenceNote: string
  proposalStatus: 'pending' | 'rejected'
}

const COLUMNS: Status[] = ['planned', 'active', 'done']
const DOT: Record<Status, string> = { planned: '#94a3b8', active: '#2f6bff', done: '#10a37f' }

export function ProjectBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [mergeOpen, setMergeOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)

  async function reload() {
    const [rows, pending, meta] = await Promise.all([
      api<Project[]>('/api/projects'),
      api<Proposal[]>('/api/sync/pending'),
      api<{ aiAvailable: boolean }>('/api/meta'),
    ])
    setProjects(rows)
    setProposals(pending)
    setAiAvailable(meta.aiAvailable)
    notifyChanged()
  }

  useEffect(() => { void reload() }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const visible = projects.filter((project) => {
    const hay = `${project.title} ${project.tags.join(' ')}`.toLowerCase()
    return hay.includes(query.trim().toLowerCase())
  })
  const pendingCount = proposals.filter((item) => item.proposalStatus === 'pending').length

  async function removeProject(id: string) {
    await api(`/api/projects/${id}`, { method: 'DELETE' })
    if (openId === id) setOpenId(null)
    await reload()
  }

  async function onDragEnd(event: DragEndEvent) {
    const status = event.over?.id
    if (!event.active.id || (status !== 'planned' && status !== 'active' && status !== 'done')) return
    await api(`/api/projects/${event.active.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    await reload()
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {pendingCount > 0 && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-[#f3e0b5] bg-[#fffaef] px-4 py-2.5 text-[12.5px] text-[#7a5a13]">
          <p className="flex-1">{copy.mergeBanner(pendingCount)}</p>
          <button className="rounded-lg border border-[#f0dcae] bg-[#fdf1d4] px-3 py-1.5" onClick={() => setMergeOpen(true)}>{copy.mergeAction}</button>
        </div>
      )}
      <header className="flex items-end gap-4 px-6 pb-3 pt-4">
        <div>
          <h1 className="text-[21px] font-semibold">{copy.projectTitle}</h1>
          <p className="mt-1 text-[12.5px] text-[#7c8899]">{copy.projectLead}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input className="h-9 w-[230px] rounded-lg border border-[#e2e8f0] px-3 text-[12.5px]" placeholder={copy.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="h-9 rounded-lg bg-[#2f6bff] px-3.5 text-[12.5px] text-white" onClick={async () => {
            const created = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ title: '未命名项目' }) })
            await reload()
            setOpenId(created.id)
          }}>{copy.newProject}</button>
        </div>
      </header>
      {projects.length === 0 ? (
        <div className="mx-6 rounded-2xl border border-dashed border-[#d5deea] bg-white p-8 text-[13px] text-[#7c8899]">
          <p>{copy.emptyProjects}</p>
          <button className="mt-4 h-9 rounded-lg border border-[#dbe6ff] px-3 text-[#2f6bff]" onClick={async () => {
            try {
              await api('/api/demo', { method: 'POST', body: JSON.stringify({ confirm: false }) })
            } catch (error) {
              if (!window.confirm(error instanceof Error ? error.message : copy.demoConfirm)) return
              await api('/api/demo', { method: 'POST', body: JSON.stringify({ confirm: true }) })
            }
            await reload()
          }}>{copy.importDemo}</button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={(event) => void onDragEnd(event)}>
          <section className="grid min-h-0 flex-1 grid-cols-3 gap-4 px-6 pb-5">
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                projects={visible.filter((project) => project.status === status)}
                onOpen={setOpenId}
                onDelete={(id) => void removeProject(id)}
              />
            ))}
          </section>
        </DndContext>
      )}
      {openId && (
        <Drawer
          project={projects.find((project) => project.id === openId) ?? null}
          aiAvailable={aiAvailable}
          onClose={() => setOpenId(null)}
          onSaved={() => void reload()}
        />
      )}
      {mergeOpen && (
        <MergeDialog proposals={proposals} onClose={() => setMergeOpen(false)} onApplied={async () => { setMergeOpen(false); await reload() }} />
      )}
    </main>
  )
}

function Column({ status, projects, onOpen, onDelete }: { status: Status; projects: Project[]; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className={`flex min-h-0 flex-col rounded-2xl border bg-[#f0f3f8] ${isOver ? 'border-[#9dbcf7]' : 'border-[#e7ebf2]'}`}>
      <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3.5 text-[13px] font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ background: DOT[status] }} />
        {statusLabel(status)}
        <span className="rounded border border-[#e3e8f0] bg-white px-1.5 text-[10.5px] font-normal text-[#8b98ab]">{projects.length}</span>
      </div>
      <div ref={setNodeRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3">
        {projects.map((project) => <Card key={project.id} project={project} onOpen={onOpen} onDelete={onDelete} />)}
      </div>
    </div>
  )
}

function Card({ project, onOpen, onDelete }: { project: Project; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  const excerpt = project.factsMarkdown.split('\n').map((line) => line.trim()).find(Boolean) ?? ''
  return (
    <article
      ref={setNodeRef}
      className="cursor-pointer rounded-xl border border-[#e6eaf1] bg-white p-3.5 shadow-sm"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.45 : 1 }}
      onClick={() => onOpen(project.id)}
    >
      <div className="flex gap-2">
        <h3 className="flex-1 text-[13.5px] font-semibold">{project.title}</h3>
        <button className="text-[#cbd4e1]" aria-label="拖拽" {...listeners} {...attributes} onClick={(event) => event.stopPropagation()}>⋮⋮</button>
      </div>
      <p className="mt-1 text-[11px] text-[#9aa7ba]">{project.updatedAt.slice(0, 10)}</p>
      <p className="mt-2 line-clamp-2 text-[12px] leading-6 text-[#5d6a7e]">{excerpt}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {project.tags.map((tag) => <span key={tag} className="rounded border border-[#e8ecf3] bg-[#f4f6f9] px-1.5 text-[10px] text-[#6f7c90]">{tag}</span>)}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[10.5px]">
        {project.todoCount > 0 && <span className="rounded border border-[#f5e6c3] bg-[#fffaef] px-1.5 text-[#b98217]">{project.todoCount} 个待补问题</span>}
        <button
          className="rounded px-1.5 py-0.5 text-[#9aa7ba] hover:bg-[#fdecec] hover:text-[#c24141]"
          onClick={(event) => {
            event.stopPropagation()
            if (!window.confirm(copy.deleteProjectConfirm(project.title))) return
            onDelete(project.id)
          }}
        >{copy.deleteProject}</button>
      </div>
    </article>
  )
}

function Drawer({ project, aiAvailable, onClose, onSaved }: { project: Project | null; aiAvailable: boolean; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(project)
  const [saveText, setSaveText] = useState(copy.saved)
  const [refining, setRefining] = useState(false)
  const skip = useRef(true)
  const savedRef = useRef(onSaved)
  savedRef.current = onSaved
  const loadedId = useRef<string | null>(null)

  useEffect(() => {
    if (!project || loadedId.current === project.id) return
    loadedId.current = project.id
    skip.current = true
    setDraft(project)
  }, [project])

  useEffect(() => {
    if (!draft) return
    if (skip.current) {
      skip.current = false
      return
    }
    setSaveText(copy.saving)
    const timer = window.setTimeout(() => {
      void api(`/api/projects/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draft.title,
          status: draft.status,
          tags: draft.tags,
          factsMarkdown: draft.factsMarkdown,
          todos: draft.todos,
          resumeBullet: draft.resumeBullet,
          org: draft.org,
          periodStart: draft.periodStart,
          periodEnd: draft.periodEnd,
        }),
      }).then(() => {
        setSaveText(copy.saved)
        savedRef.current()
      })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!draft) return null
  const hint = draft.status === 'active' ? copy.activeHint : draft.status === 'done' ? copy.doneHint : copy.plannedHint
  return (
    <div className="fixed inset-0 z-40 bg-[#101828]/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 flex h-full w-[512px] flex-col bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#eef1f6] px-5 py-4">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ background: DOT[draft.status] }} />
            <span>{statusLabel(draft.status)}</span>
            <span className="ml-auto text-[#0d8a6c]">{saveText}</span>
            <button className="rounded-md px-2 py-1 text-[12px] text-[#546074] hover:bg-[#f4f6f9]" type="button" onClick={onClose}>{copy.close}</button>
          </div>
          <label className="mt-3 block">
            <span className="text-[11.5px] font-medium text-[#4a5668]">{copy.projectName}</span>
            <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-2 text-[14px] font-semibold" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="mt-3 block">
            <span className="text-[11.5px] font-medium text-[#4a5668]">{copy.tags}</span>
            <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-2 text-[12px]" placeholder={copy.tagsHint} value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) })} />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11.5px] font-medium text-[#4a5668]">{copy.org}</span>
              <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-2 text-[12px]" value={draft.org} onChange={(event) => setDraft({ ...draft, org: event.target.value })} />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-medium text-[#4a5668]">{copy.periodStart}</span>
              <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-2 text-[12px]" type="month" value={toMonthInput(draft.periodStart)} onChange={(event) => setDraft({ ...draft, periodStart: event.target.value })} />
            </label>
            <div>
              <label className="block">
                <span className="text-[11.5px] font-medium text-[#4a5668]">{copy.periodEnd}</span>
                <input className="mt-1.5 h-9 w-full rounded-lg border border-[#e2e8f0] px-2 text-[12px] disabled:bg-[#f4f6f9]" type="month" disabled={isOngoing(draft.periodEnd)} value={isOngoing(draft.periodEnd) ? '' : toMonthInput(draft.periodEnd)} onChange={(event) => setDraft({ ...draft, periodEnd: event.target.value })} />
              </label>
              <label className="mt-1 flex items-center gap-1 text-[11px] text-[#7c8899]">
                <input type="checkbox" checked={isOngoing(draft.periodEnd)} onChange={(event) => setDraft({ ...draft, periodEnd: event.target.checked ? '至今' : '' })} />
                {copy.ongoing}
              </label>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-[12px] font-medium">
            {copy.status}
            <select className="mt-1 h-9 w-full rounded-lg border border-[#e2e8f0] px-2" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>
              {COLUMNS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <p className="mt-1 text-[11px] font-normal text-[#9aa7ba]">{hint}</p>
          </label>
          <label className="block text-[12px] font-medium">
            {copy.facts}
            <textarea className="mt-1 h-40 w-full rounded-lg border border-[#e2e8f0] p-2 text-[12.5px] font-normal" value={draft.factsMarkdown} onChange={(event) => setDraft({ ...draft, factsMarkdown: event.target.value })} />
          </label>
          <label className="block text-[12px] font-medium">
            {copy.todos}
            <textarea className="mt-1 h-24 w-full rounded-lg border border-[#e8d49a] bg-[#fffdf8] p-2 text-[12.5px] font-normal" placeholder={copy.todoPlaceholder} value={draft.todos} onChange={(event) => setDraft({ ...draft, todos: event.target.value })} />
          </label>
          <div>
            <div className="flex items-center">
              <span className="text-[12px] font-medium">{copy.bullet}</span>
              <button className="ml-auto rounded-md bg-[#2f6bff] px-2.5 py-1 text-[11px] text-white disabled:bg-[#c5d4f5]" disabled={!aiAvailable || refining} onClick={async () => {
                setRefining(true)
                try {
                  const result = await api<{ bullet: string }>(`/api/projects/${draft.id}/refine`, { method: 'POST' })
                  setDraft({ ...draft, resumeBullet: result.bullet })
                } finally {
                  setRefining(false)
                }
              }}>{refining ? copy.refining : copy.refine}</button>
            </div>
            {!aiAvailable && <p className="mt-1 text-[11px] text-[#9aa7ba]">{copy.aiOffRefine}</p>}
            <label className="mt-2 block">
              <span className="sr-only">{copy.bullet}</span>
              <textarea className="h-28 w-full rounded-lg border border-[#dbe6ff] p-2 text-[12.5px]" value={draft.resumeBullet} onChange={(event) => setDraft({ ...draft, resumeBullet: event.target.value })} />
            </label>
          </div>
        </div>
      </aside>
    </div>
  )
}

function MergeDialog({ proposals, onClose, onApplied }: { proposals: Proposal[]; onClose: () => void; onApplied: () => void }) {
  const pending = useMemo(() => proposals.filter((item) => item.proposalStatus === 'pending'), [proposals])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/35 p-6" onClick={onClose}>
      <div className="flex max-h-[86vh] w-[880px] flex-col rounded-2xl bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#eef1f6] px-6 py-4">
          <h2 className="text-[16px] font-semibold">{copy.mergeTitle}</h2>
          <p className="mt-1 text-[12px] text-[#7c8899]">{copy.mergeLead}</p>
          <p className="mt-2 text-[11px] text-[#9aa7ba]">{copy.ignoredPlanned}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {proposals.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-[#e6eaf1]">
              <div className="border-b border-[#eef1f6] bg-[#f8fafc] px-4 py-2 text-[12.5px]">{item.title}</div>
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4 text-[12px] leading-7 text-[#7c8899]"><p className="mb-1 text-[10.5px]">{copy.currentBullet}</p>{item.baseBullet || '（空）'}</div>
                <div className="bg-[#f8fbff] p-4 text-[12px] leading-7">
                  <p className="mb-1 text-[10.5px] text-[#2f6bff]">{copy.nextBullet}</p>
                  {item.proposalStatus === 'rejected' ? copy.rejected : item.proposedBullet}
                  {item.evidenceNote && <p className="mt-2 text-[10.5px] text-[#8b98ab]">{item.evidenceNote}</p>}
                </div>
              </div>
            </div>
          ))}
          <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[10.5px] text-[#7f8ea6]">{copy.guardNote}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eef1f6] px-6 py-3">
          <button className="h-9 rounded-lg border px-4 text-[12.5px]" onClick={onClose}>{copy.mergeLater}</button>
          <button className="h-9 rounded-lg bg-[#2f6bff] px-4 text-[12.5px] text-white disabled:bg-[#c5d4f5]" disabled={pending.length === 0} onClick={async () => {
            await api('/api/sync/apply', { method: 'POST', body: JSON.stringify({ ids: pending.map((item) => item.id) }) })
            onApplied()
          }}>{copy.mergeConfirm}</button>
        </div>
      </div>
    </div>
  )
}
