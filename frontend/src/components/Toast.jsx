import { useCallback, useRef, useState } from 'react'

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const pushToast = useCallback((message, tone = 'info', duration = 4000) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, tone }])
    if (duration) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, pushToast, dismissToast }
}

const TONE_STYLES = {
  info: 'border-console-border text-console-text',
  success: 'border-signal/40 text-signal',
  error: 'border-alert/40 text-alert',
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`animate-toastIn cursor-pointer bg-console-surface border ${
            TONE_STYLES[t.tone] || TONE_STYLES.info
          } rounded-lg px-4 py-3 text-sm shadow-panel`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
