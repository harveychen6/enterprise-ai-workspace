export interface ReasonInput {
  projectId: string
  title: string
  facts: string
}

export interface BulletInput {
  title: string
  status: 'planned' | 'active' | 'done'
  facts: string
  current?: string
}

export interface AiClient {
  extractKeywords(jd: string): Promise<string[]>
  writeReasons(keywords: string[], projects: ReasonInput[]): Promise<{ projectId: string; reason: string }[]>
  refineBullet(input: BulletInput): Promise<string>
}
