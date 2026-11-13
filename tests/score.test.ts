import { describe, expect, it } from 'vitest'
import { matchJob, scoreTone } from '@/domain/score'
import type { ScoreProject } from '@/domain/score'

const projects: ScoreProject[] = [
  {
    id: 'monitor',
    status: 'done',
    tags: ['Prometheus', 'SLO'],
    facts: '梳理规则，无效告警 430 降至 78',
    bullet: '告警治理',
  },
  {
    id: 'k8s',
    status: 'planned',
    tags: ['Kubernetes'],
    facts: '计划迁移到托管 Kubernetes，尚未执行',
    bullet: '筹备中',
  },
  {
    id: 'order',
    status: 'active',
    tags: ['Java'],
    facts: '已完成 30% 灰度',
    bullet: '结算重构进行中',
  },
]

describe('matchJob', () => {
  it('用状态权重和数字证据计算岗位分，并标出关键词有没有原文', () => {
    const result = matchJob(['SLO', 'Kubernetes', '不存在的技能'], projects)
    expect(result.score).toBe(43)
    expect(result.keywords).toEqual([
      { text: 'SLO', evidence: 'supported' },
      { text: 'Kubernetes', evidence: 'supported' },
      { text: '不存在的技能', evidence: 'gap' },
    ])
    expect(result.matches.map((item) => [item.projectId, item.relevance])).toEqual([
      ['monitor', 33],
      ['k8s', 10],
    ])
    expect(result.defaultProjectIds).toEqual(['monitor'])
  })

  it('已完成且命中全部关键词时岗位分为 100', () => {
    const result = matchJob(['SLO', 'Prometheus'], [projects[0]])
    expect(result.score).toBe(100)
    expect(result.defaultProjectIds).toEqual(['monitor'])
  })
})

describe('scoreTone', () => {
  it('按 80 和 65 分档上色', () => {
    expect(scoreTone(80)).toBe('high')
    expect(scoreTone(79)).toBe('mid')
    expect(scoreTone(65)).toBe('mid')
    expect(scoreTone(64)).toBe('low')
  })
})
