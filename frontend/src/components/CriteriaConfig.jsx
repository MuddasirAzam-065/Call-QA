import Button from './Button.jsx'

const DEFAULT_CRITERIA = [
  'Greeting',
  'Professionalism',
  'Issue Understanding',
  'Communication',
  'Resolution / Closing',
]

export { DEFAULT_CRITERIA }

export default function CriteriaConfig({ criteria, setCriteria, open, onToggle }) {
  const toggleCriterion = (name) => {
    setCriteria((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    )
  }

  const addCustom = (e) => {
    e.preventDefault()
    const val = e.target.elements.custom.value.trim()
    if (val && !criteria.includes(val)) {
      setCriteria((prev) => [...prev, val])
      e.target.reset()
    }
  }

  return (
    <div className="border border-console-border rounded-xl bg-console-raised/50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-console-text hover:bg-console-raised transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-signal/10 text-signal flex items-center justify-center text-xs">
            ⚙
          </span>
          QA criteria
          <span className="text-console-muted font-normal font-mono text-xs">
            ({criteria.length} active)
          </span>
        </span>
        <span className="text-console-muted text-xs">{open ? 'Hide' : 'Configure'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-console-border/70 pt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CRITERIA.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={criteria.includes(c) ? 'active' : 'secondary'}
                onClick={() => toggleCriterion(c)}
              >
                {c}
              </Button>
            ))}
            {criteria
              .filter((c) => !DEFAULT_CRITERIA.includes(c))
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCriterion(c)}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber/40 bg-amber/10 text-amber font-display font-semibold transition-all active:scale-[0.97]"
                >
                  {c} ✕
                </button>
              ))}
          </div>

          <form onSubmit={addCustom} className="flex gap-2">
            <input
              name="custom"
              placeholder="Add a custom criterion (e.g. Compliance Disclosure)"
              className="flex-1 bg-console-surface border border-console-border rounded-lg px-3 py-2 text-xs text-console-text placeholder:text-console-faint focus:border-signal/50 outline-none"
            />
            <Button type="submit" size="sm" variant="secondary" pill={false}>
              Add
            </Button>
          </form>
          <p className="text-[11px] text-console-faint">
            Uncheck a default criterion to exclude it, or add your own. This list is sent to the
            AI workflow to shape the scoring prompt.
          </p>
        </div>
      )}
    </div>
  )
}
