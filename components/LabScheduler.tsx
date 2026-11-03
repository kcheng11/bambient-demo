'use client'
import { useState } from 'react'
import { Participant, Study, VISITS, VisitDef, visitTarget } from '@/lib/data'
import { addDays, diffDays, fmt, iso, sameDay, today } from '@/lib/dates'
import { Lab, dayRange, dayStatus, endTime, labAvail, overlaps, suggestItinerary, visitLabs } from '@/lib/labs'
import { useApp } from '@/lib/store'
import { Modal, Panel, btn, btn2 } from './ui'

function AvailCell({ lab, d }: { lab: Lab; d: Date }) {
  const a = labAvail(lab, d)
  if (a.status === 'closed')
    return <div className="bg-gray-200 text-gray-600 px-2 py-1.5 text-xs h-full">{a.reason}</div>
  const range = `${a.slots[0]}–${a.slots[a.slots.length - 1]}`
  return a.status === 'open' ? (
    <div className="bg-brand-100 text-brand-900 px-2 py-1.5 text-xs h-full">
      <div className="font-semibold">✓ {a.slots.length} slots</div>
      <div className="text-brand-700">{range}</div>
    </div>
  ) : (
    <div className="bg-white border border-dashed border-black text-brand-900 px-2 py-1.5 text-xs h-full">
      <div className="font-semibold">Limited · {a.slots.length}</div>
      <div className="text-brand-700">{a.slots.join(', ')}</div>
    </div>
  )
}

export function LabScheduler({ study, p }: { study: Study; p: Participant }) {
  const app = useApp()
  const next = VISITS.find((v) => !p.done.includes(v.n))
  const [vn, setVn] = useState(next?.n ?? 4)
  const [book, setBook] = useState<Date | null>(null)
  const v = VISITS[vn]
  const done = p.done.includes(vn)
  const labs = visitLabs(vn)
  const target = visitTarget(p, v)
  const start = addDays(target, -v.minus - 2)
  const span = v.minus + v.plus + 5
  const t = today()

  const rows = Array.from({ length: span }, (_, i) => addDays(start, i)).map((d) => {
    const off = diffDays(d, target)
    return { d, off, inWin: off >= -v.minus && off <= v.plus, it: suggestItinerary(labs, d), st: dayStatus(labs, d) }
  })
  const rec = rows
    .filter((r) => r.inWin && r.st === 'ok')
    .sort((a, b) => Math.abs(a.off) - Math.abs(b.off) || a.off - b.off)[0]
  const booking = app.bookings.find((b) => b.studyId === study.id && b.pid === p.id && b.visit === vn)
  const labName = (id: string) => labs.find((l) => l.id === id)?.short ?? id

  return (
    <Panel title="Lab availability & scheduling">
      {/* visit selector */}
      <div className="flex border-b border-black overflow-x-auto bg-brand-50">
        {VISITS.map((x) => (
          <button
            key={x.n} onClick={() => setVn(x.n)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-r border-black ${vn === x.n ? 'bg-brand-900 text-white font-semibold' : 'text-brand-800 hover:bg-brand-100'}`}
          >
            {x.name} · {x.label} {p.done.includes(x.n) && '✓'}
          </button>
        ))}
      </div>

      {done ? (
        <div className="p-6 text-sm text-brand-700">{v.name} is already completed for this participant. Pick a later visit to plan lab timing.</div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 text-sm">
            <div>
              <div className="font-semibold text-brand-900">
                {v.name} · target {fmt(target, { weekday: 'short', month: 'short', day: 'numeric' })}
                {(v.minus || v.plus) ? ` · window ${fmt(addDays(target, -v.minus))} – ${fmt(addDays(target, v.plus))}` : ' · fixed date (no window)'}
              </div>
              <div className="text-xs text-brand-700 mt-1 flex flex-wrap gap-1.5 items-center">
                Needs:
                {labs.map((l) => <span key={l.id} className="border border-black px-1.5 bg-white">{l.short}</span>)}
              </div>
            </div>
            {booking && (
              <div className="border border-black bg-brand-50 px-3 py-2 text-xs">
                <b className="text-brand-900">✓ Booked {fmt(new Date(booking.date + 'T00:00:00'), { weekday: 'short', month: 'short', day: 'numeric' })}</b>
                <div className="text-brand-700">{booking.stops.map((s) => `${labName(s.labId)} ${s.time}`).join(' · ')}</div>
              </div>
            )}
          </div>

          {/* recommendation */}
          <div className="border-2 border-brand-900 bg-brand-50 p-3 flex flex-wrap items-center justify-between gap-3">
            {rec ? (
              <>
                <div className="text-sm">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-brand-700">Recommended day</div>
                  <div className="font-semibold text-brand-900">
                    {fmt(rec.d, { weekday: 'long', month: 'short', day: 'numeric' })}
                    <span className="font-normal text-brand-700"> · {rec.off === 0 ? 'target day' : `${Math.abs(rec.off)} day${Math.abs(rec.off) > 1 ? 's' : ''} ${rec.off < 0 ? 'before' : 'after'} target`}</span>
                  </div>
                  <div className="text-xs text-brand-800 mt-0.5">
                    {rec.it.stops.map((s) => `${s.lab.short} ${s.time}`).join('  →  ')}
                  </div>
                </div>
                <button className={btn} onClick={() => setBook(rec.d)}>Schedule this day</button>
              </>
            ) : (
              <div className="text-sm text-brand-900">
                <b>No single day in the window</b> has every required lab open in sequence. Check the table for partial days, or ask the lab to open extra slots.
              </div>
            )}
          </div>

          {/* availability table */}
          <div className="border border-black overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-brand-900 text-white text-left">
                  <th className="px-3 py-2 w-40 border-r border-white/30">Date</th>
                  {labs.map((l) => (
                    <th key={l.id} className="px-3 py-2 border-r border-white/30 align-top">
                      <div>{l.name}</div>
                      <div className="text-[11px] font-normal text-brand-200">{dayRange(l.days)} · {l.open}–{l.close}</div>
                      <div className="text-[11px] font-normal text-brand-200">Results: {l.turnaround}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 w-44">Can complete all labs?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const booked = booking && booking.date === iso(r.d)
                  return (
                    <tr key={iso(r.d)} className={`border-t border-black/20 ${r.off === 0 ? 'bg-brand-50' : ''} ${!r.inWin ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2 border-r border-black/20 align-top">
                        <div className="font-semibold">{fmt(r.d, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {r.off === 0 && <span className="text-[10px] bg-brand-900 text-white px-1">TARGET</span>}
                          {sameDay(r.d, t) && <span className="text-[10px] border border-black px-1">TODAY</span>}
                          {!r.inWin && <span className="text-[10px] text-brand-600">outside window</span>}
                        </div>
                      </td>
                      {r.d < t ? (
                        <td colSpan={labs.length} className="px-3 py-2 text-xs text-brand-600 border-r border-black/20">Past</td>
                      ) : (
                        labs.map((l) => (
                          <td key={l.id} className="p-0 border-r border-black/20 align-top h-px"><AvailCell lab={l} d={r.d} /></td>
                        ))
                      )}
                      <td className="px-3 py-2 align-top text-xs">
                        {booked ? (
                          <b className="text-brand-900">✓ Booked</b>
                        ) : r.st === 'ok' ? (
                          <div>
                            <div className="font-semibold text-brand-900">Yes · {r.it.stops[0]?.time}–{endTime(r.it.stops[r.it.stops.length - 1].lab, r.it.stops[r.it.stops.length - 1].time)}</div>
                            {r.inWin ? (
                              <button className={`${btn2} !py-0.5 text-xs mt-1`} onClick={() => setBook(r.d)}>{booking ? 'Move here' : 'Schedule'}</button>
                            ) : (
                              <div className="text-brand-600 mt-0.5">Outside the visit window</div>
                            )}
                          </div>
                        ) : r.st === 'partial' ? (
                          <div className="text-brand-800">Partly · missing {r.it.missing.map((l) => l.short).join(', ')}</div>
                        ) : (
                          <div className="text-gray-600">No</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-brand-700 items-center">
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-brand-100 border border-black/30 inline-block" />Open</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-white border border-dashed border-black inline-block" />Limited (2 or fewer slots)</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-gray-200 inline-block" />Closed / unavailable</span>
            <span>The plan runs labs in order (fasting draw first) with 15 minutes between stops.</span>
          </div>
          <ul className="text-xs text-brand-700 list-disc pl-5">
            {labs.map((l) => <li key={l.id}><b>{l.short}</b> · {l.location} · {l.note}</li>)}
          </ul>
        </div>
      )}

      {book && <ScheduleModal study={study} p={p} v={v} date={book} labs={labs} onClose={() => setBook(null)} />}
    </Panel>
  )
}

function ScheduleModal({ study, p, v, date, labs, onClose }: { study: Study; p: Participant; v: VisitDef; date: Date; labs: Lab[]; onClose: () => void }) {
  const app = useApp()
  const plan = suggestItinerary(labs, date)
  const [times, setTimes] = useState<Record<string, string>>(Object.fromEntries(plan.stops.map((s) => [s.lab.id, s.time])))
  const stops = labs
    .filter((l) => times[l.id])
    .map((l) => ({ lab: l, time: times[l.id] }))
    .sort((a, b) => a.time.localeCompare(b.time))
  const clashes = stops.some((a, i) => stops.some((b, j) => j > i && overlaps(a, b)))

  const confirm = () => {
    app.book(
      { studyId: study.id, pid: p.id, visit: v.n, date: iso(date), stops: stops.map((s) => ({ labId: s.lab.id, time: s.time })) },
      `${p.code}: ${v.name} lab visit · ${stops.map((s) => `${s.lab.short} ${s.time}`).join(', ')}`,
    )
    onClose()
  }

  return (
    <Modal
      title={`Schedule ${v.name} labs · ${fmt(date, { weekday: 'long', month: 'short', day: 'numeric' })}`}
      onClose={onClose}
      footer={
        <>
          <button className={btn2} onClick={onClose}>Cancel</button>
          <button className={btn} onClick={confirm} disabled={clashes}>Confirm schedule</button>
        </>
      }
    >
      <div className="p-5 text-sm space-y-3">
        <p className="text-brand-700">Pick a time for each lab. Only open slots are listed. Confirming adds a task to the participant’s To-Do and marks the day on the calendar.</p>
        <div className="border border-black">
          {labs.map((l) => {
            const slots = labAvail(l, date).slots
            return (
              <div key={l.id} className="flex items-center gap-3 px-3 py-2 border-b border-black/20 last:border-b-0">
                <div className="flex-1">
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-brand-600">{l.location}</div>
                </div>
                <select
                  className="border border-black px-2 py-1 text-sm bg-white"
                  value={times[l.id] ?? ''}
                  onChange={(e) => setTimes({ ...times, [l.id]: e.target.value })}
                >
                  {slots.map((s) => <option key={s} value={s}>{s} – {endTime(l, s)}</option>)}
                </select>
              </div>
            )
          })}
        </div>
        {clashes && <div className="text-xs font-bold text-brand-900 border border-black px-2 py-1.5 bg-brand-50">Two of these times overlap. Move one so the participant can get between labs.</div>}
      </div>
    </Modal>
  )
}
