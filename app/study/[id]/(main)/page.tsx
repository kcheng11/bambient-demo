'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { VISITS, allQueries, buildEvents, plabel, visitTarget } from '@/lib/data'
import { fmt, iso, today } from '@/lib/dates'
import { Calendar, Mode } from '@/components/Calendar'
import { HeaderStrip } from '@/components/HeaderStrip'
import { TodoBox } from '@/components/Todos'
import { Panel, QueryChips } from '@/components/ui'

type Filter = 'all' | 'visit' | 'monitor' | 'query' | 'tasks'
const FILTERS: [Filter, string][] = [['all', 'All'], ['visit', 'Visits'], ['monitor', 'Monitoring'], ['query', 'Queries'], ['tasks', 'Tasks']]

export default function StudyPage() {
  const { id } = useParams<{ id: string }>()
  const app = useApp()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(() => today())
  const [filter, setFilter] = useState<Filter>('all')
  const study = app.studies.find((s) => s.id === id)
  const queries = useMemo(
    () => allQueries(app.studies, id, app.values, app.manualQ, app.resolved),
    [app.studies, id, app.values, app.manualQ, app.resolved],
  )
  const myTodos = app.todos.filter((t) => t.studyId === id)
  const events = useMemo(() => {
    if (!study) return []
    const all = buildEvents([study], myTodos, queries)
    if (filter === 'all') return all
    if (filter === 'tasks') return all.filter((e) => e.src === 'todo')
    if (filter === 'query') return all.filter((e) => e.kind === 'query' || e.kind === 'hard')
    return all.filter((e) => e.kind === filter)
  }, [study, myTodos, queries, filter])
  if (!study) return null

  const nextVisit = (pid: string) => {
    const p = study.participants.find((x) => x.id === pid)!
    const v = VISITS.find((x) => !p.done.includes(x.n))
    return v ? `${v.name} · ${fmt(visitTarget(p, v))}` : 'Complete'
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <HeaderStrip study={study} />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-xl font-semibold text-brand-900">
          {study.name} <span className="text-brand-600 font-normal text-base">· {study.code}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex border border-black">
            {FILTERS.map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 ${filter === k ? 'bg-brand-900 text-white' : 'bg-white text-brand-900 hover:bg-brand-50'}`}>{label}</button>
            ))}
          </div>
          <div className="flex border border-black">
            {(['month', 'week', 'day'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 capitalize ${mode === m ? 'bg-brand-900 text-white' : 'bg-white text-brand-900 hover:bg-brand-50'}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* calendar stretches to the full height of the row, no empty space beneath it */}
      <div className="grid gap-4 grid-cols-[minmax(0,1fr)_340px] h-[calc(100vh-15rem)] min-h-[540px]">
        <Panel title="Study calendar" className="h-full">
          <Calendar
            events={events} mode={mode} anchor={anchor} onAnchor={setAnchor} cellH="min-h-20" showKey
            onSelect={(d) => { setAnchor(d) }}
            onEvent={(e) => e.pid && router.push(`/study/${id}/participant/${e.pid}`)}
          />
        </Panel>
        <TodoBox
          title="Study tasks" todos={myTodos}
          onAdd={(text) => app.addTodo({ studyId: id, text, cat: 'admin', date: iso(today()) })}
        />
      </div>

      <Panel title="Participants">
        {study.participants.length === 0 ? (
          <div className="p-6 text-sm text-brand-600">
            No participants yet. Use <b>+ Add participant</b> in the left panel to create one from this protocol.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700">
                <th className="px-3 py-2">Participant</th><th className="px-3 py-2">Arm</th><th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Next visit</th><th className="px-3 py-2">Open queries</th>
              </tr>
            </thead>
            <tbody>
              {study.participants.map((p) => {
                const open = queries.filter((q) => q.pid === p.id && q.open)
                return (
                  <tr key={p.id} className="border-t border-black/20 hover:bg-brand-50">
                    <td className="px-3 py-2"><Link className="font-semibold text-brand-900 underline" href={`/study/${id}/participant/${p.id}`}>{plabel(p)}</Link></td>
                    <td className="px-3 py-2">{p.arm}</td>
                    <td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2">{nextVisit(p.id)}</td>
                    <td className="px-3 py-2"><QueryChips hard={open.filter((q) => q.hard).length} soft={open.filter((q) => !q.hard).length} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
