import { diffDays, iso, today } from './dates'

/* ---------- lab / service definitions (demo data) ---------- */
export type Lab = {
  id: string; name: string; short: string; location: string
  days: number[]            // 0 = Sun ... 6 = Sat
  open: string; close: string; slotMin: number
  busy: number              // % of slots already booked (demo)
  turnaround: string; note: string; leadDays?: number; order: number
}

export const LABS: Lab[] = [
  { id: 'central', name: 'Central lab draw', short: 'Central lab', location: 'Clinic 2B · courier pickup 15:00', days: [1, 2, 3, 4], open: '07:30', close: '13:30', slotMin: 30, busy: 40, turnaround: '3 days', note: 'Fasting 8 h. No Friday or weekend draws (samples cannot ship).', order: 1 },
  { id: 'local', name: 'Local lab (safety chemistry)', short: 'Local lab', location: 'Hospital lab · Level 1', days: [1, 2, 3, 4, 5], open: '07:00', close: '16:30', slotMin: 30, busy: 35, turnaround: 'Same day', note: 'ALT / AST / creatinine.', order: 2 },
  { id: 'ecg', name: 'ECG suite', short: 'ECG', location: 'Cardiology · Level 3', days: [1, 3, 5], open: '08:00', close: '12:00', slotMin: 30, busy: 45, turnaround: 'Immediate read', note: 'Mon / Wed / Fri mornings.', order: 3 },
  { id: 'echo', name: 'Echocardiography / imaging', short: 'Echo', location: 'Imaging · Level 2', days: [2, 4], open: '09:00', close: '15:00', slotMin: 60, busy: 50, turnaround: '24 h', note: 'Tue / Thu only. Book at least 3 days ahead.', leadDays: 3, order: 4 },
]

// Which labs each visit needs
export const VISIT_LABS: Record<number, string[]> = {
  0: ['central', 'local', 'ecg'],
  1: ['central', 'local'],
  2: ['local'],
  3: ['central', 'local'],
  4: ['central', 'local', 'ecg', 'echo'],
}
export const visitLabs = (n: number) => LABS.filter((l) => VISIT_LABS[n].includes(l.id)).sort((a, b) => a.order - b.order)

// Closures (all labs unless `labs` is given)
export const CLOSURES: Record<string, { label: string; labs?: string[] }> = {
  '2026-11-11': { label: 'Veterans Day (ECG & imaging closed)', labs: ['ecg', 'echo'] },
  '2026-11-26': { label: 'Thanksgiving' },
  '2026-11-27': { label: 'Site closed' },
  '2026-12-24': { label: 'Holiday closure' },
  '2026-12-25': { label: 'Holiday closure' },
  '2026-12-31': { label: 'Holiday closure' },
  '2027-01-01': { label: 'Holiday closure' },
}

/* ---------- helpers ---------- */
const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
const hash = (s: string) => { let x = 7; for (const c of s) x = (Math.imul(x, 33) + c.charCodeAt(0)) >>> 0; return x }
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const dayRange = (days: number[]) => {
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  return contiguous && days.length > 2 ? `${DN[days[0]]}–${DN[days[days.length - 1]]}` : days.map((d) => DN[d]).join(' / ')
}

export type Avail = { status: 'open' | 'limited' | 'closed'; slots: string[]; reason?: string }

export function labAvail(lab: Lab, d: Date): Avail {
  const t = today()
  const key = iso(d)
  if (d < t) return { status: 'closed', slots: [], reason: 'Past' }
  const cl = CLOSURES[key]
  if (cl && (!cl.labs || cl.labs.includes(lab.id))) return { status: 'closed', slots: [], reason: cl.label }
  if (!lab.days.includes(d.getDay())) return { status: 'closed', slots: [], reason: `Not offered ${DN[d.getDay()]}` }
  if (lab.leadDays && diffDays(d, t) < lab.leadDays) return { status: 'closed', slots: [], reason: `Needs ${lab.leadDays} days notice` }

  const all: string[] = []
  for (let m = toMin(lab.open); m + lab.slotMin <= toMin(lab.close); m += lab.slotMin) all.push(fromMin(m))
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const slots = all.filter((s) => hash(`${lab.id}|${key}|${s}`) % 100 >= lab.busy && (diffDays(d, t) > 0 || toMin(s) > nowMin))
  if (slots.length === 0) return { status: 'closed', slots, reason: 'Fully booked' }
  return { status: slots.length <= 2 ? 'limited' : 'open', slots }
}

export type Stop = { lab: Lab; time: string }
/** Greedy plan: labs in a sensible order (fasting draw first), each at the first slot after the previous stop. */
export function suggestItinerary(labs: Lab[], d: Date): { stops: Stop[]; missing: Lab[] } {
  let cursor = 0
  const stops: Stop[] = []
  const missing: Lab[] = []
  ;[...labs].sort((a, b) => a.order - b.order).forEach((lab) => {
    const slot = labAvail(lab, d).slots.find((s) => toMin(s) >= cursor)
    if (!slot) { missing.push(lab); return }
    stops.push({ lab, time: slot })
    cursor = toMin(slot) + lab.slotMin + 15 // 15 min to move between labs
  })
  return { stops, missing }
}
export type DayStatus = 'ok' | 'partial' | 'closed'
export function dayStatus(labs: Lab[], d: Date): DayStatus {
  const { stops, missing } = suggestItinerary(labs, d)
  return missing.length === 0 ? 'ok' : stops.length > 0 ? 'partial' : 'closed'
}
export const endTime = (lab: Lab, start: string) => fromMin(toMin(start) + lab.slotMin)
export const overlaps = (a: { lab: Lab; time: string }, b: { lab: Lab; time: string }) =>
  toMin(a.time) < toMin(b.time) + b.lab.slotMin && toMin(b.time) < toMin(a.time) + a.lab.slotMin

export type Booking = { id: string; todoId: string; studyId: string; pid: string; visit: number; date: string; stops: { labId: string; time: string }[] }
