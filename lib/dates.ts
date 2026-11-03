export const iso = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const startOfWeek = (d: Date) => addDays(d, -d.getDay())
export const today = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}
export const fmt = (
  d: Date,
  o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) => d.toLocaleDateString('en-US', o)
export const sameDay = (a: Date, b: Date) => iso(a) === iso(b)
export const monthGrid = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const s = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(s, i))
}
export const diffDays = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / 86400000)
