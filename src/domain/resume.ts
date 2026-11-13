export function withBulletOverride<T extends { resumeBullet: string }>(project: T, override: string): {
  project: T
  override: string
} {
  return { project, override }
}

export function paperBullet(resumeBullet: string, override: string): string {
  return override.trim() ? override : resumeBullet
}
