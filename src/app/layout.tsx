import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CareerDesk',
  description: '个人职业与项目工作台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
