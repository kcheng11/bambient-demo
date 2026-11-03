'use client'
import { useState } from 'react'
import { CATS, Todo } from '@/lib/data'
import { fmt, iso, parse, today } from '@/lib/dates'
import { useApp } from '@/lib/store'
import { HourSlots } from './Calendar'
import { Panel, inputCls, btn } from './ui'

export function TodoBox({
  todos, studyName, onAdd, title = 'To-Do',
}: { todos: Todo[]; studyName?: (id: string) => string; onAdd?: (text: string) => void; title?: string }) {
  const { toggleTodo } = useApp()
  const [view, setView] = useState<'list' | 'daily'>('list')
  const [text, setText] = useState('')
  const t = iso(today())
  const sorted = [...todos].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  const toggle = (
    <div className="flex border border-white/70 text-xs">
      {(['list', 'daily'] as const).map((v) => (
        <button key={v} onClick={() => setView(v)} className={`px-2 py-0.5 ${view === v ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-brand-700'}`}>
          {v === 'list' ? 'List' : 'Daily'}
        </button>
      ))}
    </div>
  )

  return (
    <Panel title={title} right={toggle} className="h-full">
      {view === 'list' ? (
        <div>
          {sorted.length === 0 && <div className="p-4 text-sm text-brand-600">No tasks yet.</div>}
          {sorted.map((x) => {
            const overdue = !x.done && x.date < t
            return (
              <label key={x.id} className="flex items-start gap-2 px-3 py-2 border-b border-black/20 hover:bg-brand-50 cursor-pointer" style={{ borderLeft: `4px solid ${CATS[x.cat].color}` }}>
                <input type="checkbox" checked={x.done} onChange={() => toggleTodo(x.id)} className="mt-1 accent-[#012169]" />
                <div className={`flex-1 text-sm ${x.done ? 'line-through opacity-50' : ''}`}>
                  <div>{x.text}</div>
                  <div className="text-[11px] text-brand-700 flex gap-x-3 gap-y-0.5 flex-wrap items-center">
                    <span className={overdue ? 'font-bold text-black' : ''}>
                      {overdue ? 'Overdue · ' : ''}{x.date === t ? 'Today' : fmt(parse(x.date))}{x.time ? ` · ${x.time}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 inline-block" style={{ background: CATS[x.cat].color }} />{CATS[x.cat].label}
                    </span>
                    {studyName && <span>{studyName(x.studyId)}</span>}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      ) : (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border-b border-black/20">
            {fmt(today(), { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <HourSlots
            items={todos.filter((x) => x.date === t).map((x) => ({
              id: x.id, time: x.time, title: x.text, color: CATS[x.cat].color, done: x.done, sub: studyName?.(x.studyId),
            }))}
          />
        </div>
      )}
      {onAdd && (
        <form
          className="flex gap-2 p-2 border-t border-black sticky bottom-0 bg-white"
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText('') } }}
        >
          <input className={inputCls} placeholder="Add a task…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className={btn}>Add</button>
        </form>
      )}
    </Panel>
  )
}
