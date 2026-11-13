import { Suspense } from 'react'
import { ResumeWorkspace } from '@/components/resume/ResumeWorkspace'

export default function ResumePage() {
  return (
    <Suspense fallback={<main className="flex-1 p-6 text-[13px] text-[#7c8899]">正在读取简历…</main>}>
      <ResumeWorkspace />
    </Suspense>
  )
}
