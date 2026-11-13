import { Sidebar } from '@/components/shell/Sidebar'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {children}
    </div>
  )
}
