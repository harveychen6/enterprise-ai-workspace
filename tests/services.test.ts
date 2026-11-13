import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from '@/server/backup'
import { resetDbForTests } from '@/server/db'
import { createJob } from '@/server/jobs'
import { createProject, getProject, refineProject, updateProject } from '@/server/projects'
import { generateTargetedResume, getResume, listResumes, updateResume } from '@/server/resumes'
import { listPendingProposals } from '@/server/sync'

beforeEach(() => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'careerdesk-'))
  process.env.AI_PROVIDER = 'fake'
  delete process.env.OPENAI_API_KEY
  resetDbForTests()
})

describe('工作台服务', () => {
  it('启动时只有一份空白母版', () => {
    expect(listResumes().filter((item) => item.type === 'master')).toHaveLength(1)
    expect(listResumes()[0]?.title).toBe('经历母版')
  })

  it('计划中项目的提炼不会写成成果，投递版改写也不回写项目', async () => {
    const planned = createProject('K8s 迁移')
    const refined = await refineProject(planned.id)
    expect(refined?.bullet).toContain('尚未执行')
    expect(refined?.bullet).not.toContain('已完成')

    const done = createProject('告警治理')
    await updateProject(done.id, {
      status: 'done',
      factsMarkdown: '无效告警 430 降至 78，使用 SLO',
      resumeBullet: '母版句子',
      tags: ['SLO'],
    })
    const job = await createJob({ company: '字节', role: '可观测性', jdText: '熟悉 SLO 与 Kubernetes' })
    const resumeId = generateTargetedResume(job?.id ?? '')
    expect(resumeId).toBeTruthy()
    const updated = updateResume(resumeId!, {
      overrides: [{ projectId: done.id, bulletOverride: '投递版句子' }],
    })
    expect(updated?.projects.find((item) => item.projectId === done.id)?.bullet).toBe('投递版句子')
    expect(getProject(done.id)?.resumeBullet).toBe('母版句子')
    const detail = getResume(resumeId!)
    expect(detail?.projects.find((item) => item.projectId === planned.id)?.included).toBe(false)
  })

  it('拖入已完成且事实已更新时生成合并提案', async () => {
    const project = createProject('性能优化')
    await updateProject(project.id, { factsMarkdown: 'P99 820 降至 190' })
    await updateProject(project.id, { status: 'done' })
    const pending = await listPendingProposals()
    expect(pending.some((item) => item.projectId === project.id && item.proposalStatus === 'pending')).toBe(true)
  })

  it('全量备份可以导回', async () => {
    const project = createProject('作品集')
    await updateProject(project.id, { factsMarkdown: '首页已完成' })
    const backup = exportBackup()
    await updateProject(project.id, { title: '被改掉的标题' })
    importBackup(backup, true)
    expect(getProject(project.id)?.title).toBe('作品集')
  })
})
