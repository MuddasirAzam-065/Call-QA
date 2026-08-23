export default function Header({ status }) {
  return (
    <header className="border-b border-console-border/80 bg-console-bg/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#4F46E5,#2563EB)] shadow-brand flex items-center justify-center text-white font-display font-bold text-base"
            aria-hidden="true"
          >
            C
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-console-text leading-none">
              Callboard
            </h1>
            <p className="text-[11px] text-console-muted tracking-wide">AI Call Quality Audit Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-console-muted bg-console-surface border border-console-border rounded-full px-3 py-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === 'online' ? 'bg-good' : status === 'checking' ? 'bg-amber animate-pulse' : 'bg-alert'
            }`}
          />
          {status === 'online' && 'backend connected'}
          {status === 'checking' && 'checking backend…'}
          {status === 'offline' && 'backend unreachable'}
        </div>
      </div>
    </header>
  )
}
