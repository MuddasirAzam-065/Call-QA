import ScoreDial from './ScoreDial.jsx'
import MeterBar from './MeterBar.jsx'
import { textProps } from '../utils/text.js'
import { SCORE_BAD, SCORE_GOOD, SCORE_NEUTRAL, SCORE_WARN } from '../utils/scoreColors.js'

function SentimentBadge({ sentiment }) {
  const map = {
    positive: { color: SCORE_GOOD, label: 'Positive' },
    negative: { color: SCORE_BAD, label: 'Negative' },
    mixed: { color: SCORE_WARN, label: 'Mixed' },
    neutral: { color: SCORE_NEUTRAL, label: 'Neutral' },
  }
  const key = (sentiment || '').toLowerCase()
  const s = map[key] || map.neutral
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ color: s.color, backgroundColor: `${s.color}1A`, border: `1px solid ${s.color}40` }}
    >
      {s.label}
    </span>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-console-surface border border-console-border rounded-2xl shadow-panel p-5 animate-fadeInUp">
      <h3 className="font-display font-semibold text-sm text-console-text mb-4 flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-signal/10 text-signal flex items-center justify-center text-xs shrink-0">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

// Renders AI-generated text with automatic RTL + Urdu font when it detects
// Urdu/Arabic script, and normal LTR otherwise - no manual toggle needed.
function LocalizedText({ text, as: Tag = 'p', className = '' }) {
  const { dir, className: rtlClass } = textProps(text)
  return (
    <Tag dir={dir} className={`${className} ${rtlClass}`}>
      {text}
    </Tag>
  )
}

export default function QAReport({ report }) {
  if (!report) return null

  const { overall_score, categories, sentiment, strengths, problems, improvement_advice, highlighted_sentences, model_used, call_title } = report

  return (
    <div className="space-y-5">
      {call_title && (
        <div className="text-xs text-console-muted font-mono">Call: {call_title}</div>
      )}

      {/* Overall score + sentiment */}
      <div className="bg-console-surface border border-console-border rounded-2xl shadow-panel p-6 flex flex-col sm:flex-row items-center gap-6 animate-fadeInUp">
        <ScoreDial score={overall_score.score} />
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
            <h2 className="font-display font-semibold text-console-text">Overall QA score</h2>
            <SentimentBadge sentiment={sentiment.overall_sentiment} />
          </div>
          <LocalizedText
            text={overall_score.explanation}
            className="text-sm text-console-muted leading-relaxed"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-console-faint font-mono justify-center sm:justify-start">
            <span>customer: {sentiment.customer_sentiment_start} → {sentiment.customer_sentiment_end}</span>
            <span>agent tone: {sentiment.agent_tone}</span>
            {model_used && <span>model: {model_used}</span>}
          </div>
        </div>
      </div>

      {/* Category meters */}
      <Section title="Category breakdown" icon="▤">
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-console-text font-medium">{c.name}</span>
                <span className="text-xs font-mono text-console-muted">{c.score}/10 · {c.verdict}</span>
              </div>
              <MeterBar value={c.score} />
              <LocalizedText text={c.explanation} className="text-xs text-console-muted leading-relaxed" />
            </div>
          ))}
        </div>
      </Section>

      <div className="grid sm:grid-cols-2 gap-5">
        <Section title="Strengths" icon="✓">
          <ul className="space-y-2">
            {strengths.map((s, i) => {
              const { dir, className: rtlClass } = textProps(s)
              return (
                <li
                  key={i}
                  dir={dir}
                  className={`text-sm text-console-muted flex gap-2 ${rtlClass}`}
                >
                  <span className="text-signal mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Problems" icon="!">
          <ul className="space-y-2">
            {problems.map((p, i) => {
              const { dir, className: rtlClass } = textProps(p)
              return (
                <li
                  key={i}
                  dir={dir}
                  className={`text-sm text-console-muted flex gap-2 ${rtlClass}`}
                >
                  <span className="text-alert mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              )
            })}
          </ul>
        </Section>
      </div>

      <Section title="Improvement advice" icon="↗">
        <ol className="space-y-2">
          {improvement_advice.map((a, i) => {
            const { dir, className: rtlClass } = textProps(a)
            return (
              <li
                key={i}
                dir={dir}
                className={`text-sm text-console-muted flex gap-3 ${rtlClass}`}
              >
                <span className="font-mono text-console-faint">{String(i + 1).padStart(2, '0')}</span>
                <span>{a}</span>
              </li>
            )
          })}
        </ol>
      </Section>

      {highlighted_sentences?.length > 0 && (
        <Section title="Highlighted moments" icon="◈">
          <div className="space-y-3">
            {highlighted_sentences.map((h, i) => {
              const color =
                h.importance === 'positive' ? SCORE_GOOD : h.importance === 'negative' ? SCORE_BAD : SCORE_NEUTRAL
              const sentenceProps = textProps(h.sentence)
              const reasonProps = textProps(h.reason)
              return (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2.5 border-l-2"
                  style={{ borderColor: color, backgroundColor: `${color}0D` }}
                >
                  <p className="text-xs font-mono text-console-faint mb-1">{h.speaker}</p>
                  <p dir={sentenceProps.dir} className={`text-sm text-console-text italic ${sentenceProps.className}`}>
                    &ldquo;{h.sentence}&rdquo;
                  </p>
                  <p dir={reasonProps.dir} className={`text-xs text-console-muted mt-1 ${reasonProps.className}`}>
                    {h.reason}
                  </p>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
