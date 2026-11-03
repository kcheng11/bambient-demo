'use client'
import { useState } from 'react'
import { Participant, VISITS, visitTarget } from '@/lib/data'
import { addDays, diffDays, fmt, iso, monthGrid, sameDay, startOfWeek, today } from '@/lib/dates'
import { dayStatus, visitLabs } from '@/lib/labs'
import { useApp } from '@/lib/store'
import { HourSlots, Mode } from './Calendar'
import { Panel } from './ui'

const TARGET_BG = '#012169' // dark blue, fills the whole box
const WINDOW_BG = 'rgba(42, 92, 176, 0.22)' // lighter, less opaque blue across the allowed range

export function ParticipantCalendar({ p }: { p: Participant }) {
  const t = today()
  const app = useApp()
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(() => today())
  const [labsOn, setLabsOn] = useState(true)

  // lab-availability overlay for the next visit that still needs scheduling
  const focus = VISITS.find((v) => !p.done.includes(v.n))
  const labState = (d: Date) => {
    if (!labsOn || !focus) return null
    const x = diffDays(d, visitTarget(p, focus))
    if (x < -focus.minus || x > focus.plus) return null
    const booking = app.bookings.find((b) => b.pid === p.id && b.visit === focus.n && b.date === iso(d))
    if (booking) return { text: `Labs booked ${booking.stops[0]?.time ?? ''}`, kind: 'booked' as const }
    const s = dayStatus(visitLabs(focus.n), d)
    return { text: s === 'ok' ? 'Labs open' : s === 'partial' ? 'Labs partial' : 'Labs closed', kind: s }
  }

  const info = (d: Date) => {
    const targets = VISITS.filter((v) => diffDays(d, visitTarget(p, v)) === 0)
    const wins = VISITS.filter((v) => {
      const x = diffDays(d, visitTarget(p, v))
      return x !== 0 && x >= -v.minus && x <= v.plus
    })
    return { targets, wins }
  }

  const step = (dir: number) => {
    if (mode === 'month') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    else setAnchor(addDays(anchor, dir * (mode === 'week' ? 7 : 1)))
  }
  const ws = startOfWeek(anchor)
  const title =
    mode === 'month' ? fmt(anchor, { month: 'long', year: 'numeric' })
    : mode === 'week' ? `${fmt(ws)} – ${fmt(addDays(ws, 6))}`
    : fmt(anchor, { weekday: 'long', month: 'short', day: 'numeric' })

  const renderCell = (d: Date, o: { month?: boolean; dim?: boolean } = {}) => {
    const { targets, wins } = info(d)
    const isT = sameDay(d, t)
    const dark = targets.length > 0
    const light = !dark && wins.length > 0
    return (
      <div
        key={iso(d)}
        onClick={() => setAnchor(d)}
        className={`relative border-r border-b border-black/20 flex flex-col cursor-pointer ${o.month ? 'min-h-[76px]' : 'min-h-48'} ${o.dim && !dark && !light ? 'opacity-45' : ''}`}
        style={{ background: dark ? TARGET_BG : light ? WINDOW_BG : undefined, color: dark ? '#fff' : undefined }}
      >
        <div className="px-2 py-1 text-xs flex justify-between">
          <span className={isT ? 'font-bold' : ''}>{o.month ? d.getDate() : `${fmt(d, { weekday: 'short' })} ${d.getDate()}`}</span>
          {isT && <span className="text-[10px] uppercase tracking-wide font-semibold">Today</span>}
        </div>
        {isT && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none font-light ${o.month ? 'text-3xl' : 'text-6xl'} ${dark ? 'text-white' : 'text-brand-900'}`}>✕</div>
        )}
        <div className="px-1.5 pb-1 space-y-0.5 text-[11px] font-semibold">
          {targets.map((v) => <div key={v.n}>V{v.n} target{p.done.includes(v.n) ? ' ✓' : ''}</div>)}
          {wins.map((v) => <div key={v.n} className={dark ? 'text-white/80' : 'text-brand-900'}>V{v.n} window</div>)}
          {(() => {
            const ls = labState(d)
            if (!ls) return null
            const tone = dark
              ? 'border border-white/70 text-white'
              : ls.kind === 'closed' ? 'bg-gray-300 text-gray-700'
              : ls.kind === 'partial' ? 'border border-dashed border-black text-brand-900 bg-white/70'
              : 'bg-white text-brand-900 border border-black'
            return <div className={`inline-block px-1 mt-0.5 text-[10px] font-semibold ${tone}`}>{ls.kind === 'booked' ? '✓ ' : ''}{ls.text}</div>
          })()}
        </div>
      </div>
    )
  }

  const toggleBtn = (m: Mode) => (
    <button key={m} onClick={() => setMode(m)} className={`px-2 py-0.5 capitalize ${mode === m ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-brand-700'}`}>{m}</button>
  )
  const right = (
    <>
      {focus && (
        <button
          onClick={() => setLabsOn(!labsOn)}
          className={`border border-white/70 text-xs px-2 py-0.5 ${labsOn ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-brand-700'}`}
          title={`Show lab availability for ${focus.name}`}
        >
          Labs {labsOn ? 'on' : 'off'}
        </button>
      )}
      <div className="flex border border-white/70 text-xs">{(['month', 'week', 'day'] as Mode[]).map(toggleBtn)}</div>
      <div className="flex gap-1 text-xs">
        <button className="border border-white/70 px-2 hover:bg-white hover:text-brand-900" onClick={() => step(-1)} aria-label="Previous">‹</button>
        <button className="border border-white/70 px-2 hover:bg-white hover:text-brand-900" onClick={() => setAnchor(today())}>Today</button>
        <button className="border border-white/70 px-2 hover:bg-white hover:text-brand-900" onClick={() => step(1)} aria-label="Next">›</button>
      </div>
    </>
  )

  const dayItems = VISITS.filter((v) => diffDays(anchor, visitTarget(p, v)) === 0).map((v, i) => ({
    id: `d${v.n}`, time: `${String(9 + i).padStart(2, '0')}:00`, title: `${v.name} · ${v.label} (target date)`, color: TARGET_BG,
  }))

  return (
    <Panel title={`Visit calendar · ${title}`} right={right} className="h-full">
      <div className="min-h-full flex flex-col">
        {mode === 'month' && (
          <div className="grid grid-cols-7 flex-1 grid-rows-[auto_repeat(6,minmax(0,1fr))]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-xs font-semibold text-brand-700 bg-brand-50 border-b border-r border-black/20 px-2 py-1">{d}</div>
            ))}
            {monthGrid(anchor).map((d) => renderCell(d, { month: true, dim: d.getMonth() !== anchor.getMonth() }))}
          </div>
        )}
        {mode === 'week' && (
          <div className="grid grid-cols-7 flex-1">
            {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => renderCell(d))}
          </div>
        )}
        {mode === 'day' && (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-1">{renderCell(anchor)}</div>
            <HourSlots items={dayItems} />
          </div>
        )}

        {/* key + window list */}
        <div className="px-3 py-2 text-xs border-t border-black bg-brand-50 shrink-0">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="font-semibold text-brand-700 uppercase tracking-wide">Key</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 inline-block" style={{ background: TARGET_BG }} />Target date</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 inline-block border border-black/30" style={{ background: WINDOW_BG }} />Allowed scheduling window</span>
            <span className="flex items-center gap-1.5"><span className="text-base leading-none">✕</span>Today</span>
            <span>✓ visit completed</span>
            {labsOn && focus && <span className="text-brand-700">Lab tags are shown for {focus.name} (open / partial / closed)</span>}
          </div>
          <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-0.5">
            {VISITS.map((v) => {
              const tg = visitTarget(p, v)
              return (
                <div key={v.n}>
                  <b>{v.name}</b> · target {fmt(tg)}
                  {v.minus || v.plus ? ` · window ${fmt(addDays(tg, -v.minus))} – ${fmt(addDays(tg, v.plus))}` : ''}
                  {p.done.includes(v.n) ? ' ✓' : ''}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Panel>
  )
}
