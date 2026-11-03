'use client'
import { CATS, Cat, Ev } from '@/lib/data'
import { addDays, fmt, iso, monthGrid, sameDay, startOfWeek, today } from '@/lib/dates'

export type Slot = { id: string; time?: string; title: string; color: string; sub?: string; done?: boolean }
export type Mode = 'month' | 'week' | 'day'

const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`

export function HourSlots({ items, from = 7, to = 19 }: { items: Slot[]; from?: number; to?: number }) {
  const untimed = items.filter((i) => !i.time)
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const inHour = (h: number) =>
    items.filter((i) => {
      if (!i.time) return false
      const x = Math.min(to, Math.max(from, parseInt(i.time)))
      return x === h
    })
  return (
    <div>
      {untimed.length > 0 && (
        <div className="px-3 py-1.5 border-b border-black/20 bg-brand-50 text-xs space-y-1">
          <div className="text-brand-600 font-semibold uppercase tracking-wide">Anytime</div>
          {untimed.map((i) => <SlotChip key={i.id} i={i} />)}
        </div>
      )}
      {hours.map((h) => (
        <div key={h} className="flex border-b border-black/20 min-h-9">
          <div className="w-20 shrink-0 text-xs text-brand-600 px-2 py-1.5 border-r border-black/20 bg-brand-50">{hourLabel(h)}</div>
          <div className="flex-1 p-1 space-y-1">{inHour(h).map((i) => <SlotChip key={i.id} i={i} withTime />)}</div>
        </div>
      ))}
    </div>
  )
}

function SlotChip({ i, withTime }: { i: Slot; withTime?: boolean }) {
  return (
    <div
      className={`text-xs px-2 py-1 border-l-4 ${i.done ? 'line-through opacity-50' : ''}`}
      style={{ borderColor: i.color, background: i.color + '26' }}
    >
      <span className="font-semibold">{withTime && i.time ? `${i.time} – ` : ''}{i.title}</span>
      {i.sub && <span className="text-brand-600"> · {i.sub}</span>}
    </div>
  )
}

export function Key({ cats }: { cats?: Cat[] }) {
  const list = (cats ?? (Object.keys(CATS) as Cat[]))
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs px-3 py-2 border-t border-black bg-brand-50">
      <span className="font-semibold text-brand-700 uppercase tracking-wide">Key</span>
      {list.map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ background: CATS[c].color }} />
          {CATS[c].label}
        </span>
      ))}
    </div>
  )
}

export function Calendar({
  events, mode, anchor, onAnchor, selected, onSelect, onEvent, cellH = 'min-h-20', showKey = false,
}: {
  events: Ev[]; mode: Mode; anchor: Date; onAnchor: (d: Date) => void
  selected?: Date; onSelect?: (d: Date) => void; onEvent?: (e: Ev) => void; cellH?: string; showKey?: boolean
}) {
  const t = today()
  const byDate: Record<string, Ev[]> = {}
  events.forEach((e) => (byDate[e.date] ??= []).push(e))
  const step = (dir: number) => {
    if (mode === 'month') onAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    else onAnchor(addDays(anchor, dir * (mode === 'week' ? 7 : 1)))
  }
  const ws = startOfWeek(anchor)
  const title =
    mode === 'month' ? fmt(anchor, { month: 'long', year: 'numeric' })
    : mode === 'week' ? `${fmt(ws)} – ${fmt(addDays(ws, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
    : fmt(anchor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const chip = (e: Ev, showTime = false) => (
    <button
      key={e.id}
      onClick={(ev) => { ev.stopPropagation(); onEvent?.(e) }}
      className="block w-full text-left text-[11px] leading-tight truncate px-1 py-0.5 border-l-4 hover:brightness-95"
      style={{ borderColor: CATS[e.kind].color, background: CATS[e.kind].color + '26' }}
      title={e.title}
    >
      {showTime && e.time ? `${e.time} ` : ''}{e.short ?? e.title}
    </button>
  )

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black shrink-0">
        <div className="font-semibold text-brand-900">{title}</div>
        <div className="flex gap-1">
          <button className="border border-black px-2 text-sm hover:bg-brand-50" onClick={() => step(-1)} aria-label="Previous">‹</button>
          <button className="border border-black px-2 text-sm hover:bg-brand-50" onClick={() => onAnchor(today())}>Today</button>
          <button className="border border-black px-2 text-sm hover:bg-brand-50" onClick={() => step(1)} aria-label="Next">›</button>
        </div>
      </div>

      {mode === 'month' && (
        <div className="grid grid-cols-7 flex-1 grid-rows-[auto_repeat(6,minmax(0,1fr))]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-semibold text-brand-700 bg-brand-50 border-b border-r border-black/20 px-2 py-1">{d}</div>
          ))}
          {monthGrid(anchor).map((d) => {
            const list = byDate[iso(d)] ?? []
            const isT = sameDay(d, t)
            const isSel = selected && sameDay(d, selected)
            return (
              <div
                key={iso(d)}
                onClick={() => onSelect?.(d)}
                className={`border-b border-r border-black/20 p-1 cursor-pointer hover:bg-brand-50 ${cellH} ${d.getMonth() !== anchor.getMonth() ? 'bg-slate-50 text-slate-400' : ''} ${isSel ? 'outline outline-2 -outline-offset-2 outline-brand-900' : ''}`}
              >
                <div className={`text-xs mb-0.5 inline-block px-1 ${isT ? 'bg-brand-900 text-white font-semibold' : ''}`}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {list.slice(0, 2).map((e) => chip(e))}
                  {list.length > 2 && <div className="text-[10px] text-brand-600 px-1">+{list.length - 2} more</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mode === 'week' && (
        <div className="grid grid-cols-7 flex-1">
          {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => {
            const list = byDate[iso(d)] ?? []
            const isT = sameDay(d, t)
            return (
              <div key={iso(d)} className="border-r border-black/20 min-h-52 flex flex-col" onClick={() => onSelect?.(d)}>
                <div className={`px-2 py-1 text-xs border-b border-black/20 ${isT ? 'bg-brand-900 text-white font-semibold' : 'bg-brand-50 text-brand-700'}`}>
                  {fmt(d, { weekday: 'short' })} {d.getDate()}
                </div>
                <div className="p-1 space-y-1 flex-1">{list.map((e) => chip(e, true))}</div>
              </div>
            )
          })}
        </div>
      )}

      {mode === 'day' && (
        <div className="flex-1">
          <HourSlots
            items={(byDate[iso(anchor)] ?? []).map((e) => ({ id: e.id, time: e.time, title: e.title, color: CATS[e.kind].color }))}
          />
        </div>
      )}

      {showKey && <Key />}
    </div>
  )
}
