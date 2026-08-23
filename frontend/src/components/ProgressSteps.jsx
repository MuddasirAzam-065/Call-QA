import { useEffect, useState } from 'react'

const STEPS = [
  'Validating transcript',
  'Scoring categories & reading sentiment',
  'Computing overall score',
  'Generating feedback & highlights',
]

// We don't have real server-sent progress, so this simulates step-by-step
// advancement at a reasonable pace while the request is in flight, and
// snaps to "all complete" the moment the real response lands (controlled
// by the parent unmounting this component). It's honest about being an
// estimate - purely to make the wait feel alive instead of a static spinner.
export default function ProgressSteps({ active }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!active) return
    setCurrent(0)
    const timers = [
      setTimeout(() => setCurrent(1), 1200),
      setTimeout(() => setCurrent(2), 4500),
      setTimeout(() => setCurrent(3), 6000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [active])

  return (
    <div className="space-y-2.5">
      {STEPS.map((label, i) => {
        const done = i < current
        const isCurrent = i === current
        return (
          <div key={label} className="flex items-center gap-3">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] shrink-0 border transition-colors ${
                done
                  ? 'bg-signal border-signal text-console-bg'
                  : isCurrent
                  ? 'border-signal text-signal'
                  : 'border-console-border text-console-faint'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`text-xs transition-colors ${
                done ? 'text-console-muted' : isCurrent ? 'text-console-text' : 'text-console-faint'
              }`}
            >
              {label}
            </span>
            {isCurrent && (
              <span className="flex gap-1 ml-1" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1 h-1 rounded-full bg-signal animate-pulseBar"
                    style={{ animationDelay: `${d * 150}ms` }}
                  />
                ))}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
