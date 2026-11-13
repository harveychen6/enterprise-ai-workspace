import { describe, expect, it } from 'vitest'
import { chatCompletionsUrl, modelSupportsJsonMode, resolveModel } from '@/server/ai/endpoint'

describe('模型地址', () => {
  it('默认请求 DeepSeek 的 chat completions', () => {
    expect(chatCompletionsUrl(undefined)).toBe('https://api.deepseek.com/chat/completions')
    expect(chatCompletionsUrl('https://api.deepseek.com/')).toBe('https://api.deepseek.com/chat/completions')
    expect(chatCompletionsUrl('https://api.deepseek.com/v1')).toBe('https://api.deepseek.com/v1/chat/completions')
  })

  it('已经带路径时不重复拼接', () => {
    expect(chatCompletionsUrl('https://api.deepseek.com/chat/completions')).toBe('https://api.deepseek.com/chat/completions')
  })

  it('默认模型是 deepseek-chat，推理模型不强制 JSON 模式', () => {
    expect(resolveModel(undefined)).toBe('deepseek-chat')
    expect(resolveModel(' deepseek-chat ')).toBe('deepseek-chat')
    expect(modelSupportsJsonMode('deepseek-chat')).toBe(true)
    expect(modelSupportsJsonMode('deepseek-reasoner')).toBe(false)
  })
})
