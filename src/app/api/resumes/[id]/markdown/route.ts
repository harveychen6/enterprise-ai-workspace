import { renderMarkdown } from '@/server/resumes'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const markdown = renderMarkdown(id)
  if (!markdown) return new Response('简历不存在', { status: 404 })
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="resume.md"',
    },
  })
}
