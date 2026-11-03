'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FIELDS, LogEntry, Participant, Study, VISITS, VISIT_DESC, VISIT_PROCS, allQueries, buildLog, flagOf, visitTarget, vkey } from '@/lib/data'
import { fmt, parse } from '@/lib/dates'
import { useApp } from '@/lib/store'
import { DataCaptureModal, SummaryModal } from './DataCapture'
import { Panel, btn, btn2, inputCls } from './ui'

type Tab = 'log' | 'visits' | 'screening' | 'queries' | 'documents'
const TABS: [Tab, string][] = [['log', 'All activity'], ['visits', 'Visits'], ['screening', 'Screening'], ['queries', 'Queries'], ['documents', 'Documents']]

const typeStyle = (l: LogEntry) =>
  l.type === 'query'
    ? l.hard ? 'bg-red-700 text-white' : 'bg-yellow-300 text-black'
    : { visit: 'bg-brand-900 text-white', screening: 'bg-brand-500 text-white', doc: 'bg-brand-300 text-brand-900', note: 'bg-brand-100 text-brand-900', query: '' }[l.type]

function HistoryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <div className="px-3 py-1.5 bg-brand-50 border-y border-black text-xs font-semibold uppercase tracking-wide text-brand-700">{title}</div>
      <ul className="p-3 text-sm list-disc pl-7 space-y-1">
        {items.length ? items.map((h) => <li key={h}>{h}</li>) : <li className="list-none -ml-4 text-brand-600">None recorded</li>}
      </ul>
    </>
  )
}

export function Worksheet({ study, p }: { study: Study; p: Participant }) {
  const app = useApp()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('log')
  const [vTab, setVTab] = useState<number | 'summary'>('summary')
  const [sub, setSub] = useState<'cheat' | 'data' | 'queries'>('cheat')
  const [dc, setDc] = useState<number | null>(null)
  const [summary, setSummary] = useState(false)
  const [note, setNote] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  const queries = allQueries(app.studies, study.id, app.values, app.manualQ, app.resolved).filter((q) => q.pid === p.id)
  const log = buildLog(study, p, app.values, queries, app.notes)
  const shown = log.filter((l) => (tab === 'log' ? true : tab === 'screening' ? l.type === 'screening' : tab === 'queries' ? l.type === 'query' : tab === 'documents' ? l.type === 'doc' : l.type === 'visit'))
  const v = typeof vTab === 'number' ? vTab : null
  const val = (n: number, k: string) => app.values[vkey(study.id, p.id, n, k)]

  return (
    <div className="grid grid-cols-[270px_minmax(0,1fr)] gap-4">
      {/* sidebar: patient info + medical history */}
      <Panel title="Patient info" className="self-start">
        <dl className="p-3 text-sm grid grid-cols-[80px_1fr] gap-y-1">
          <dt className="text-brand-600">Name</dt><dd className="font-semibold">{p.name}</dd>
          <dt className="text-brand-600">ID</dt><dd className="font-semibold break-all">{p.code}</dd>
          <dt className="text-brand-600">Age / sex</dt><dd>{p.age} / {p.sex}</dd>
          <dt className="text-brand-600">Arm</dt><dd>{p.arm}</dd>
          <dt className="text-brand-600">Enrolled</dt><dd>{fmt(parse(p.enroll), { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
          <dt className="text-brand-600">Site</dt><dd>{app.user?.site}</dd>
        </dl>
        <div className="px-3 py-2 bg-brand-900 text-white text-xs font-semibold uppercase tracking-wide">Medical history</div>
        <HistoryBlock title="Conditions" items={p.conditions} />
        <HistoryBlock title="Past diagnoses" items={p.pastDx} />
        <HistoryBlock title="Surgeries" items={p.surgeries} />
        <HistoryBlock title="Concomitant meds" items={p.meds} />
        <div className="p-3 border-t border-black"><button className={`${btn2} w-full`} onClick={() => setSummary(true)}>Open summary ↗</button></div>
      </Panel>

      {/* main worksheet */}
      <section className="bg-white border border-black min-w-0">
        <div className="flex border-b border-black bg-brand-50 overflow-x-auto">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm whitespace-nowrap border-r border-black ${tab === k ? 'bg-brand-900 text-white font-semibold' : 'text-brand-800 hover:bg-brand-100'}`}>{label}</button>
          ))}
          <button className="ml-auto px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-100 whitespace-nowrap" onClick={() => setSummary(true)}>Summary ↗</button>
        </div>

        {tab === 'visits' ? (
          <div>
            {/* participant record: Visit summary, Visit 0, Visit 1, ... */}
            <div className="flex border-b border-black overflow-x-auto">
              <button onClick={() => setVTab('summary')} className={`px-4 py-2 text-sm whitespace-nowrap border-r border-black ${vTab === 'summary' ? 'bg-brand-100 font-semibold text-brand-900 border-b-2 border-b-brand-900' : 'text-brand-700 hover:bg-brand-50'}`}>
                Visit summary
              </button>
              {VISITS.map((x) => (
                <button key={x.n} onClick={() => setVTab(x.n)} className={`px-4 py-2 text-sm whitespace-nowrap border-r border-black ${vTab === x.n ? 'bg-brand-100 font-semibold text-brand-900 border-b-2 border-b-brand-900' : 'text-brand-700 hover:bg-brand-50'}`}>
                  {x.name} {p.done.includes(x.n) && <span className="text-brand-500">✓</span>}
                </button>
              ))}
            </div>

            {vTab === 'summary' && (
              <div>
                <div className="px-4 py-2 bg-brand-50 border-b border-black text-xs font-semibold uppercase tracking-wide text-brand-700">Visit summary · all encounters</div>
                {VISITS.map((x) => {
                  const done = p.done.includes(x.n)
                  const hardN = FIELDS.filter((f) => flagOf(f, val(x.n, f.k)) === 'hard').length
                  const softN = FIELDS.filter((f) => flagOf(f, val(x.n, f.k)) === 'soft').length
                  return (
                    <div key={x.n} className="flex gap-4 px-4 py-3 border-b border-black/20 hover:bg-brand-50">
                      <div className="w-28 shrink-0 text-sm">
                        <div className="font-semibold">{fmt(visitTarget(p, x), { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className={`text-xs mt-0.5 inline-block px-1.5 py-0.5 ${done ? 'bg-brand-900 text-white' : 'border border-black text-brand-800'}`}>{done ? 'Completed' : 'Scheduled'}</div>
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="font-semibold text-brand-900">{x.name} · {x.label}</div>
                        <div className="text-xs text-brand-600">Research visit · Site CRC · Window {x.minus || x.plus ? `−${x.minus} / +${x.plus} days` : 'none (Day 0)'}</div>
                        <div className="mt-1">{VISIT_DESC[x.n]}</div>
                        {done ? (
                          <div className="mt-1.5 text-xs grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
                            <div><span className="text-brand-600">Vitals: </span>BP {val(x.n, 'sbp')}/{val(x.n, 'dbp')} mmHg · HR {val(x.n, 'hr')} · Temp {val(x.n, 'temp')} °C · Wt {val(x.n, 'wt')} kg</div>
                            <div><span className="text-brand-600">Labs: </span>ALT {val(x.n, 'alt')} · AST {val(x.n, 'ast')} · Creat {val(x.n, 'creat')} · HbA1c {val(x.n, 'hba1c')}</div>
                          </div>
                        ) : (
                          <div className="mt-1.5 text-xs text-brand-600">Not yet performed.</div>
                        )}
                        {(hardN > 0 || softN > 0) && (
                          <div className="mt-1.5 flex gap-1.5">
                            {hardN > 0 && <span className="bg-red-700 text-white text-xs font-semibold px-1.5">⚑ {hardN} hard query</span>}
                            {softN > 0 && <span className="bg-yellow-300 text-black text-xs font-semibold px-1.5">{softN} out of range</span>}
                          </div>
                        )}
                      </div>
                      <div className="self-center flex flex-col gap-1">
                        {done && <button className={`${btn2} !py-0.5 text-xs`} onClick={() => setDc(x.n)}>Open data ↗</button>}
                        <button className={`${btn2} !py-0.5 text-xs`} onClick={() => { setVTab(x.n); setSub('cheat') }}>Open visit</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {v !== null && (
              <>
                <div className="flex gap-1 p-2 border-b border-black/20 text-sm">
                  {([['cheat', 'Cheat sheet'], ['data', 'Data capture'], ['queries', 'Queries']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setSub(k)} className={`px-3 py-1 border ${sub === k ? 'bg-brand-900 text-white border-brand-900' : 'border-black text-brand-800 hover:bg-brand-50'}`}>{l}</button>
                  ))}
                </div>
                <div className="p-4 text-sm">
                  {sub === 'cheat' && (
                    <div>
                      <div className="font-semibold text-brand-900 mb-2">{VISITS[v].name} checklist · {VISITS[v].label}</div>
                      {VISIT_PROCS[v].map((s) => {
                        const k = `${v}|${s}`
                        return (
                          <label key={s} className="flex items-center gap-2 py-1.5 border-b border-black/20">
                            <input type="checkbox" className="accent-[#012169]" checked={checks[k] ?? p.done.includes(v)} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                            {s}
                          </label>
                        )
                      })}
                      <button className={`${btn2} mt-3`} onClick={() => { app.setCheat({ studyId: study.id, section: 3 }); router.push(`/study/${study.id}/cheatsheet`) }}>Open study cheat sheet ↗</button>
                    </div>
                  )}
                  {sub === 'data' && (
                    <div className="space-y-3">
                      {(() => {
                        const filled = FIELDS.filter((f) => val(v, f.k)).length
                        const hard = FIELDS.filter((f) => flagOf(f, val(v, f.k)) === 'hard').length
                        return (
                          <div>{filled} of {FIELDS.length} fields captured{hard > 0 && <span className="ml-2 bg-red-700 text-white px-1.5 py-0.5 text-xs font-semibold">⚑ {hard} hard query</span>}</div>
                        )
                      })()}
                      <button className={btn} onClick={() => setDc(v)}>Open data capture grid ↗</button>
                    </div>
                  )}
                  {sub === 'queries' && (
                    <div>
                      {queries.filter((q) => q.visit === v).length === 0 && <div className="text-brand-600">No queries for this visit.</div>}
                      {queries.filter((q) => q.visit === v).map((q) => (
                        <div key={q.id} className={`border border-black border-l-4 p-3 mb-2 ${q.hard ? 'border-l-red-600' : 'border-l-yellow-400'}`}>
                          <div className="flex justify-between">
                            <b><span className={`text-[10px] px-1 mr-1.5 ${q.hard ? 'bg-red-700 text-white' : 'bg-yellow-300 text-black'}`}>{q.hard ? 'HARD' : 'SOFT'}</span>{q.field}</b>
                            <span className="text-xs">{q.open ? 'OPEN' : 'RESOLVED'}</span>
                          </div>
                          <p className="text-xs mt-1">{q.text}</p>
                          {q.open && <button className={`${btn2} mt-2 !py-0.5 text-xs`} onClick={() => app.resolveQuery(q.id)}>Mark resolved</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            {tab === 'log' && (
              <form className="flex gap-2 p-3 border-b border-black/20" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { app.addNote(study.id, p.id, note.trim()); setNote('') } }}>
                <input className={inputCls} placeholder="Add a log entry…" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className={btn}>Add</button>
              </form>
            )}
            {shown.length === 0 && <div className="p-6 text-sm text-brand-600">No entries.</div>}
            {shown.map((l) => (
              <div key={l.id} className="flex gap-3 px-4 py-3 border-b border-black/20 hover:bg-brand-50">
                <div className="w-28 shrink-0 text-xs text-brand-700 pt-0.5">
                  <div>{fmt(parse(l.date), { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div className="font-semibold text-black tabular-nums">{l.time}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 font-semibold ${typeStyle(l)}`}>{l.type === 'query' ? (l.hard ? 'hard query' : 'soft query') : l.type}</span>
                    <span className="font-semibold text-sm">{l.title}</span>
                  </div>
                  {l.detail && <div className="text-xs text-brand-700 mt-0.5">{l.detail}</div>}
                  <div className="text-[11px] text-brand-500 mt-0.5">{l.by}</div>
                </div>
                {l.visit !== undefined && l.type !== 'query' && <button className={`${btn2} !py-0.5 text-xs self-center`} onClick={() => setDc(l.visit!)}>Open data ↗</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {dc !== null && <DataCaptureModal study={study} p={p} visit={dc} onClose={() => setDc(null)} />}
      {summary && <SummaryModal study={study} p={p} onClose={() => setSummary(false)} />}
    </div>
  )
}
