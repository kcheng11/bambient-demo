'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { CATS, buildEvents } from '@/lib/data'
import { fmt, iso, today } from '@/lib/dates'
import { Calendar, HourSlots, Key, Mode } from '@/components/Calendar'
import { TodoBox } from '@/components/Todos'
import { AddStudyModal } from '@/components/AddStudy'
import { Modal, Panel, TopBar, useGuard } from '@/components/ui'

export default function Home() {
  const user = useGuard()
  const app = useApp()
  const router = useRouter()
  const [anchor, setAnchor] = useState(() => today())
  const [sel, setSel] = useState(() => today())
  const [adding, setAdding] = useState(false)
  const [help, setHelp] = useState(false)
  const events = useMemo(() => buildEvents(app.studies, app.todos), [app.studies, app.todos])
  const studyName = (id: string) => app.studies.find((s) => s.id === id)?.name ?? ''
  if (!user) return null

  const dayItems = events
    .filter((e) => e.date === iso(sel))
    .map((e) => ({ id: e.id, time: e.time, title: e.title, color: CATS[e.kind].color, sub: studyName(e.studyId) }))

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {/* left sidebar */}
        <aside className="w-64 shrink-0 bg-white border-r border-black flex flex-col">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-3 px-4 py-5 border-b border-black text-brand-900 font-semibold hover:bg-brand-50 text-left"
          >
            <span className="w-7 h-7 border-2 border-brand-900 flex items-center justify-center text-xl leading-none">+</span>
            add study
          </button>
          <nav className="flex-1 overflow-auto">
            {app.studies.map((s) => (
              <Link key={s.id} href={`/study/${s.id}`} className="block px-4 py-4 border-b border-black hover:bg-brand-50">
                <div className="font-semibold text-brand-900">{s.name}</div>
                <div className="text-xs text-brand-700">{s.code} · {s.participants.length} participants</div>
              </Link>
            ))}
          </nav>
        </aside>

        {/* main panel */}
        <main className="flex-1 min-w-0 overflow-auto p-4 grid gap-4 grid-cols-[minmax(0,1fr)_380px] grid-rows-[auto_minmax(280px,1fr)]">
          <Panel
            title="Calendar · all studies"
            right={
              <button onClick={() => setHelp(true)} aria-label="Help" className="w-6 h-6 border border-white/70 text-sm hover:bg-white hover:text-brand-900">?</button>
            }
            className="col-start-1"
          >
            <Calendar
              events={events} mode={'month' as Mode} anchor={anchor} onAnchor={setAnchor}
              selected={sel} onSelect={setSel} cellH="h-[88px]" showKey
              onEvent={(e) => e.pid && router.push(`/study/${e.studyId}/participant/${e.pid}`)}
            />
          </Panel>

          <div className="col-start-2 row-span-2 row-start-1 min-h-0">
            <TodoBox todos={app.todos} studyName={studyName} />
          </div>

          <Panel title={`Schedule · ${fmt(sel, { weekday: 'long', month: 'short', day: 'numeric' })}`} className="col-start-1">
            {dayItems.length === 0 && <div className="px-3 py-2 text-xs text-brand-600 border-b border-black/20">Nothing scheduled for this day.</div>}
            <HourSlots items={dayItems} />
          </Panel>
        </main>
      </div>

      {adding && <AddStudyModal onClose={() => setAdding(false)} />}
      {help && (
        <Modal title="How to use the calendar" onClose={() => setHelp(false)}>
          <div className="p-5 text-sm space-y-3">
            <p>The calendar combines every study you coordinate. Click a day to see its hourly schedule below the calendar; click a participant visit to jump to that participant.</p>
            <ul className="list-disc pl-5 space-y-1 text-brand-800">
              <li>Visit dates are calculated from each participant’s enrollment date and the visit schedule.</li>
              <li>Tasks in the To-Do list appear on their due date, color-coded by type.</li>
              <li><b className="text-red-700">Red</b> marks hard queries (extreme values) and <b className="bg-yellow-300 px-1">yellow</b> marks soft queries.</li>
              <li>Switch the To-Do list to <b>Daily</b> to see today’s tasks by hour.</li>
            </ul>
            <Key />
          </div>
        </Modal>
      )}
    </div>
  )
}
