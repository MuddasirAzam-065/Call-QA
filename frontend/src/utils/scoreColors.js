// Consistent score-quality colors across the report - tuned for readable
// contrast on the light "audit console" background (not neon, not pastel).
export const SCORE_GOOD = '#0F8A45' // >= 80/100 or >= 8/10
export const SCORE_WARN = '#B45309' // 55-79/100 or 5.5-7.9/10
export const SCORE_BAD = '#C0293D' // < 55/100 or < 5.5/10
export const SCORE_NEUTRAL = '#64748B'

export function colorForScore(score, max = 100) {
  const ratio = score / max
  if (ratio >= 0.8) return SCORE_GOOD
  if (ratio >= 0.55) return SCORE_WARN
  return SCORE_BAD
}
