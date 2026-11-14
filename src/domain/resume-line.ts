const TRAILING_PERIOD = /((?:19|20)\d{2}(?:[.\-/]\d{1,2})?)\s*[-–—~]\s*(至今|(?:19|20)\d{2}(?:[.\-/]\d{1,2})?)\s*$/

/** 抬头行末尾的起止时间拆到灰条右侧。也接受「名称 | 时间」。 */
export function splitResumeHeading(line: string): { name: string; period: string } {
  const pipe = line.indexOf('|')
  if (pipe >= 0) return { name: line.slice(0, pipe).trim(), period: line.slice(pipe + 1).trim() }
  const match = line.match(TRAILING_PERIOD)
  if (!match || match.index === undefined) return { name: line.trim(), period: '' }
  return { name: line.slice(0, match.index).trim(), period: `${match[1]} - ${match[2]}` }
}

/** 行首到第一个冒号是条目名，其余是正文。条目名交给纸面加粗，用户只写内容。 */
export function splitResumeLead(line: string): { lead: string; body: string } | null {
  const match = line.match(/^([^：:]{1,16})([：:])(.*)$/)
  if (!match) return null
  return { lead: `${match[1]}${match[2]}`, body: match[3] }
}
