import { colorForScore } from '../utils/scoreColors.js'

export default function ScoreDial({ score = 0 }) {
  const size = 168
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score)) / 100
  const dash = circumference * pct

  const color = colorForScore(score, 100)
  const label = score >= 80 ? 'Strong call' : score >= 55 ? 'Needs coaching' : 'At risk'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E7F0"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl font-semibold text-console-text tabular-nums">
          {score}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-console-muted mt-1">/ 100</span>
        <span
          className="mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40` }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
