'use client'
import { ReactNode } from 'react'
import { StudyShell } from '@/components/StudyShell'

export default function StudyLayout({ children }: { children: ReactNode }) {
  return <StudyShell>{children}</StudyShell>
}
