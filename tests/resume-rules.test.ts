import { describe, expect, it } from 'vitest'
import { paperBullet, withBulletOverride } from '@/domain/resume'

describe('投递版覆盖', () => {
  it('有覆盖句时纸面用覆盖句，不改项目简历句', () => {
    const project = { resumeBullet: '母版句子' }
    const next = withBulletOverride(project, '投递版句子')
    expect(next.project.resumeBullet).toBe('母版句子')
    expect(next.override).toBe('投递版句子')
    expect(paperBullet(project.resumeBullet, next.override)).toBe('投递版句子')
    expect(paperBullet(project.resumeBullet, '')).toBe('母版句子')
  })
})
