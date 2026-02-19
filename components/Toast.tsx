'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
  type?: 'error' | 'info' | 'success'
}

export default function Toast({ message, onDismiss, type = 'error' }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, onDismiss])

  if (!message) return null

  const colors = {
    error:   'bg-red-900/90 border-red-500/50 text-red-200',
    info:    'bg-slate-800/90 border-slate-500/50 text-slate-200',
    success: 'bg-emerald-900/90 border-emerald-500/50 text-emerald-200',
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-lg border shadow-lg
        transition-all duration-300
        ${colors[type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5">
          {type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
        </span>
        <span className="text-sm leading-snug">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 text-current opacity-60 hover:opacity-100 text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
