export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T
  if (!response.ok) throw new Error((body as { error?: string }).error || '请求失败')
  return body
}

export function notifyChanged() {
  window.dispatchEvent(new Event('careerdesk:changed'))
}

export function statusLabel(status: string): string {
  if (status === 'active') return '进行中'
  if (status === 'done') return '已完成'
  return '计划中'
}

export function toneClass(score: number): string {
  if (score >= 80) return 'text-[#0d8a6c] bg-[#e8f7f2]'
  if (score >= 65) return 'text-[#b98217] bg-[#fff8e8]'
  return 'text-[#8b98ab] bg-[#f4f6f9]'
}
