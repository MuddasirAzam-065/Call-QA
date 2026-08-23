import { textProps } from '../utils/text.js'
import { colorForScore } from '../utils/scoreColors.js'

export default function HistorySidebar({ items, loading, onSelect, onDelete, selectedId }) {
  return (
    <div className="bg-console-surface border border-console-border rounded-2xl shadow-panel flex flex-col max-h-[calc(100vh-140px)]">
      <div className="px-4 py-3 border-b border-console-border/70 flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-console-text">Call history</h3>
        <span className="text-[11px] font-mono text-console-faint">{items.length}</span>
      </div>

      <div className="overflow-y-auto scrollbar-thin flex-1">
        {loading && (
          <p className="text-xs text-console-muted px-4 py-4">Loading…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-xs text-console-muted px-4 py-4 leading-relaxed">
            Analyzed calls are saved here automatically so you can revisit past QA reports.
          </p>
        )}
        <ul>
          {items.map((item) => {
            const active = item.id === selectedId
            const score = item.overall_score?.score
            const color = colorForScore(score, 100)
            const titleRtl = textProps(item.call_title)
            const previewRtl = textProps(item.transcript_preview)
            return (
              <li key={item.id} className="border-b border-console-border/50 last:border-0">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full text-left px-4 py-3 transition-all hover:scale-[1.005] ${
                    active ? 'bg-signal/10' : 'hover:bg-console-raised'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      dir={titleRtl.dir}
                      className={`text-xs text-console-text font-medium truncate ${titleRtl.className}`}
                    >
                      {item.call_title || 'Untitled call'}
                    </span>
                    <span
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0"
                      style={{ color, backgroundColor: `${color}1A` }}
                    >
                      {score}
                    </span>
                  </div>
                  <p
                    dir={previewRtl.dir}
                    className={`text-[11px] text-console-faint mt-1 truncate ${previewRtl.className}`}
                  >
                    {item.transcript_preview}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-console-faint font-mono">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(item.id)
                      }}
                      className="text-[10px] text-console-faint hover:text-alert transition-colors"
                    >
                      delete
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
