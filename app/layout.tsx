import './globals.css'
import type { Metadata } from 'next'
import { AppProvider } from '@/lib/store'

export const metadata: Metadata = {
  title: 'CRC Workflow Hub',
  description: 'Workflow hub for clinical research coordinators (demo)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
