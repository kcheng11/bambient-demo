'use client'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { addDays, iso, today } from './dates'
import { Audit, LogNote, Query, Study, Todo, VisitNote, seed, vkey } from './data'
import { Booking } from './labs'

type User = { name: string; site: string }
type Cheat = { studyId: string; section: number } | null

const hm = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
const stamp = () => `${iso(today())} ${hm()}`

const NAMES = ['Evelyn Brooks', 'Marcus Reed', 'Sofia Alvarez', 'James Nakamura', 'Priya Raman', 'Oliver Grant']

interface Ctx {
  user: User | null
  login: (u: User) => void
  logout: () => void
  studies: Study[]
  addStudy: (fileName: string | null) => string
  addParticipant: (sid: string) => void
  ackAmend: (sid: string, pid: string) => void
  todos: Todo[]
  toggleTodo: (id: string) => void
  addTodo: (t: Omit<Todo, 'id' | 'done'>) => void
  values: Record<string, string>
  setValue: (sid: string, pid: string, visit: number, field: string, label: string, val: string) => void
  manualQ: Query[]
  resolved: Record<string, boolean>
  resolveQuery: (id: string) => void
  notes: LogNote[]
  addNote: (sid: string, pid: string, title: string) => void
  visitNotes: VisitNote[]
  addVisitNote: (sid: string, pid: string, visit: number, text: string) => void
  audit: Audit[]
  bookings: Booking[]
  book: (b: Omit<Booking, 'id' | 'todoId'>, todoText: string) => void
  approveVisit: (sid: string, pid: string, visit: number) => void
  cheat: Cheat
  setCheat: (c: Cheat) => void
}

const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready ? <Inner>{children}</Inner> : null
}

function Inner({ children }: { children: ReactNode }) {
  const [init] = useState(() => seed())
  const [user, setUser] = useState<User | null>(null)
  const [studies, setStudies] = useState<Study[]>(init.studies)
  const [todos, setTodos] = useState<Todo[]>(init.todos)
  const [values, setValues] = useState<Record<string, string>>(init.values)
  const [manualQ] = useState<Query[]>(init.manualQ)
  const [resolved, setResolved] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<LogNote[]>(init.notes)
  const [visitNotes, setVisitNotes] = useState<VisitNote[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [cheat, setCheat] = useState<Cheat>(null)
  const [bookings, setBookings] = useState<Booking[]>([])

  const value: Ctx = {
    user,
    login: setUser,
    logout: () => { setUser(null); setCheat(null) },
    studies,
    addStudy: (fileName) => {
      const n = studies.length + 1
      const id = `s${Date.now()}`
      const base = fileName ? fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ') : 'Sample protocol'
      const code = `NCT${Math.floor(10000000 + Math.random() * 89999999)}`
      setStudies((s) => [
        ...s,
        {
          id, name: `Study ${n}`, code, studyCode: `PR-${String(100 + n)}`, title: `Protocol: ${base}`, sponsor: 'Sponsor (from protocol)', phase: 'Phase —',
          indication: 'Extracted from protocol', protocolFile: fileName ?? `${code}_Protocol.pdf`,
          participants: [], monitorVisits: [], updates: ['Study created from uploaded protocol'],
        },
      ])
      return id
    },
    addParticipant: (sid) =>
      setStudies((all) =>
        all.map((s) => {
          if (s.id !== sid) return s
          const n = s.participants.length + 1
          return {
            ...s,
            participants: [
              ...s.participants,
              {
                id: `p${n}`, code: `${s.studyCode}-${String(n).padStart(3, '0')}`, name: NAMES[(n - 1) % NAMES.length],
                age: 50 + n, sex: n % 2 ? 'F' : 'M', arm: n % 2 ? 'Arm A' : 'Arm B',
                enroll: iso(addDays(today(), 14)), status: 'Pre-screening', amendmentAck: true, done: [],
                conditions: ['To be collected at screening'], pastDx: ['To be collected at screening'],
                surgeries: ['To be collected at screening'], meds: ['To be collected at screening'],
              },
            ],
          }
        }),
      ),
    ackAmend: (sid, pid) =>
      setStudies((all) =>
        all.map((s) =>
          s.id !== sid ? s : { ...s, participants: s.participants.map((p) => (p.id === pid ? { ...p, amendmentAck: true } : p)) },
        ),
      ),
    todos,
    toggleTodo: (id) => setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x))),
    addTodo: (t) => setTodos((all) => [...all, { ...t, id: `t${Date.now()}`, done: false }]),
    values,
    setValue: (sid, pid, visit, field, label, val) => {
      const key = vkey(sid, pid, visit, field)
      const old = values[key] ?? ''
      if (old === val) return
      setValues((v) => ({ ...v, [key]: val }))
      setAudit((a) => [
        { id: `a${Date.now()}${Math.random()}`, studyId: sid, pid, visit, field: label, old, next: val, time: stamp(), by: 'You', kind: 'edit' },
        ...a,
      ])
    },
    manualQ,
    resolved,
    resolveQuery: (id) => setResolved((r) => ({ ...r, [id]: true })),
    notes,
    addNote: (sid, pid, title) =>
      setNotes((n) => [...n, { id: `n${Date.now()}`, studyId: sid, pid, date: iso(today()), time: hm(), title, by: 'You' }]),
    visitNotes,
    addVisitNote: (sid, pid, visit, text) =>
      setVisitNotes((n) => [...n, { id: `vn${Date.now()}`, studyId: sid, pid, visit, text, time: stamp(), by: 'CRC' }]),
    audit,
    bookings,
    book: (b, todoText) => {
      // one booking per visit: rebooking replaces the old booking and its task
      const todoId = `tb${Date.now()}`
      const old = bookings.find((x) => x.studyId === b.studyId && x.pid === b.pid && x.visit === b.visit)
      setBookings([...bookings.filter((x) => x !== old), { ...b, id: todoId, todoId }])
      setTodos((t) => [
        ...t.filter((x) => !old || x.id !== old.todoId),
        { id: todoId, studyId: b.studyId, text: todoText, cat: 'visit', date: b.date, time: b.stops[0]?.time, done: false },
      ])
    },
    approveVisit: (sid, pid, visit) =>
      setAudit((a) => [
        { id: `a${Date.now()}${Math.random()}`, studyId: sid, pid, visit, field: 'All data values', old: '', next: 'Approved', time: stamp(), by: 'You', kind: 'approve' },
        ...a,
      ]),
    cheat,
    setCheat,
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
