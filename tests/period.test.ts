import { describe, expect, it } from 'vitest'
import { isOngoing, toMonthInput } from '@/domain/period'

describe('项目时间', () => {
  it('把年月文本转成月份选择器的值', () => {
    expect(toMonthInput('2026.06')).toBe('2026-06')
    expect(toMonthInput('2026-10')).toBe('2026-10')
    expect(toMonthInput('至今')).toBe('')
    expect(isOngoing('至今')).toBe(true)
  })
})