'use client'

import { formatResumePeriod } from '@/domain/period'
import { splitResumeHeading, splitResumeLead } from '@/domain/resume-line'
import './resume-sheet.css'

export interface SheetProfile {
  name: string
  headline: string
  years: string
  location: string
  phone: string
  email: string
  links: string
  education: string
  skills: string[]
  workExperience: string
  photo: string
}

export interface SheetProject {
  projectId: string
  title: string
  org: string
  periodStart: string
  periodEnd: string
  bullet: string
}

interface ResumeSheetProps {
  profile: SheetProfile
  job: { company: string; role: string } | null
  projects: SheetProject[]
  editable?: boolean
  onBullet?: (projectId: string, value: string) => void
  onPhoto?: (dataUrl: string) => void
}

function ContentLine({ text }: { text: string }) {
  const parts = splitResumeLead(text)
  if (!parts) return text
  return <><strong>{parts.lead}</strong>{parts.body}</>
}

function bulletLines(text: string): string[] {
  return text.split('\n').map((line) => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
}

function educationRows(text: string): { school: string; detail: string; time: string }[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s*[·|]\s*/).filter(Boolean)
    const time = parts.find((part) => /\d{4}/.test(part)) ?? ''
    const rest = parts.filter((part) => part !== time)
    return { school: rest[0] ?? line, detail: rest.slice(1).join(' · '), time }
  })
}

function workBlocks(text: string): { name: string; period: string; lines: string[] }[] {
  return text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).map((block) => {
    const [head, ...rest] = block.split('\n')
    const { name, period } = splitResumeHeading(head)
    return { name, period, lines: rest.map((line) => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean) }
  })
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const max = 480
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error('无法处理图片'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.86))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片'))
    }
    image.src = url
  })
}

export function ResumeSheet({ profile, job, projects, editable = false, onBullet, onPhoto }: ResumeSheetProps) {
  const intention = [profile.headline, profile.years].filter(Boolean).join(' · ')
  const rows = educationRows(profile.education)
  const jobs = workBlocks(profile.workExperience)
  return (
    <article className="career-sheet">
      <header className="header-grid">
        <div>
          <h1>{profile.name || '未填写姓名'}</h1>
          {intention && <div className="headline">{intention.startsWith('求职意向') ? intention : `求职意向：${intention}`}</div>}
          {profile.location && <div className="contact">意向城市：{profile.location}</div>}
          {(profile.phone || profile.email) && (
            <div className="contact">
              {profile.phone && <span>电话：{profile.phone}</span>}
              {profile.phone && profile.email && <span>　|　</span>}
              {profile.email && <span>邮箱：<a href={`mailto:${profile.email}`}>{profile.email}</a></span>}
            </div>
          )}
          {profile.links && <div className="contact">{profile.links}</div>}
          {job && <div className="contact">投递：{job.company} · {job.role}</div>}
        </div>
        <label className={`profile-photo-slot${profile.photo ? ' has-photo' : ''}`} aria-label="替换证件照">
          {profile.photo ? <img src={profile.photo} alt="证件照" /> : <span className="photo-placeholder">证件照</span>}
          {onPhoto && (
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                void readPhoto(file).then(onPhoto)
              }}
            />
          )}
        </label>
      </header>
      <section className="section">
        <h2 className="section-title">工作经历</h2>
        {jobs.map((item) => (
          <article className="project" key={`${item.name}-${item.period}`}>
            <div className="company">
              <div className="company-name">{item.name}</div>
              {item.period && <div className="company-meta">{item.period}</div>}
            </div>
            {item.lines.length > 0 && (
              <ul>{item.lines.map((line, index) => <li key={`${item.name}-${index}`}><ContentLine text={line} /></li>)}</ul>
            )}
          </article>
        ))}
      </section>
      <section className="section">
        <h2 className="section-title">项目经历</h2>
        {projects.map((project) => {
          const lines = bulletLines(project.bullet)
          const period = formatResumePeriod(project.periodStart, project.periodEnd)
          return (
            <article className="project" key={project.projectId}>
              <div className="company">
                <div className="company-name">{[project.title, project.org].filter(Boolean).join(' · ')}</div>
                {period && <div className="company-meta">{period}</div>}
              </div>
              {(editable || lines.length > 0) && (
                <ul
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(event) => editable && onBullet?.(project.projectId, event.currentTarget.innerText)}
                >
                  {(lines.length ? lines : ['']).map((line, index) => <li key={`${project.projectId}-${index}`}><ContentLine text={line} /></li>)}
                </ul>
              )}
            </article>
          )
        })}
      </section>
      {profile.skills.length > 0 && (
        <section className="section">
          <h2 className="section-title">专业技能</h2>
          <ul>{profile.skills.map((skill, index) => <li key={`${index}-${skill}`}><ContentLine text={skill} /></li>)}</ul>
        </section>
      )}
      <section className="section">
        <h2 className="section-title">教育背景</h2>
        {rows.map((row) => (
          <div className="edu" key={`${row.school}-${row.detail}-${row.time}`}>
            <strong>{row.school}</strong>
            {row.detail && <span>{row.detail}</span>}
            {row.time && <time>{row.time}</time>}
          </div>
        ))}
      </section>
    </article>
  )
}
