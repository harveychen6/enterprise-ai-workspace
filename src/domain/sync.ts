import type { ProjectStatus } from '@/domain/score'

const DAY_MS = 24 * 60 * 60 * 1000

export function shouldQueueOnStatusChange(input: {
  nextStatus: ProjectStatus
  factsUpdatedAt: string | null
  masterSyncedAt: string | null
}): boolean {
  if (input.nextStatus !== 'done' || !input.factsUpdatedAt) return false
  if (!input.masterSyncedAt) return true
  return input.factsUpdatedAt > input.masterSyncedAt
}

export function isIntervalDue(input: {
  now: string
  lastMasterSyncAt: string | null
  intervalDays: number
}): boolean {
  if (!input.lastMasterSyncAt) return true
  const elapsed = Date.parse(input.now) - Date.parse(input.lastMasterSyncAt)
  return elapsed >= input.intervalDays * DAY_MS
}
