import { describe, expect, it } from 'vitest'
import { splitResumeHeading, splitResumeLead } from '@/domain/resume-line'

describe('splitResumeLead', () => {
  it('splits a short label from the sentence', () => {
    expect(splitResumeLead('业务范围：负责可视化大屏')).toEqual({ lead: '业务范围：', body: '负责可视化大屏' })
  })

  it('leaves a sentence without a leading label intact', () => {
    expect(splitResumeLead('主导 12 个核心服务的告警治理')).toBeNull()
  })

  it('pulls a trailing period out of the heading', () => {
    expect(splitResumeHeading('南京普联通信技术有限公司 · 软件工程师（前端方向）2022.08 - 至今')).toEqual({
      name: '南京普联通信技术有限公司 · 软件工程师（前端方向）',
      period: '2022.08 - 至今',
    })
  })
})
