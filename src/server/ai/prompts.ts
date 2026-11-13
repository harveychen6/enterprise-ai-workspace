export const SYSTEM_PROMPT = '仅基于提供的事实和证据进行提炼，严禁编造未提及的数据，严禁将「计划中」的事项描述为已达成的结果。只输出 JSON。'

export function refineUserPrompt(input: { title: string; status: string; facts: string }): string {
  return `项目：${input.title}\n状态：${input.status}\n事实：\n${input.facts}\n\n请输出 {"bullet":"..."}。进行中必须包含「进行中」。计划中只能说明尚未执行。`
}

export function keywordUserPrompt(jd: string): string {
  return `从下面的 JD 提取 3 到 5 个技能或业务关键词，去掉套话。输出 {"keywords":["..."]}。\n\n${jd}`
}

export function reasonUserPrompt(input: { keywords: string[]; projects: { id: string; title: string; facts: string }[] }): string {
  return `关键词：${input.keywords.join('、')}\n项目：\n${input.projects.map((item) => `${item.id} ${item.title}\n${item.facts}`).join('\n\n')}\n\n为每个项目写一句匹配原因，并引用事实原句。输出 {"reasons":[{"projectId":"...","reason":"..."}]}。`
}

export function proposeUserPrompt(input: { title: string; status: string; facts: string; current: string }): string {
  return `项目：${input.title}\n状态：${input.status}\n当前母版：${input.current}\n最新事实：\n${input.facts}\n\n输出 {"bullet":"..."}。`
}
