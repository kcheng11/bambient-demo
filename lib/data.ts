import { addDays, iso, parse, today } from './dates'

/* ---------- categories / colors ---------- */
// Hard queries are always red; soft queries are always yellow.
export type Cat = 'visit' | 'hard' | 'query' | 'monitor' | 'reg' | 'admin'
export const CATS: Record<Cat, { label: string; color: string }> = {
  visit: { label: 'Participant visit', color: '#012169' },
  hard: { label: 'Hard query', color: '#dc2626' },
  query: { label: 'Soft query', color: '#e6b800' },
  monitor: { label: 'Monitoring visit', color: '#0e7490' },
  reg: { label: 'Regulatory', color: '#4f7fca' },
  admin: { label: 'Admin / task', color: '#8aa0c0' },
}

/* ---------- visit schedule (same template for every study in the demo) ---------- */
export type VisitDef = { n: number; name: string; label: string; day: number; minus: number; plus: number }
export const VISITS: VisitDef[] = [
  { n: 0, name: 'Visit 0', label: 'Screening', day: -14, minus: 3, plus: 3 },
  { n: 1, name: 'Visit 1', label: 'Enrollment / Day 0', day: 0, minus: 0, plus: 0 },
  { n: 2, name: 'Visit 2', label: 'Week 2', day: 14, minus: 3, plus: 3 },
  { n: 3, name: 'Visit 3', label: 'Week 4', day: 28, minus: 3, plus: 3 },
  { n: 4, name: 'Visit 4', label: 'Week 8 / End of treatment', day: 56, minus: 5, plus: 5 },
]
export const visitTarget = (p: Participant, v: VisitDef) => addDays(parse(p.enroll), v.day)

export const VISIT_DESC: Record<number, string> = {
  0: 'Informed consent, eligibility confirmation, medical history review, baseline vitals and screening labs.',
  1: 'Enrollment (Day 0): randomization, baseline assessments and first dispense of study drug.',
  2: 'Week 2 safety check: vitals, safety labs, adverse event review and drug accountability.',
  3: 'Week 4 follow-up: vitals, safety labs, quality-of-life questionnaire and drug accountability.',
  4: 'Week 8 end of treatment: final assessments, labs including HbA1c, drug return and end-of-treatment form.',
}

export const VISIT_PROCS: Record<number, string[]> = {
  0: ['Informed consent (ICF v3.0) signed & dated', 'Inclusion / exclusion review', 'Medical history & con-meds', 'Vital signs & weight', 'Screening labs drawn', 'ECG'],
  1: ['Confirm eligibility results', 'Randomization via IWRS', 'Baseline vitals & weight', 'Baseline labs', 'Dispense study drug', 'Review diary instructions'],
  2: ['Vital signs & weight', 'Safety labs (ALT/AST/creatinine)', 'Adverse event review', 'Drug accountability', 'Diary review'],
  3: ['Vital signs & weight', 'Safety labs', 'Adverse event review', 'Drug accountability', 'Questionnaire (QoL)'],
  4: ['Vital signs & weight', 'Final labs incl. HbA1c', 'Adverse event review', 'Drug return & accountability', 'End-of-treatment form', 'Schedule follow-up call'],
}

/* ---------- data-capture fields ---------- */
// "Assumed range" = soft range (yellow). Hard range = extreme values only (red), e.g. 10x data-entry errors.
export type Field = {
  k: string; label: string; unit: string; group: string
  lo?: number; hi?: number; hardLo?: number; hardHi?: number
}
export const FIELDS: Field[] = [
  { k: 'date', label: 'Visit date (YYYY-MM-DD)', unit: '', group: 'Visit' },
  { k: 'wt', label: 'Weight', unit: 'kg', group: 'Visit', hardLo: 20, hardHi: 400 },
  { k: 'sbp', label: 'Systolic BP', unit: 'mmHg', group: 'Vital signs', lo: 90, hi: 140, hardLo: 40, hardHi: 300 },
  { k: 'dbp', label: 'Diastolic BP', unit: 'mmHg', group: 'Vital signs', lo: 60, hi: 90, hardLo: 20, hardHi: 200 },
  { k: 'hr', label: 'Heart rate', unit: 'bpm', group: 'Vital signs', lo: 50, hi: 100, hardLo: 20, hardHi: 250 },
  { k: 'temp', label: 'Temperature', unit: '°C', group: 'Vital signs', lo: 36.1, hi: 37.8, hardLo: 30, hardHi: 45 },
  { k: 'alt', label: 'ALT', unit: 'U/L', group: 'Lab results', lo: 7, hi: 56, hardHi: 1000 },
  { k: 'ast', label: 'AST', unit: 'U/L', group: 'Lab results', lo: 10, hi: 40, hardHi: 1000 },
  { k: 'creat', label: 'Creatinine', unit: 'mg/dL', group: 'Lab results', lo: 0.6, hi: 1.3, hardHi: 15 },
  { k: 'hba1c', label: 'HbA1c', unit: '%', group: 'Lab results', lo: 4, hi: 8, hardHi: 20 },
]
export const LAB_FIELDS = FIELDS.filter((f) => f.group === 'Lab results')
export const refText = (f: Field) => (f.lo !== undefined ? `${f.lo} – ${f.hi}` : '—')
export const hardText = (f: Field) =>
  f.hardLo !== undefined || f.hardHi !== undefined ? `${f.hardLo ?? '0'} – ${f.hardHi ?? '…'}` : '—'
export type Flag = 'ok' | 'soft' | 'hard' | 'empty'
export function flagOf(f: Field, raw: string | undefined): Flag {
  if (raw === undefined || raw === '') return 'empty'
  const v = parseFloat(raw)
  if (isNaN(v) || f.k === 'date') return 'ok'
  if ((f.hardHi !== undefined && v > f.hardHi) || (f.hardLo !== undefined && v < f.hardLo)) return 'hard'
  if ((f.hi !== undefined && v > f.hi) || (f.lo !== undefined && v < f.lo)) return 'soft'
  return 'ok'
}
export const vkey = (sid: string, pid: string, v: number, f: string) => `${sid}|${pid}|${v}|${f}`

/* ---------- entities ---------- */
export type Participant = {
  id: string; code: string; name: string; age: number; sex: 'F' | 'M'; arm: string
  enroll: string; status: string; amendmentAck: boolean; done: number[]
  conditions: string[]; pastDx: string[]; surgeries: string[]; meds: string[]
}
export const plabel = (p: Participant) => `${p.code} (${p.name})`

export type Study = {
  id: string; name: string; code: string; studyCode: string; title: string; sponsor: string; phase: string
  indication: string; protocolFile: string; participants: Participant[]
  monitorVisits: { date: string; time: string; label: string }[]
  updates: string[]
}
export type Todo = { id: string; studyId: string; text: string; cat: Cat; date: string; time?: string; done: boolean }
export type Query = {
  id: string; studyId: string; pid: string; visit: number; field: string
  text: string; open: boolean; hard: boolean; date: string
}
export type LogNote = { id: string; studyId: string; pid: string; date: string; time: string; title: string; by: string }
export type VisitNote = { id: string; studyId: string; pid: string; visit: number; text: string; time: string; by: string }
export type Audit = {
  id: string; studyId: string; pid: string; visit: number; field: string
  old: string; next: string; time: string; by: string; kind: 'edit' | 'approve'
}
export type Ev = {
  id: string; date: string; time?: string; title: string; short?: string; kind: Cat
  studyId: string; src: 'visit' | 'monitor' | 'todo' | 'query'; pid?: string
}

/* ---------- seed ---------- */
function vals(sIdx: number, pIdx: number, v: number, date: string): Record<string, string> {
  const b = sIdx * 3 + pIdx
  const o: Record<string, string> = {
    date,
    wt: (84 - b * 3 - v * 0.4).toFixed(1),
    sbp: String(122 + b * 3 + v * 2),
    dbp: String(76 + b + v),
    hr: String(66 + b * 2),
    temp: (36.5 + 0.1 * (v % 2)).toFixed(1),
    alt: String(26 + b * 4 + v * 2),
    ast: String(24 + b * 3 + v),
    creat: (0.9 + 0.05 * b).toFixed(2),
    hba1c: (5.9 + 0.2 * b).toFixed(1),
  }
  // Hard queries: order-of-magnitude data-entry errors (126 typed as 1260, 74 typed as 740)
  if (sIdx === 0 && pIdx === 0 && v === 2) { o.sbp = '1260'; o.dbp = '94' } // dbp 94 = soft (yellow)
  if (sIdx === 1 && pIdx === 1 && v === 1) o.hr = '740'
  // Soft query: mildly out of the assumed range
  if (sIdx === 1 && pIdx === 0 && v === 3) o.alt = '74'
  return o
}

export function seed() {
  const t = today()
  const off = (n: number) => iso(addDays(t, n))
  const studies: Study[] = [
    {
      id: 's1', name: 'Study 1', code: 'NCT06120345', studyCode: 'HF-301', phase: 'Phase III', sponsor: 'Meridian Pharma',
      title: 'A randomized, double-blind trial of MRX-114 in heart failure with reduced ejection fraction',
      indication: 'Heart failure (HFrEF)', protocolFile: 'NCT06120345_Protocol_v3.0.pdf',
      monitorVisits: [{ date: off(9), time: '09:00', label: 'On-site monitoring visit (CRA)' }],
      updates: ['Protocol Amendment 3.0 approved by IRB — re-consent required', 'Lab kit lot 4471 expires 12/15', 'Sponsor memo: updated AE reporting timelines'],
      participants: [
        { id: 'p1', code: 'HF-301-001', name: 'Thomas Whitfield', age: 64, sex: 'M', arm: 'Arm A', enroll: off(-20), status: 'Active — treatment', amendmentAck: false, done: [0, 1, 2],
          conditions: ['Heart failure (NYHA II)', 'Hypertension', 'Hyperlipidemia'],
          pastDx: ['Myocardial infarction — 2017', 'Pneumonia — 2021'],
          surgeries: ['Appendectomy — 1998', 'PCI with stent — 2017'],
          meds: ['Lisinopril 20 mg daily', 'Atorvastatin 40 mg nightly', 'Furosemide 20 mg daily'] },
        { id: 'p2', code: 'HF-301-002', name: 'Maria Gonzalez', age: 58, sex: 'F', arm: 'Arm B', enroll: off(-3), status: 'Active — treatment', amendmentAck: true, done: [0, 1],
          conditions: ['Heart failure (NYHA III)', 'Type 2 diabetes', 'CKD stage 2'],
          pastDx: ['Gestational diabetes — 2004', 'Pneumonia — 2019'],
          surgeries: ['Cesarean section — 2004'],
          meds: ['Metformin 1000 mg BID', 'Carvedilol 12.5 mg BID'] },
        { id: 'p3', code: 'HF-301-003', name: 'Harold Jensen', age: 71, sex: 'M', arm: 'Arm A', enroll: off(5), status: 'Screened — awaiting enrollment', amendmentAck: false, done: [0],
          conditions: ['Ischemic cardiomyopathy', 'Atrial fibrillation'],
          pastDx: ['Coronary artery disease — 2016', 'Transient ischemic attack — 2019'],
          surgeries: ['CABG — 2018', 'Cataract surgery — 2022'],
          meds: ['Apixaban 5 mg BID', 'Metoprolol 50 mg BID'] },
      ],
    },
    {
      id: 's2', name: 'Study 2', code: 'NCT05987654', studyCode: 'DM-201', phase: 'Phase II', sponsor: 'Northfield Biosciences',
      title: 'A phase II study of NB-402 in type 2 diabetes with chronic kidney disease',
      indication: 'Type 2 diabetes with CKD', protocolFile: 'NCT05987654_Protocol_v1.2.pdf',
      monitorVisits: [{ date: off(3), time: '10:00', label: 'Remote monitoring visit' }],
      updates: ['Interim safety review scheduled', 'eCRF release 2.1 live — new BP fields'],
      participants: [
        { id: 'p1', code: 'DM-201-001', name: 'Linda Park', age: 52, sex: 'F', arm: 'Arm A', enroll: off(-40), status: 'Active — treatment', amendmentAck: true, done: [0, 1, 2, 3],
          conditions: ['Type 2 diabetes', 'CKD stage 3a', 'Diabetic neuropathy'],
          pastDx: ['Diabetic retinopathy — 2020', 'Hypertension — 2015'],
          surgeries: ['Cholecystectomy — 2012'],
          meds: ['Insulin glargine 24 U nightly', 'Losartan 50 mg daily'] },
        { id: 'p2', code: 'DM-201-002', name: 'Daniel Okafor', age: 47, sex: 'M', arm: 'Arm B', enroll: off(-8), status: 'Active — treatment', amendmentAck: true, done: [0, 1],
          conditions: ['Type 2 diabetes', 'Hypertension'],
          pastDx: ['Hyperlipidemia — 2018', 'Kidney stone — 2019'],
          surgeries: ['Knee arthroscopy — 2014'],
          meds: ['Metformin 1000 mg BID', 'Amlodipine 5 mg daily'] },
      ],
    },
  ]

  const values: Record<string, string> = {}
  studies.forEach((s, si) =>
    s.participants.forEach((p, pi) =>
      p.done.forEach((v) => {
        const d = iso(addDays(parse(p.enroll), VISITS[v].day))
        const row = vals(si, pi, v, d)
        Object.keys(row).forEach((k) => (values[vkey(s.id, p.id, v, k)] = row[k]))
      }),
    ),
  )

  const c = (si: number, pi: number) => studies[si].participants[pi].code
  const todos: Todo[] = [
    { id: 't1', studyId: 's1', text: `Re-consent ${c(0, 0)} for Protocol Amendment 3.0`, cat: 'reg', date: off(0), time: '10:00', done: false },
    { id: 't2', studyId: 's1', text: `Confirm Visit 3 window with ${c(0, 0)}`, cat: 'visit', date: off(0), time: '11:30', done: false },
    { id: 't3', studyId: 's1', text: `Answer query: ${c(0, 1)} con-med start date`, cat: 'query', date: off(0), time: '14:00', done: false },
    { id: 't4', studyId: 's2', text: 'Ship lab samples (batch 14)', cat: 'admin', date: off(0), time: '16:00', done: false },
    { id: 't5', studyId: 's1', text: `Upload signed ICF v3.0 for ${c(0, 2)}`, cat: 'reg', date: off(1), done: false },
    { id: 't6', studyId: 's2', text: `Call ${c(1, 0)} to schedule Visit 4`, cat: 'visit', date: off(2), time: '09:30', done: false },
    { id: 't7', studyId: 's2', text: 'Pull eCRF reports for remote monitoring', cat: 'monitor', date: off(3), time: '09:00', done: false },
    { id: 't8', studyId: 's1', text: 'Prepare source documents for monitoring visit', cat: 'monitor', date: off(8), done: false },
    { id: 't9', studyId: 's1', text: 'File delegation log update', cat: 'admin', date: off(-1), done: true },
  ]

  const manualQ: Query[] = [
    { id: 'MQ-1', studyId: 's1', pid: 'p2', visit: 1, field: 'Concomitant medications', text: 'Start date missing for carvedilol. Please provide or confirm unknown.', open: true, hard: false, date: off(-1) },
  ]
  const notes: LogNote[] = []
  return { studies, todos, values, manualQ, notes }
}

/* ---------- derived helpers ---------- */
export function allQueries(
  studies: Study[], sid: string, values: Record<string, string>, manual: Query[], resolved: Record<string, boolean>,
): Query[] {
  const s = studies.find((x) => x.id === sid)
  if (!s) return []
  const out: Query[] = manual.filter((q) => q.studyId === sid).map((q) => ({ ...q, open: q.open && !resolved[q.id] }))
  s.participants.forEach((p) =>
    VISITS.forEach((v) =>
      FIELDS.forEach((f) => {
        const val = values[vkey(sid, p.id, v.n, f.k)]
        if (flagOf(f, val) === 'hard') {
          const id = `HQ|${sid}|${p.id}|${v.n}|${f.k}`
          out.push({
            id, studyId: sid, pid: p.id, visit: v.n, field: f.label, hard: true, open: !resolved[id],
            text: `${f.label} = ${val} ${f.unit} is far outside the assumed range (${hardText(f)}). Possible data-entry error (about 10× the expected value). Verify against source and correct.`,
            date: iso(visitTarget(p, v)),
          })
        }
      }),
    ),
  )
  return out
}

export function buildEvents(studies: Study[], todos: Todo[], queries: Query[] = []): Ev[] {
  const ev: Ev[] = []
  studies.forEach((s) => {
    s.participants.forEach((p, pi) =>
      VISITS.forEach((v) =>
        ev.push({
          id: `v|${s.id}|${p.id}|${v.n}`, date: iso(visitTarget(p, v)), time: `${String(9 + pi).padStart(2, '0')}:00`,
          title: `${p.code} · ${v.name}`, short: `#${p.code.split('-').pop()} · ${v.name}`,
          kind: 'visit', studyId: s.id, src: 'visit', pid: p.id,
        }),
      ),
    )
    s.monitorVisits.forEach((m, i) =>
      ev.push({ id: `m|${s.id}|${i}`, date: m.date, time: m.time, title: m.label, kind: 'monitor', studyId: s.id, src: 'monitor' }),
    )
  })
  todos.forEach((t) =>
    ev.push({ id: `t|${t.id}`, date: t.date, time: t.time, title: t.text, kind: t.cat, studyId: t.studyId, src: 'todo' }),
  )
  queries.filter((q) => q.open).forEach((q) =>
    ev.push({
      id: `q|${q.id}`, date: q.date, title: `${q.hard ? 'Hard query' : 'Query'} · ${q.field}`,
      kind: q.hard ? 'hard' : 'query', studyId: q.studyId, src: 'query', pid: q.pid,
    }),
  )
  return ev.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
}

// deterministic 24h time for seeded log entries
const tm = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1000
  return `${String(8 + (h % 10)).padStart(2, '0')}:${String((h * 7) % 60).padStart(2, '0')}`
}

export type LogEntry = {
  id: string; date: string; time: string; type: 'visit' | 'screening' | 'query' | 'doc' | 'note'
  title: string; detail: string; by: string; visit?: number; hard?: boolean
}
export function buildLog(
  study: Study, p: Participant, values: Record<string, string>, queries: Query[], notes: LogNote[],
): LogEntry[] {
  const log: LogEntry[] = []
  const d = (n: number) => iso(visitTarget(p, VISITS[n]))
  if (p.done.includes(0)) {
    log.push({ id: 'l-icf', date: d(0), time: '09:42', type: 'screening', title: 'Informed consent signed (ICF v3.0)', detail: 'Consent discussion completed; copy given to participant.', by: 'Site CRC' })
    log.push({ id: 'l-elig', date: d(0), time: '10:20', type: 'screening', title: 'Eligibility checklist completed', detail: 'All inclusion criteria met; no exclusion criteria triggered.', by: 'Site CRC' })
  }
  p.done.forEach((n) => {
    const count = FIELDS.filter((f) => values[vkey(study.id, p.id, n, f.k)]).length
    log.push({ id: `l-v${n}`, date: d(n), time: tm(`${p.id}${n}`), type: 'visit', title: `${VISITS[n].name} (${VISITS[n].label}) completed`, detail: `${count} of ${FIELDS.length} data fields captured.`, by: 'Site CRC', visit: n })
  })
  queries.filter((q) => q.pid === p.id).forEach((q) =>
    log.push({ id: `l-${q.id}`, date: q.date, time: tm(q.id), type: 'query', title: `${q.hard ? 'Hard query' : 'Soft query'}: ${q.field}`, detail: q.text, by: q.hard ? 'Auto-edit check' : 'Data manager', visit: q.visit, hard: q.hard }),
  )
  log.push({ id: 'l-amend', date: iso(addDays(today(), -5)), time: '08:05', type: 'doc', title: 'Protocol Amendment 3.0 released', detail: p.amendmentAck ? 'Acknowledged and re-consent completed.' : 'Re-consent pending for this participant.', by: 'Sponsor' })
  notes.filter((n) => n.pid === p.id && n.studyId === study.id).forEach((n) =>
    log.push({ id: n.id, date: n.date, time: n.time, type: 'note', title: n.title, detail: '', by: n.by }),
  )
  return log.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
}

/* ---------- recording-derived notes (things that do not fit the grid) ---------- */
export type RNote = { t: string; tag: 'Protocol deviation' | 'Observation' | 'Participant-reported' | 'Discrepancy'; text: string }
const REC: Record<number, RNote[]> = {
  0: [
    { t: '03:20', tag: 'Observation', text: 'Participant asked about travel restrictions during the study; ICF section 7 reviewed verbally.' },
    { t: '11:05', tag: 'Protocol deviation', text: 'Screening ECG started before the consent signature was timestamped. Documented as a minor deviation; PI notified.' },
  ],
  1: [
    { t: '04:10', tag: 'Participant-reported', text: 'Started an over-the-counter antacid two days ago. Add to concomitant medications.' },
  ],
  2: [
    { t: '02:40', tag: 'Protocol deviation', text: 'Participant ate about 4 hours before the blood draw (8-hour fast required). Labs to be flagged as non-fasting.' },
    { t: '06:15', tag: 'Participant-reported', text: 'Mild afternoon fatigue since the last visit; no new adverse events reported.' },
  ],
  3: [
    { t: '03:50', tag: 'Observation', text: 'Participant missed two diary entries last week; diary compliance reinforced.' },
  ],
  4: [
    { t: '05:30', tag: 'Observation', text: 'Participant returned unused study drug; count verified with pharmacy.' },
  ],
}
export function recordingNotes(visit: number, done: boolean, values: Record<string, string>, sid: string, pid: string): RNote[] {
  if (!done) return []
  const out = [...(REC[visit] ?? [])]
  FIELDS.forEach((f) => {
    const val = values[vkey(sid, pid, visit, f.k)]
    if (flagOf(f, val) === 'hard') {
      const expected = String(+(parseFloat(val) / 10).toFixed(2))
      out.push({ t: '05:10', tag: 'Discrepancy', text: `Recording: coordinator reads ${f.label} aloud as ${expected} ${f.unit}. Grid shows ${val}. Likely a data-entry error by a factor of 10.` })
    }
  })
  return out.sort((a, b) => a.t.localeCompare(b.t))
}

/* ---------- placeholder content ---------- */
export const CHEAT = [
  { t: 'Study overview', b: 'Placeholder. The generated cheat sheet will summarize the study design, objectives, arms, and key endpoints from the protocol.' },
  { t: 'Eligibility', b: 'Placeholder. Inclusion and exclusion criteria will be condensed into a one-glance checklist.' },
  { t: 'Schedule of assessments', b: 'Placeholder. A visit-by-visit grid of procedures, windows, and required samples.' },
  { t: 'Visit procedures', b: 'Placeholder. Step-by-step guidance per visit, including order of operations and source documentation tips.' },
  { t: 'Safety & AE reporting', b: 'Placeholder. SAE reporting timelines, contact numbers, and grading references.' },
  { t: 'Contacts', b: 'Placeholder. PI, sub-investigators, sponsor medical monitor, CRA, and pharmacy.' },
]

export const TRANSCRIPT = [
  { t: '00:12', who: 'CRC', text: 'Thanks for coming in today. We will start with vital signs and then go through how you have been feeling.' },
  { t: '01:05', who: 'Participant', text: 'Mostly good. A bit more tired in the afternoons, but nothing new.' },
  { t: '02:40', who: 'CRC', text: 'Any new medications or changes since the last visit?' },
  { t: '02:52', who: 'Participant', text: 'No changes. Same pills as before.' },
  { t: '04:30', who: 'CRC', text: 'I am taking your blood pressure now, seated after five minutes of rest.' },
  { t: '05:10', who: 'CRC', text: 'Reading the values aloud so they are captured, then we will draw labs.' },
  { t: '09:45', who: 'CRC', text: 'Next visit will be in about two weeks. I will send a reminder.' },
]
