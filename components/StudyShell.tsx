'use client'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { CHEAT } from '@/lib/data'
import { Modal, TopBar, btn2, useGuard } from './ui'

export function StudyShell({ children }: { children: ReactNode }) {
  const { id, pid } = useParams<{ id: string; pid?: string }>()
  const user = useGuard()
  const app = useApp()
  const study = app.studies.find((s) => s.id === id)
  const [panel, setPanel] = useState(true)
  const [modal, setModal] = useState<'brief' | 'protocol' | null>(null)
  if (!user) return null
  if (!study)
    return (
      <div className="p-10">
        <TopBar />
        <p className="mt-6">Study not found. <Link href="/home" className="underline">Back to studies</Link></p>
      </div>
    )

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 bg-white border-r border-black flex flex-col overflow-auto">
          <Link href="/home" className="flex items-center gap-2 px-4 py-3 border-b border-black text-brand-900 font-semibold hover:bg-brand-50">
            <span className="text-xl leading-none">←</span> All studies
          </Link>
          <Link href={`/study/${study.id}`} className={`block px-4 py-3 border-b border-black hover:bg-brand-50 ${!pid ? 'bg-brand-100' : ''}`}>
            <div className="font-semibold text-brand-900">{study.name}</div>
            <div className="text-xs text-brand-700">{study.code}</div>
          </Link>

          {/* collapsible participants panel */}
          <div className="border-b border-black">
            <button onClick={() => setPanel(!panel)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brand-900 bg-brand-50 hover:bg-brand-100">
              <span>Participants ({study.participants.length})</span>
              <span>{panel ? '▾' : '▸'}</span>
            </button>
            {panel && (
              <div>
                {study.participants.map((p) => (
                  <Link
                    key={p.id} href={`/study/${study.id}/participant/${p.id}`}
                    className={`block px-4 py-2 text-sm border-t border-black/20 hover:bg-brand-50 ${pid === p.id ? 'bg-brand-900 text-white hover:bg-brand-900' : ''}`}
                  >
                    <div className="font-semibold break-words">{p.code} <span className="font-normal">({p.name})</span></div>
                    <div className={`text-[11px] ${pid === p.id ? 'text-brand-200' : 'text-brand-600'}`}>{p.status}</div>
                  </Link>
                ))}
                {study.participants.length === 0 && <div className="px-4 py-2 text-xs text-brand-600">No participants yet.</div>}
                <button onClick={() => app.addParticipant(study.id)} className="w-full text-left px-4 py-2 text-sm text-brand-700 border-t border-black/20 hover:bg-brand-50">
                  + Add participant
                </button>
              </div>
            )}
          </div>

          {/* study-level resources */}
          <div>
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 bg-brand-50">Study resources</div>
            <button onClick={() => setModal('brief')} className="w-full text-left px-4 py-2.5 text-sm border-t border-black/20 hover:bg-brand-50">Study Brief</button>
            <Link href={`/study/${study.id}/cheatsheet`} className="block px-4 py-2.5 text-sm border-t border-black/20 hover:bg-brand-50">Study cheat sheet ↗</Link>
            <button onClick={() => setModal('protocol')} className="w-full text-left px-4 py-2.5 text-sm border-t border-black/20 hover:bg-brand-50">Protocol ↗</button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-auto p-4">{children}</main>
      </div>

      {app.cheat && app.cheat.studyId === study.id && <FloatingCheat studyId={study.id} />}

      {modal === 'brief' && (
        <Modal title={`Study Brief · ${study.code}`} onClose={() => setModal(null)} footer={<button className={btn2} onClick={() => setModal(null)}>Close</button>}>
          <dl className="p-5 text-sm grid grid-cols-[130px_1fr] gap-y-2">
            <dt className="text-brand-600">NCT number</dt><dd>{study.code}</dd>
            <dt className="text-brand-600">Study code</dt><dd>{study.studyCode}</dd>
            <dt className="text-brand-600">Title</dt><dd>{study.title}</dd>
            <dt className="text-brand-600">Sponsor</dt><dd>{study.sponsor}</dd>
            <dt className="text-brand-600">Phase</dt><dd>{study.phase}</dd>
            <dt className="text-brand-600">Indication</dt><dd>{study.indication}</dd>
            <dt className="text-brand-600">Participants</dt><dd>{study.participants.length} enrolled / screened</dd>
            <dt className="text-brand-600">Visits</dt><dd>Screening, Day 0, Week 2, Week 4, Week 8</dd>
          </dl>
        </Modal>
      )}
      {modal === 'protocol' && (
        <Modal title="Protocol" onClose={() => setModal(null)} footer={<button className={btn2} onClick={() => setModal(null)}>Close</button>}>
          <div className="p-5 text-sm space-y-3">
            <div className="border border-black bg-brand-50 p-6 text-center">
              <div className="text-3xl text-brand-700">▤</div>
              <div className="font-semibold mt-1">{study.protocolFile}</div>
              <div className="text-xs text-brand-600">Placeholder · the uploaded protocol would open here</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* Small floating bar with a nav panel, so the cheat sheet stays available while working */
function FloatingCheat({ studyId }: { studyId: string }) {
  const { cheat, setCheat } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(true)
  if (!cheat) return null
  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-white border border-black shadow-2xl">
      <div className="bg-brand-900 text-white flex items-center justify-between px-3 py-1.5 text-sm">
        <span className="font-semibold">Cheat sheet <span className="text-[10px] bg-white text-brand-900 px-1 ml-1 font-normal">placeholder</span></span>
        <span className="flex gap-1">
          <button onClick={() => setOpen(!open)} className="px-1.5 hover:bg-brand-700" aria-label="Toggle panel">{open ? '–' : '▢'}</button>
          <button onClick={() => router.push(`/study/${studyId}/cheatsheet`)} className="px-1.5 hover:bg-brand-700" aria-label="Expand">↗</button>
          <button onClick={() => setCheat(null)} className="px-1.5 hover:bg-brand-700" aria-label="Close">×</button>
        </span>
      </div>
      {open && (
        <div className="flex max-h-64">
          <ul className="w-32 shrink-0 border-r border-black overflow-auto bg-brand-50">
            {CHEAT.map((c, i) => (
              <li key={c.t}>
                <button
                  onClick={() => setCheat({ studyId, section: i })}
                  className={`w-full text-left px-2 py-1.5 text-xs border-b border-black/20 ${cheat.section === i ? 'bg-brand-900 text-white' : 'hover:bg-brand-100'}`}
                >
                  {c.t}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-3 text-xs overflow-auto">
            <div className="font-semibold text-brand-900 mb-1">{CHEAT[cheat.section].t}</div>
            {CHEAT[cheat.section].b}
          </div>
        </div>
      )}
    </div>
  )
}
