'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Study, allQueries } from '@/lib/data'
import { useApp } from '@/lib/store'
import { Badge, Modal, btn, btn2 } from './ui'

export function HeaderStrip({ study, pid }: { study: Study; pid?: string }) {
  const app = useApp()
  const router = useRouter()
  const [open, setOpen] = useState<null | 'updates' | 'queries'>(null)
  const [amend, setAmend] = useState(false)
  const p = pid ? study.participants.find((x) => x.id === pid) : undefined
  const qs = allQueries(app.studies, study.id, app.values, app.manualQ, app.resolved).filter((q) => q.open && (!pid || q.pid === pid))
  const hardN = qs.filter((q) => q.hard).length
  const updates = study.updates

  const tab = (k: 'updates' | 'queries', label: string, badge: React.ReactNode) => (
    <button
      onClick={() => setOpen(open === k ? null : k)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-r border-black ${open === k ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-brand-50'}`}
    >
      {label} {badge}
    </button>
  )

  return (
    <div className="relative">
      <div className="bg-white border border-black flex items-stretch">
        {tab('updates', 'Updates', <Badge n={updates.length} tone="info" />)}
        {tab('queries', 'Queries', (
          <span className="inline-flex gap-1">
            <Badge n={hardN} tone="hard" />
            <Badge n={qs.length - hardN} tone="soft" />
          </span>
        ))}
        {p && (
          <button
            onClick={() => setAmend(true)}
            className={`ml-auto flex items-center gap-2 px-4 text-sm font-semibold ${p.amendmentAck ? 'text-brand-600 hover:bg-brand-50' : 'bg-brand-900 text-white hover:bg-brand-700'}`}
          >
            <span>⚑</span>
            {p.amendmentAck ? 'Protocol amendment 3.0 · acknowledged' : 'Protocol amendment 3.0 · action required'}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 left-0 top-full w-[30rem] max-w-full bg-white border border-black shadow-xl">
          {open === 'updates' ? (
            <ul>
              {updates.map((u) => (
                <li key={u} className="px-4 py-2.5 text-sm border-b border-black/20">{u}</li>
              ))}
            </ul>
          ) : qs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-brand-600">No open queries.</div>
          ) : (
            <ul>
              {qs.map((q) => {
                const part = study.participants.find((x) => x.id === q.pid)
                return (
                  <li key={q.id}>
                    <button
                      className={`w-full text-left px-4 py-2.5 border-b border-black/20 hover:bg-brand-50 border-l-4 ${q.hard ? 'border-l-red-600' : 'border-l-yellow-400'}`}
                      onClick={() => { setOpen(null); router.push(`/study/${study.id}/participant/${q.pid}`) }}
                    >
                      <div className="text-sm font-semibold">
                        <span className={`text-[10px] px-1 mr-1.5 ${q.hard ? 'bg-red-700 text-white' : 'bg-yellow-300 text-black'}`}>{q.hard ? 'HARD' : 'SOFT'}</span>
                        {part?.code} · Visit {q.visit} · {q.field}
                      </div>
                      <div className="text-xs text-brand-700 line-clamp-2">{q.text}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {amend && p && (
        <Modal
          title="Protocol Amendment 3.0"
          onClose={() => setAmend(false)}
          footer={
            p.amendmentAck ? (
              <button className={btn2} onClick={() => setAmend(false)}>Close</button>
            ) : (
              <>
                <button className={btn2} onClick={() => setAmend(false)}>Later</button>
                <button className={btn} onClick={() => { app.ackAmend(study.id, p.id); setAmend(false) }}>Mark re-consent complete</button>
              </>
            )
          }
        >
          <div className="p-5 text-sm space-y-2">
            <p><b>{p.code} ({p.name})</b> must be re-consented on the updated ICF before the next study procedure.</p>
            <ul className="list-disc pl-5 text-brand-800">
              <li>Updated AE reporting timelines</li>
              <li>Additional safety lab at Visit 3</li>
              <li>Revised visit windows for Visit 4</li>
            </ul>
            <p className="text-brand-600 text-xs">Status: {p.amendmentAck ? 'Acknowledged and re-consent completed.' : 'Pending.'}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
