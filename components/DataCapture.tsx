'use client'
import { useEffect, useState } from 'react'
import {
  FIELDS, LAB_FIELDS, Participant, RNote, Study, TRANSCRIPT, VISITS, allQueries, flagOf, hardText, plabel, recordingNotes, refText, visitTarget, vkey,
} from '@/lib/data'
import { fmt } from '@/lib/dates'
import { useApp } from '@/lib/store'
import { Modal, QueryChips, btn, btn2 } from './ui'

// hard = red, soft = yellow
const FLAG_BG = { hard: 'bg-red-100', soft: 'bg-yellow-100', ok: 'bg-white', empty: 'bg-white' }
const TAG_STYLE: Record<RNote['tag'], string> = {
  'Protocol deviation': 'bg-black text-white',
  Discrepancy: 'bg-red-700 text-white',
  'Participant-reported': 'bg-brand-100 text-brand-900 border border-black',
  Observation: 'bg-brand-100 text-brand-900 border border-black',
}

function Cell({ value, flag, onCommit }: { value: string; flag: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`w-full h-full px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-brand-900 ${FLAG_BG[flag as keyof typeof FLAG_BG]} ${flag === 'hard' ? 'font-semibold text-red-800' : ''}`}
    />
  )
}

export function DataCaptureModal({ study, p, visit, onClose }: { study: Study; p: Participant; visit: number; onClose: () => void }) {
  const app = useApp()
  const [sheet, setSheet] = useState<number | 'labs'>(visit)
  const [side, setSide] = useState<'queries' | 'audit' | 'transcript'>('queries')
  const [playing, setPlaying] = useState(false)
  const [draft, setDraft] = useState('')
  const vIdx = typeof sheet === 'number' ? sheet : visit
  const val = (v: number, f: string) => app.values[vkey(study.id, p.id, v, f)] ?? ''
  const queries = allQueries(app.studies, study.id, app.values, app.manualQ, app.resolved).filter((q) => q.pid === p.id && q.visit === vIdx)
  const hardCount = FIELDS.filter((f) => flagOf(f, val(vIdx, f.k)) === 'hard').length
  const softCount = FIELDS.filter((f) => flagOf(f, val(vIdx, f.k)) === 'soft').length
  const trail = app.audit.filter((a) => a.pid === p.id && a.studyId === study.id && a.visit === vIdx)
  const approved = trail[0]?.kind === 'approve'
  const openHard = queries.some((q) => q.hard && q.open)
  const recNotes = recordingNotes(vIdx, p.done.includes(vIdx), app.values, study.id, p.id)
  const crcNotes = app.visitNotes.filter((n) => n.studyId === study.id && n.pid === p.id && n.visit === vIdx)

  let row = 0
  let lastGroup = ''

  return (
    <Modal
      size="xl"
      onClose={onClose}
      title={<span>Data capture · {plabel(p)} · {VISITS[vIdx].name} <span className="font-normal opacity-80">({VISITS[vIdx].label})</span></span>}
    >
      <div className="flex flex-col h-[80vh]">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-black bg-brand-50 text-sm">
          <button onClick={() => setSide('transcript')} className="bg-brand-900 text-white px-3 py-1 hover:bg-brand-700">▶ Recording / transcript</button>
          <span className="text-brand-700">Target date: <b>{fmt(visitTarget(p, VISITS[vIdx]), { month: 'short', day: 'numeric', year: 'numeric' })}</b></span>
          <span className="ml-auto flex items-center gap-2">
            {hardCount > 0 && <span className="bg-red-700 text-white px-2 py-0.5 font-semibold">⚑ {hardCount} hard {hardCount === 1 ? 'query' : 'queries'}</span>}
            {softCount > 0 && <span className="bg-yellow-300 text-black px-2 py-0.5 font-semibold">{softCount} out of range</span>}
            {hardCount + softCount === 0 && <span className="text-brand-600">No flags</span>}
          </span>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* grid / sheet + notes */}
          <div className="flex-1 min-w-0 overflow-auto bg-white">
            {sheet === 'labs' ? (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-brand-100 text-brand-800">
                    <th className="border border-black w-9" />
                    <th className="border border-black px-2 py-1 text-left">Lab</th>
                    {VISITS.map((v) => <th key={v.n} className="border border-black px-2 py-1">{v.name}</th>)}
                    <th className="border border-black px-2 py-1">Assumed range</th>
                  </tr>
                </thead>
                <tbody>
                  {LAB_FIELDS.map((f, i) => (
                    <tr key={f.k}>
                      <td className="border border-black bg-brand-100 text-center text-xs text-brand-700">{i + 1}</td>
                      <td className="border border-black px-2 py-1.5 font-semibold">{f.label} <span className="text-brand-600 font-normal">({f.unit})</span></td>
                      {VISITS.map((v) => {
                        const x = val(v.n, f.k)
                        const fl = flagOf(f, x)
                        return (
                          <td key={v.n} onClick={() => setSheet(v.n)} className={`border border-black px-2 py-1.5 text-center cursor-pointer hover:outline hover:outline-2 hover:outline-brand-900 ${FLAG_BG[fl]} ${fl === 'hard' ? 'font-semibold text-red-800' : ''}`}>
                            {x || '—'}{fl === 'hard' ? ' ⚑' : ''}
                          </td>
                        )
                      })}
                      <td className="border border-black px-2 py-1.5 text-center text-brand-700">{refText(f)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-brand-100 text-brand-800 text-center">
                      <th className="border border-black w-9" />
                      {['A', 'B', 'C', 'D', 'E'].map((c) => <th key={c} className="border border-black py-0.5 text-xs font-semibold">{c}</th>)}
                    </tr>
                    <tr className="bg-brand-900 text-white">
                      <th className="border border-black bg-brand-100" />
                      <th className="border border-black px-2 py-1.5 text-left">Field</th>
                      <th className="border border-black px-2 py-1.5 text-left w-36">Value</th>
                      <th className="border border-black px-2 py-1.5 text-left w-20">Unit</th>
                      <th className="border border-black px-2 py-1.5 text-left w-56">Assumed range</th>
                      <th className="border border-black px-2 py-1.5 text-left w-36">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELDS.map((f) => {
                      const out = []
                      if (f.group !== lastGroup) {
                        lastGroup = f.group
                        out.push(
                          <tr key={`g-${f.group}`}>
                            <td className="border border-black bg-brand-100" />
                            <td colSpan={5} className="border border-black bg-brand-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">{f.group}</td>
                          </tr>,
                        )
                      }
                      row += 1
                      const x = val(vIdx, f.k)
                      const fl = flagOf(f, x)
                      out.push(
                        <tr key={f.k}>
                          <td className="border border-black bg-brand-100 text-center text-xs text-brand-700">{row}</td>
                          <td className="border border-black px-2 py-1.5">{f.label}</td>
                          <td className="border border-black p-0">
                            <Cell value={x} flag={fl} onCommit={(nv) => app.setValue(study.id, p.id, vIdx, f.k, f.label, nv)} />
                          </td>
                          <td className="border border-black px-2 py-1.5 text-brand-700">{f.unit}</td>
                          <td className="border border-black px-2 py-1.5 text-brand-700 text-xs">
                            {refText(f)}
                            {hardText(f) !== '—' && <span className="text-brand-500"> · hard flag outside {hardText(f)}</span>}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-xs">
                            {fl === 'hard' && <span className="bg-red-700 text-white px-1.5 py-0.5 font-semibold">⚑ HARD QUERY</span>}
                            {fl === 'soft' && <span className="bg-yellow-300 text-black px-1.5 py-0.5 font-semibold">Out of range</span>}
                            {fl === 'ok' && <span className="text-brand-500">✓</span>}
                          </td>
                        </tr>,
                      )
                      return out
                    })}
                  </tbody>
                </table>

                {/* additional notes: things from the recording that do not fit in the grid */}
                <section className="border-t border-black mt-4">
                  <div className="bg-brand-900 text-white px-3 py-1.5 text-sm font-semibold">Additional notes · from recording and CRC</div>
                  <div className="px-3 py-1.5 text-xs bg-brand-50 border-b border-black/20 text-brand-700">
                    Items captured from the visit recording that do not fit in the grid, such as protocol deviations.
                  </div>
                  {recNotes.length === 0 && (
                    <div className="px-3 py-3 text-sm text-brand-600 border-b border-black/20">
                      {p.done.includes(vIdx) ? 'Nothing extra was picked up from the recording.' : 'No recording yet for this visit.'}
                    </div>
                  )}
                  {recNotes.map((n, i) => (
                    <div key={i} className="flex gap-3 px-3 py-2 border-b border-black/20 text-sm">
                      <span className="text-xs text-brand-600 w-10 shrink-0 pt-0.5">{n.t}</span>
                      <span className={`text-[10px] uppercase font-semibold px-1.5 h-fit py-0.5 shrink-0 ${TAG_STYLE[n.tag]}`}>{n.tag}</span>
                      <span className="flex-1">{n.text}</span>
                    </div>
                  ))}

                  <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">CRC notes</div>
                  {crcNotes.map((n) => (
                    <div key={n.id} className="flex gap-3 px-3 py-2 border-t border-black/20 text-sm">
                      <span className="text-xs text-brand-600 w-28 shrink-0 pt-0.5">{n.time}</span>
                      <span className="flex-1">{n.text}</span>
                      <span className="text-xs text-brand-600">{n.by}</span>
                    </div>
                  ))}
                  <form
                    className="p-3 flex gap-2 items-start border-t border-black/20"
                    onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { app.addVisitNote(study.id, p.id, vIdx, draft.trim()); setDraft('') } }}
                  >
                    <textarea
                      value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
                      placeholder="Add a note (e.g. deviation details, follow-up needed)…"
                      className="flex-1 border border-black px-2 py-1.5 text-sm outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900"
                    />
                    <button className={btn}>Save note</button>
                  </form>
                </section>
              </>
            )}
          </div>

          {/* supporting features */}
          <aside className="w-80 shrink-0 border-l border-black flex flex-col">
            <div className="flex border-b border-black text-sm">
              {([['queries', 'Queries'], ['audit', 'Audit trail'], ['transcript', 'Transcript']] as const).map(([s, label]) => (
                <button key={s} onClick={() => setSide(s)} className={`flex-1 px-2 py-2 ${side === s ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100'}`}>{label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto text-sm">
              {side === 'queries' && (
                <div>
                  {queries.length === 0 && <div className="p-4 text-brand-600">No queries for this visit.</div>}
                  {queries.map((q) => (
                    <div key={q.id} className={`p-3 border-b border-black/20 border-l-4 ${q.hard ? 'border-l-red-600' : 'border-l-yellow-400'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <b className={q.hard ? 'text-red-700' : 'text-black'}>
                          <span className={`text-[10px] px-1 mr-1.5 ${q.hard ? 'bg-red-700 text-white' : 'bg-yellow-300 text-black'}`}>{q.hard ? 'HARD' : 'SOFT'}</span>
                          {q.field}
                        </b>
                        <span className={`text-[10px] px-1 ${q.open ? (q.hard ? 'bg-red-100' : 'bg-yellow-200') : 'bg-brand-100'}`}>{q.open ? 'OPEN' : 'RESOLVED'}</span>
                      </div>
                      <p className="text-xs text-brand-800 mt-1">{q.text}</p>
                      {q.open && <button className={`${btn2} mt-2 !py-0.5 text-xs`} onClick={() => app.resolveQuery(q.id)}>Mark resolved</button>}
                    </div>
                  ))}
                </div>
              )}
              {side === 'audit' && (
                <div>
                  <div className="p-3 border-b border-black bg-brand-50">
                    <div className="text-xs text-brand-700 mb-2">
                      {approved ? `Approved by ${trail[0].by} · ${trail[0].time}` : 'Data values for this visit are not yet approved.'}
                    </div>
                    <button
                      className={`${btn} w-full`}
                      disabled={approved || openHard}
                      onClick={() => app.approveVisit(study.id, p.id, vIdx)}
                    >
                      {approved ? '✓ All data values approved' : 'Approve all data values'}
                    </button>
                    {openHard && !approved && <div className="text-xs text-red-700 mt-1.5">Resolve the open hard queries before approving.</div>}
                    {approved && <div className="text-[11px] text-brand-600 mt-1.5">Any later edit will require approving again.</div>}
                  </div>
                  {trail.length === 0 && <div className="p-4 text-brand-600">No audit entries yet. Edits and approvals for this visit appear here.</div>}
                  {trail.map((a) => (
                    <div key={a.id} className="p-3 border-b border-black/20 text-xs">
                      {a.kind === 'approve' ? (
                        <div><b className="text-brand-900">✓ Approved all data values</b></div>
                      ) : (
                        <div><b>{a.field}</b>: <span className="line-through text-brand-600">{a.old || 'blank'}</span> → <b>{a.next || 'blank'}</b></div>
                      )}
                      <div className="text-brand-600">{a.by} · {a.time}</div>
                    </div>
                  ))}
                </div>
              )}
              {side === 'transcript' && (
                <div>
                  <div className="p-3 border-b border-black bg-brand-50">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPlaying(!playing)} className="w-8 h-8 bg-brand-900 text-white">{playing ? '❚❚' : '▶'}</button>
                      <div className="flex-1">
                        <div className="h-1.5 bg-brand-200"><div className={`h-full bg-brand-900 ${playing ? 'w-1/3' : 'w-0'}`} /></div>
                        <div className="text-[10px] text-brand-600 mt-1">Visit recording · 14:22 (placeholder)</div>
                      </div>
                    </div>
                  </div>
                  {TRANSCRIPT.map((l) => (
                    <div key={l.t} className="px-3 py-2 border-b border-black/20 text-xs">
                      <span className="text-brand-500 mr-1">{l.t}</span><b>{l.who}:</b> {l.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* sheet tabs, Excel style */}
        <div className="flex items-end border-t border-black bg-brand-100 overflow-x-auto shrink-0">
          {VISITS.map((v) => (
            <button
              key={v.n} onClick={() => setSheet(v.n)}
              className={`px-4 py-2 text-sm border-r border-black whitespace-nowrap ${sheet === v.n ? 'bg-white font-semibold text-brand-900 border-t-2 border-t-brand-900 -mt-px' : 'text-brand-700 hover:bg-brand-50'}`}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={() => setSheet('labs')}
            className={`px-4 py-2 text-sm border-r border-black whitespace-nowrap ${sheet === 'labs' ? 'bg-white font-semibold text-brand-900 border-t-2 border-t-brand-900 -mt-px' : 'text-brand-700 hover:bg-brand-50'}`}
          >
            Lab results
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function SummaryModal({ study, p, onClose }: { study: Study; p: Participant; onClose: () => void }) {
  const app = useApp()
  const qs = allQueries(app.studies, study.id, app.values, app.manualQ, app.resolved).filter((q) => q.pid === p.id && q.open)
  return (
    <Modal title={`Participant summary · ${plabel(p)}`} size="lg" onClose={onClose} footer={<button className={btn2} onClick={onClose}>Close</button>}>
      <div className="p-5 space-y-4 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Age / sex', `${p.age} / ${p.sex}`], ['Arm', p.arm], ['Status', p.status]].map(([k, v]) => (
            <div key={k} className="border border-black p-2"><div className="text-[11px] uppercase text-brand-600">{k}</div><div className="font-semibold">{v}</div></div>
          ))}
          <div className="border border-black p-2"><div className="text-[11px] uppercase text-brand-600">Open queries</div><QueryChips hard={qs.filter((q) => q.hard).length} soft={qs.filter((q) => !q.hard).length} /></div>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-brand-900 text-white text-left text-xs uppercase">
              <th className="px-2 py-1.5">Visit</th><th className="px-2 py-1.5">Target</th><th className="px-2 py-1.5">Window</th>
              <th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5">SBP / DBP</th><th className="px-2 py-1.5">ALT</th>
            </tr>
          </thead>
          <tbody>
            {VISITS.map((v) => {
              const tg = visitTarget(p, v)
              const done = p.done.includes(v.n)
              return (
                <tr key={v.n} className="border-b border-black/20">
                  <td className="px-2 py-1.5 font-semibold">{v.name} <span className="font-normal text-brand-600">{v.label}</span></td>
                  <td className="px-2 py-1.5">{fmt(tg, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-2 py-1.5">{v.minus || v.plus ? `−${v.minus} / +${v.plus} d` : '—'}</td>
                  <td className="px-2 py-1.5">{done ? <span className="text-brand-900 font-semibold">Complete</span> : 'Scheduled'}</td>
                  <td className="px-2 py-1.5">{done ? `${app.values[vkey(study.id, p.id, v.n, 'sbp')]} / ${app.values[vkey(study.id, p.id, v.n, 'dbp')]}` : '—'}</td>
                  <td className="px-2 py-1.5">{done ? app.values[vkey(study.id, p.id, v.n, 'alt')] : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
