'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { CHEAT } from '@/lib/data'
import { useGuard } from '@/components/ui'

export default function CheatSheet() {
  const { id } = useParams<{ id: string }>()
  const user = useGuard()
  const app = useApp()
  const router = useRouter()
  const [sec, setSec] = useState(app.cheat?.section ?? 0)
  const study = app.studies.find((s) => s.id === id)
  if (!user || !study) return null

  const minimize = () => {
    app.setCheat({ studyId: id, section: sec })
    router.push(`/study/${id}`)
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="bg-brand-900 text-white h-12 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/study/${id}`)} className="text-2xl leading-none px-2 hover:bg-brand-700" aria-label="Back">←</button>
          <span className="font-semibold">{study.name} · Cheat sheet</span>
          <span className="text-xs bg-white text-brand-900 px-2 py-0.5 font-semibold tracking-wide">placeholder</span>
        </div>
        <button onClick={minimize} className="border border-white/70 px-3 py-1 text-sm hover:bg-white hover:text-brand-900">Minimize ▾</button>
      </header>
      <div className="flex flex-1 min-h-0">
        <nav className="w-64 border-r border-black bg-brand-50 overflow-auto">
          {CHEAT.map((c, i) => (
            <button key={c.t} onClick={() => setSec(i)} className={`w-full text-left px-4 py-3 text-sm border-b border-black/20 ${sec === i ? 'bg-brand-900 text-white' : 'hover:bg-brand-100'}`}>
              {c.t}
            </button>
          ))}
        </nav>
        <article className="flex-1 overflow-auto p-10 max-w-3xl">
          <h1 className="text-3xl font-semibold text-brand-900 mb-4">{CHEAT[sec].t}</h1>
          <p className="text-brand-800 leading-relaxed">{CHEAT[sec].b}</p>
          <div className="mt-6 border-2 border-dashed border-black p-8 text-center text-brand-600 text-sm">Placeholder content</div>
        </article>
      </div>
    </div>
  )
}
