import { describe, expect, it } from 'vitest'
import { plannedBullet, validateBullet } from '@/domain/guard'

const facts = '日均无效告警 430 降至 78，误报率下降。'

describe('validateBullet', () => {
  it('接受事实中出现过的数字，以及能由两个事实数字复核的百分比', () => {
    expect(validateBullet({ status: 'done', facts, bullet: '无效告警由 430 降至 78。' }).ok).toBe(true)
    expect(validateBullet({ status: 'done', facts, bullet: '无效告警下降约 82%。' }).ok).toBe(true)
  })

  it('拒绝事实中没有的数字和无法复核的百分比', () => {
    expect(validateBullet({ status: 'done', facts, bullet: '无效告警降至 12。' }).ok).toBe(false)
    expect(validateBullet({ status: 'done', facts, bullet: '无效告警下降约 99%。' }).ok).toBe(false)
  })

  it('进行中必须写明进行中，并且不能写成已上线', () => {
    expect(validateBullet({ status: 'active', facts, bullet: '灰度 30%，效果稳定。' }).ok).toBe(false)
    expect(validateBullet({ status: 'active', facts: '灰度 30%', bullet: '进行中，已上线。' }).ok).toBe(false)
    expect(validateBullet({ status: 'active', facts: '灰度 30%', bullet: '进行中，已完成 30% 灰度。' }).ok).toBe(true)
  })

  it('计划中只接受筹备说明', () => {
    expect(validateBullet({ status: 'planned', facts: '计划迁移', bullet: plannedBullet('K8s 迁移') }).ok).toBe(true)
    expect(validateBullet({ status: 'planned', facts: '计划迁移', bullet: '已完成迁移并节省 30% 成本。' }).ok).toBe(false)
  })
})
