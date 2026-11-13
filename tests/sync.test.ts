import { describe, expect, it } from 'vitest'
import { isIntervalDue, shouldQueueOnStatusChange } from '@/domain/sync'

describe('shouldQueueOnStatusChange', () => {
  it('拖入已完成且事实新于上次同步时产生提案', () => {
    expect(shouldQueueOnStatusChange({
      nextStatus: 'done',
      factsUpdatedAt: '2026-11-10T00:00:00.000Z',
      masterSyncedAt: '2026-11-01T00:00:00.000Z',
    })).toBe(true)
  })

  it('事实没有更新，或目标不是已完成时不产生提案', () => {
    expect(shouldQueueOnStatusChange({
      nextStatus: 'done',
      factsUpdatedAt: '2026-11-01T00:00:00.000Z',
      masterSyncedAt: '2026-11-10T00:00:00.000Z',
    })).toBe(false)
    expect(shouldQueueOnStatusChange({
      nextStatus: 'planned',
      factsUpdatedAt: '2026-11-10T00:00:00.000Z',
      masterSyncedAt: null,
    })).toBe(false)
    expect(shouldQueueOnStatusChange({
      nextStatus: 'active',
      factsUpdatedAt: '2026-11-10T00:00:00.000Z',
      masterSyncedAt: null,
    })).toBe(false)
  })
})

describe('isIntervalDue', () => {
  it('从未同步或超过间隔时到期，未超过间隔时不到期', () => {
    expect(isIntervalDue({
      now: '2026-11-13T00:00:00.000Z',
      lastMasterSyncAt: null,
      intervalDays: 7,
    })).toBe(true)
    expect(isIntervalDue({
      now: '2026-11-13T00:00:00.000Z',
      lastMasterSyncAt: '2026-11-01T00:00:00.000Z',
      intervalDays: 7,
    })).toBe(true)
    expect(isIntervalDue({
      now: '2026-11-13T00:00:00.000Z',
      lastMasterSyncAt: '2026-11-10T00:00:00.000Z',
      intervalDays: 7,
    })).toBe(false)
  })
})
