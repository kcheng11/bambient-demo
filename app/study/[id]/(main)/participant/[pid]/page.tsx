'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useApp } from '@/lib/store'
import { VISITS, allQueries, plabel, visitTarget } from '@/lib/data'
import { fmt, iso, parse, today } from '@/lib/dates'
import { HeaderStrip } from '@/components/HeaderStrip'
import { ParticipantCalendar } from '@/components/ParticipantCalendar'
import { TodoBox } from '@/components/Todos'
import { SummaryModal } from '@/components/DataCapture'
import { Worksheet } from '@/components/Worksheet'
import { LabScheduler } from '@/components/LabScheduler'
import { Panel, QueryChips, btn2 } from '@/components/ui'

export default function ParticipantPage() {
  const { id, pid } = useParams<{ id: string; pid: string }>()
  const app = useApp()
  const [summary, setSummary] = useState(false)
  const study = app.studies.find((s) => s.id === id)
  const p = study?.participants.find((x) => x.id === pid)
  if (!study || !p) return <div className="p-6">Participant not found.</div>

  const open = allQueries(app.studies, id, app.values, app.manualQ, app.resolved).filter((q) => q.pid === pid && q.open)
  const next = VISITS.find((v) => !p.done.includes(v.n))
  const myTodos = app.todos.filter((t) => t.studyId === id && t.text.includes(p.code))

  return (
    <div className="space-y-4 max-w-[1400px]">
      <HeaderStrip study={study} pid={pid} />
      <h1 className="text-xl font-semibold text-brand-900">
        {plabel(p)} <span className="text-brand-600 font-normal text-base">· {study.name} · {p.status}</span>
      </h1>

      {/* calendar column stretches to match the To-Do + summary column, so there is no empty space under it */}
      <div className="grid gap-4 grid-cols-[minmax(0,1fr)_340px] items-stretch">
        <ParticipantCalendar p={p} />
        <div className="flex flex-col gap-4">
          <div className="h-64">
            <TodoBox
              title="To-Do" todos={myTodos}
              onAdd={(text) => app.addTodo({ studyId: id, text: `${p.code}: ${text}`, cat: 'admin', date: iso(today()) })}
            />
          </div>
          <Panel title="Patient summary" right={<button className="text-xs underline" onClick={() => setSummary(true)}>Full summary ↗</button>} className="flex-1">
            <dl className="p-3 text-sm grid grid-cols-[100px_1fr] gap-y-1.5">
              <dt className="text-brand-600">Enrolled</dt><dd>{fmt(parse(p.enroll), { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
              <dt className="text-brand-600">Completed</dt><dd>{p.done.length} of {VISITS.length} visits</dd>
              <dt className="text-brand-600">Next visit</dt>
              <dd>{next ? `${next.name} · ${fmt(visitTarget(p, next))}` : 'All complete'}</dd>
              <dt className="text-brand-600">Open queries</dt>
              <dd><QueryChips hard={open.filter((q) => q.hard).length} soft={open.filter((q) => !q.hard).length} /></dd>
              <dt className="text-brand-600">Amendment</dt>
              <dd>{p.amendmentAck ? 'v3.0 acknowledged' : <span className="font-bold text-brand-900">v3.0 pending</span>}</dd>
            </dl>
            <div className="px-3 pb-3"><button className={`${btn2} w-full`} onClick={() => setSummary(true)}>Open summary</button></div>
          </Panel>
        </div>
      </div>

      <LabScheduler study={study} p={p} />

      <Worksheet study={study} p={p} />
      {summary && <SummaryModal study={study} p={p} onClose={() => setSummary(false)} />}
    </div>
  )
}
