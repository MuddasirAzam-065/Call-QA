// A horizontal "VU meter" made of discrete segments, echoing an audio level
// meter on a call-center console. This is the report's signature visual
// element: category scores read like signal strength, not generic progress bars.
export default function MeterBar({ value, max = 10, segments = 10, size = 'md' }) {
  const filled = Math.round((value / max) * segments)
  const height = size === 'sm' ? 'h-3' : 'h-4'

  const colorFor = (i) => {
    const ratio = i / segments
    if (ratio < 0.5) return 'bg-good'
    if (ratio < 0.8) return 'bg-amber'
    return 'bg-alert'
  }

  return (
    <div className="flex items-end gap-[3px]" role="img" aria-label={`Score ${value} out of ${max}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const active = i < filled
        return (
          <div
            key={i}
            className={`w-[5px] ${height} rounded-[1.5px] transition-colors duration-300 ${
              active ? colorFor(segments - i) : 'bg-console-border'
            }`}
            style={{ opacity: active ? 1 : 0.5 }}
          />
        )
      })}
    </div>
  )
}
