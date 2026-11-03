'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { Logo, btn, inputCls } from '@/components/ui'

const SITES = [
  'DCRI — Duke Clinical Research Institute',
  'Duke University Hospital',
  'UNC Chapel Hill',
  'Johns Hopkins University',
  'Vanderbilt University Medical Center',
  'University of Pennsylvania',
  'Stanford Medicine',
  'UCSF',
  'Washington University in St. Louis',
]

export default function Login() {
  const { login } = useApp()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [site, setSite] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ name: username.trim(), site: site.split(' — ')[0] })
    router.push('/home')
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[1.1fr_1fr]">
      <div className="bg-brand-900 text-white p-10 flex flex-col justify-between">
        <Logo height={72} />
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Clinical Research<br />Workflow Hub</h1>
          <p className="mt-4 text-brand-200 max-w-md">
            Studies, participants, visit windows, data capture, and queries — in one place for coordinators.
          </p>
        </div>
        <div className="text-xs text-brand-300">Demo environment · no data is stored</div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-brand-900">Sign in</h2>
            <p className="text-sm text-brand-600">Use your site credentials to continue.</p>
          </div>
          <label className="block text-sm">
            <span className="font-semibold text-brand-800">Username</span>
            <input className={`${inputCls} mt-1`} value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-brand-800">Site</span>
            <select className={`${inputCls} mt-1`} value={site} onChange={(e) => setSite(e.target.value)} required>
              <option value="" disabled>Select your institution…</option>
              {SITES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-brand-800">Password</span>
            <input type="password" className={`${inputCls} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className={`${btn} w-full py-2.5`}>Log in</button>
        </form>
      </div>
    </div>
  )
}
