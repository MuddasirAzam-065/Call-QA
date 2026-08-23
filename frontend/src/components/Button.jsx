// One button component, four variants. Used everywhere so the whole app's
// buttons look and behave consistently instead of each component inventing
// its own style. Purely visual - callers still pass their own onClick,
// disabled, type, etc. via ...props, so no behavior changes anywhere.
const VARIANTS = {
  primary:
    'text-white bg-[linear-gradient(135deg,#4F46E5,#2563EB)] shadow-brand hover:brightness-110 hover:-translate-y-px disabled:hover:translate-y-0 disabled:hover:brightness-100',
  secondary:
    'bg-console-surface border border-console-border text-console-muted hover:text-console-text hover:border-signal/40 hover:-translate-y-px disabled:hover:translate-y-0',
  active:
    'bg-signal/10 border border-signal/40 text-signal',
  ghost:
    'text-console-muted hover:text-console-text hover:bg-console-raised',
  danger:
    'text-alert hover:bg-alert/10',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-sm px-5 py-3 gap-2',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  pill = true,
  icon = null,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-display font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
        pill ? 'rounded-full' : 'rounded-lg'
      } ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 leading-none">{icon}</span>}
      {children}
    </button>
  )
}
