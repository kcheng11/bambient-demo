'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { Modal, btn, btn2 } from './ui'

const STEPS = [
  'Reading protocol',
  'Extracting schedule of assessments',
  'Building visit windows',
  'Generating study cheat sheet',
  'Creating study entry',
]

export function AddStudyModal({ onClose }: { onClose: () => void }) {
  const { addStudy } = useApp()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!running) return
    if (step >= STEPS.length) {
      const id = addStudy(file?.name ?? null)
      onClose()
      router.push(`/study/${id}`)
      return
    }
    const t = setTimeout(() => setStep((s) => s + 1), 650)
    return () => clearTimeout(t)
  }, [running, step]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      title="Add study"
      onClose={running ? () => {} : onClose}
      footer={
        !running && (
          <>
            <button className={btn2} onClick={onClose}>Cancel</button>
            <button className={btn} onClick={() => setRunning(true)}>
              {file ? 'Upload protocol & create study' : 'Use sample protocol'}
            </button>
          </>
        )
      }
    >
      <div className="p-5">
        {!running ? (
          <>
            <p className="text-sm text-brand-700 mb-3">
              Upload the study protocol. The hub creates the study entry, visit schedule, and cheat sheet from it.
            </p>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] ?? null) }}
              className="border-2 border-dashed border-black bg-brand-50 p-8 text-center cursor-pointer hover:bg-brand-100"
            >
              <div className="text-3xl text-brand-700">⇪</div>
              <div className="font-semibold text-brand-900 mt-1">{file ? file.name : 'Click or drop a protocol file'}</div>
              <div className="text-xs text-brand-600 mt-1">PDF or Word · demo only, nothing is uploaded</div>
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </>
        ) : (
          <ul className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm ${i > step ? 'opacity-40' : ''}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-xs border ${i < step ? 'bg-brand-900 text-white border-brand-900' : 'border-black'}`}>
                  {i < step ? '✓' : i === step ? '…' : ''}
                </span>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
