export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

export function fail(error: unknown): Response {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : '请求失败'
  const status = name === 'ConfirmRequired' ? 409 : 400
  return json({ error: message }, status)
}
