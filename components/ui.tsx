'use client'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'

export const btn = 'bg-brand-900 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed'
export const btn2 = 'border border-black text-brand-900 bg-white px-3 py-1.5 text-sm hover:bg-brand-50'
export const inputCls =
  'border border-black bg-white px-2 py-1.5 text-sm w-full outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900'

export function Logo({ height = 40 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/bambient-logo.svg" alt="bambient.ai" style={{ height, width: 'auto' }} className="block self-start" />
}

export function Panel({
  title, right, children, className = '',
}: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-black flex flex-col min-h-0 ${className}`}>
      <header className="bg-brand-900 text-white px-3 py-1.5 flex items-center justify-between text-sm font-semibold shrink-0">
        <span>{title}</span>
        <div className="flex items-center gap-2 font-normal">{right}</div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </section>
  )
}

export function Modal({
  title, onClose, children, size = 'md', footer,
}: { title: ReactNode; onClose: () => void; children: ReactNode; size?: 'md' | 'lg' | 'xl'; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const w = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-6xl' }[size]
  return (
    <div className="fixed inset-0 z-50 bg-brand-900/50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className={`bg-white border border-black w-full ${w} max-h-[92vh] flex flex-col shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-900 text-white px-4 py-2 flex items-center justify-between shrink-0">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none px-2 hover:bg-brand-700">×</button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        {footer && <div className="border-t border-black p-3 flex justify-end gap-2 bg-brand-50 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function useGuard() {
  const { user } = useApp()
  const router = useRouter()
  useEffect(() => {
    if (!user) router.replace('/')
  }, [user, router])
  return user
}

export function TopBar() {
  const { user, logout } = useApp()
  const router = useRouter()
  return (
    <header className="bg-brand-900 text-white h-12 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Logo height={44} />
        <span className="text-sm tracking-wide opacity-90">Clinical Research Workflow Hub</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="opacity-90">{user?.name} · {user?.site}</span>
        <button
          className="border border-white/60 px-2.5 py-1 hover:bg-white hover:text-brand-900"
          onClick={() => { logout(); router.push('/') }}
        >
          Log out
        </button>
      </div>
    </header>
  )
}

/** Count badge. hard = red, soft = yellow, info = navy. */
export function Badge({ n, tone = 'info' }: { n: number; tone?: 'hard' | 'soft' | 'info' }) {
  if (!n) return null
  const c = { hard: 'bg-red-600 text-white', soft: 'bg-yellow-300 text-black', info: 'bg-brand-900 text-white' }[tone]
  return <span className={`${c} text-[11px] font-semibold px-1.5 min-w-5 text-center inline-block leading-5`}>{n}</span>
}

/** Small colored count chips for open queries: hard = red, soft = yellow. */
export function QueryChips({ hard, soft }: { hard: number; soft: number }) {
  if (!hard && !soft) return <span className="text-brand-600">0</span>
  return (
    <span className="inline-flex gap-1.5">
      {hard > 0 && <span className="bg-red-700 text-white text-xs font-semibold px-1.5">{hard} hard</span>}
      {soft > 0 && <span className="bg-yellow-300 text-black text-xs font-semibold px-1.5">{soft} soft</span>}
    </span>
  )
}
