import type { ProjectStatus } from '@/domain/score'

function numberPattern(): RegExp {
  return /(?<![A-Za-z])\d+(?:\.\d+)?(?![A-Za-z])/g
}

export function plannedBullet(title: string): string {
  return `筹备「${title}」（计划中，尚未执行）。`
}

function derivedPercents(facts: string): Set<number> {
  const nums = [...facts.matchAll(numberPattern())].map((match) => Number(match[0]))
  const derived = new Set<number>()
  for (const left of nums) {
    for (const right of nums) {
      const denom = Math.max(left, right)
      if (left === right || denom === 0) continue
      derived.add(Math.round((Math.abs(left - right) / denom) * 100))
    }
  }
  return derived
}

export function validateBullet(input: {
  status: ProjectStatus
  facts: string
  bullet: string
}): { ok: true } | { ok: false; reason: string } {
  const bullet = input.bullet.trim()
  if (!bullet) return { ok: false, reason: '简历句为空' }

  if (input.status === 'planned') {
    if (!/计划中|尚未执行/.test(bullet)) {
      return { ok: false, reason: '计划中的项目必须标明尚未执行' }
    }
    if (/已上线|已完成|全量/.test(bullet)) {
      return { ok: false, reason: '计划中的项目不能写成已达成结果' }
    }
  }

  if (input.status === 'active') {
    if (!bullet.includes('进行中')) {
      return { ok: false, reason: '进行中的项目必须标明进行中' }
    }
    if (/已全量上线|已经上线|已上线/.test(bullet)) {
      return { ok: false, reason: '进行中的项目不能写成已上线' }
    }
  }

  const factTokens = new Set([...input.facts.matchAll(numberPattern())].map((match) => match[0]))
  const derived = derivedPercents(input.facts)
  for (const token of bullet.match(numberPattern()) ?? []) {
    if (factTokens.has(token)) continue
    if (derived.has(Math.round(Number(token)))) continue
    return { ok: false, reason: `数字 ${token} 无法在事实中找到` }
  }
  return { ok: true }
}
