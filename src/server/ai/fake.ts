import { plannedBullet } from '@/domain/guard'
import type { AiClient, BulletInput, ReasonInput } from '@/server/ai/types'

const CATALOG = ['Prometheus', 'Grafana', 'SLO', 'Kubernetes', 'Java', 'Redis', 'Go', 'MySQL', 'Spring Cloud']

export function createFakeAi(): AiClient {
  return {
    async extractKeywords(jd: string) {
      return CATALOG.filter((word) => jd.toLowerCase().includes(word.toLowerCase())).slice(0, 5)
    },
    async writeReasons(_keywords: string[], projects: ReasonInput[]) {
      return projects.map((project) => ({
        projectId: project.projectId,
        reason: `事实原文：「${project.facts.slice(0, 80)}」`,
      }))
    },
    async refineBullet(input: BulletInput) {
      if (input.status === 'planned') return plannedBullet(input.title)
      const line = input.facts.split('\n').map((item) => item.trim()).find(Boolean) ?? input.title
      return input.status === 'active' ? `进行中：${line}` : line
    },
  }
}
