const DEFAULT_BASE = 'https://api.deepseek.com'

export function chatCompletionsUrl(baseUrl: string | undefined): string {
  const raw = (baseUrl?.trim() || DEFAULT_BASE).replace(/\/+$/, '')
  if (raw.endsWith('/chat/completions')) return raw
  return `${raw}/chat/completions`
}

export function resolveModel(model: string | undefined): string {
  return model?.trim() || 'deepseek-chat'
}

export function modelSupportsJsonMode(model: string): boolean {
  return !model.includes('reasoner')
}
