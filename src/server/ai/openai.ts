import { chatCompletionsUrl, modelSupportsJsonMode, resolveModel } from '@/server/ai/endpoint'
import { keywordUserPrompt, proposeUserPrompt, refineUserPrompt, reasonUserPrompt, SYSTEM_PROMPT } from '@/server/ai/prompts'
import type { AiClient, BulletInput, ReasonInput } from '@/server/ai/types'

async function complete(user: string): Promise<string> {
  const model = resolveModel(process.env.OPENAI_MODEL)
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: user },
    ],
  }
  if (modelSupportsJsonMode(model)) {
    body.temperature = 0.2
    body.response_format = { type: 'json_object' }
  }
  const response = await fetch(chatCompletionsUrl(process.env.OPENAI_BASE_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.text()
    let message = ''
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } }
      message = parsed.error?.message ?? ''
    } catch {
      message = detail.slice(0, 180)
    }
    throw new Error(message ? `模型请求失败（${response.status}）：${message}` : `模型请求失败（${response.status}）`)
  }
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('模型没有返回内容')
  return content
}

function readJson(content: string): Record<string, unknown> {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('模型没有返回 JSON')
  return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>
}

export function createOpenAiClient(): AiClient {
  return {
    async extractKeywords(jd: string) {
      const json = readJson(await complete(keywordUserPrompt(jd)))
      const keywords = Array.isArray(json.keywords) ? json.keywords.filter((item): item is string => typeof item === 'string') : []
      return keywords.map((item) => item.trim()).filter(Boolean).slice(0, 5)
    },
    async writeReasons(keywords: string[], projects: ReasonInput[]) {
      const json = readJson(await complete(reasonUserPrompt({ keywords, projects: projects.map((item) => ({ id: item.projectId, title: item.title, facts: item.facts })) })))
      const reasons = Array.isArray(json.reasons) ? json.reasons : []
      return reasons.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const row = item as { projectId?: unknown; reason?: unknown }
        if (typeof row.projectId !== 'string' || typeof row.reason !== 'string') return []
        return [{ projectId: row.projectId, reason: row.reason }]
      })
    },
    async refineBullet(input: BulletInput) {
      const prompt = input.current === undefined ? refineUserPrompt(input) : proposeUserPrompt({ ...input, current: input.current })
      const json = readJson(await complete(prompt))
      if (typeof json.bullet !== 'string' || !json.bullet.trim()) throw new Error('模型没有返回简历句')
      return json.bullet.trim()
    },
  }
}
