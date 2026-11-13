import { createFakeAi } from '@/server/ai/fake'
import { createOpenAiClient } from '@/server/ai/openai'
import type { AiClient } from '@/server/ai/types'

export function aiConfigured(): boolean {
  return process.env.AI_PROVIDER === 'fake' || Boolean(process.env.OPENAI_API_KEY)
}

export function getAiClient(): AiClient | null {
  if (process.env.AI_PROVIDER === 'fake') return createFakeAi()
  if (process.env.OPENAI_API_KEY) return createOpenAiClient()
  return null
}
