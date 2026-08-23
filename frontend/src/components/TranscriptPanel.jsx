import { useState } from 'react'
import CriteriaConfig from './CriteriaConfig.jsx'
import AudioUpload from './AudioUpload.jsx'
import ProgressSteps from './ProgressSteps.jsx'
import Button from './Button.jsx'
import { textProps } from '../utils/text.js'

const SAMPLE_TRANSCRIPT = `Agent: Thank you for calling Northwind Support, this is Priya, how can I help you today?
Customer: Hi, yeah, my internet has been dropping every few minutes since last night, it's really frustrating.
Agent: I'm sorry to hear that, that sounds really disruptive. Let's get this sorted out. Can I get your account number or the phone number on the account?
Customer: Sure, it's 555-0182.
Agent: Thanks. I can see your router here - it's been reconnecting every 8 minutes or so, that matches what you're describing. Have you tried restarting the router?
Customer: Yeah, twice. Didn't help.
Agent: Okay, that rules out a simple fix. I'm seeing some signal noise on the line from our end. I'm going to schedule a technician to check the line - the earliest slot is tomorrow between 9 and 12, does that work?
Customer: I guess, but I work from home and need internet.
Agent: Totally understandable. In the meantime I'll issue you a temporary mobile hotspot credit and apply a $15 credit to your account for the inconvenience. I'll also send you a text confirmation of the appointment.
Customer: Okay, that actually helps a lot, thank you.
Agent: Of course. Is there anything else I can help with today?
Customer: No, that's everything.
Agent: Great, thanks for your patience - you'll get that text shortly, and our technician will call before arriving. Have a great day!
Customer: You too, bye.`

const SAMPLE_TRANSCRIPT_UR = `ایجنٹ: نارتھ ونڈ سپورٹ میں کال کرنے کا شکریہ، میں پریا بات کر رہی ہوں، میں آپ کی کیا مدد کر سکتی ہوں؟
گاہک: السلام علیکم، میرا انٹرنیٹ کل رات سے بار بار بند ہو رہا ہے، بہت پریشانی ہو رہی ہے۔
ایجنٹ: مجھے افسوس ہے۔ کیا آپ اپنا اکاؤنٹ نمبر بتا سکتے ہیں؟
گاہک: جی، 555-0182۔
ایجنٹ: شکریہ۔ کیا آپ نے راؤٹر دوبارہ چلا کر دیکھا؟
گاہک: جی، دو بار، کوئی فرق نہیں پڑا۔
ایجنٹ: ٹھیک ہے، میں کل ٹیکنیشن بھیجتی ہوں، اور آپ کے اکاؤنٹ میں کریڈٹ بھی ڈال دیتی ہوں۔
گاہک: بہت شکریہ، اس سے مدد ملے گی۔
ایجنٹ: کیا کوئی اور مسئلہ ہے؟
گاہک: نہیں، بس یہی تھا۔
ایجنٹ: شکریہ، آپ کا دن اچھا گزرے۔`

const REPORT_LANGUAGES = [
  { value: 'auto', label: 'Auto (match transcript)' },
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'اردو Urdu' },
]

export default function TranscriptPanel({
  transcript,
  setTranscript,
  callTitle,
  setCallTitle,
  criteria,
  setCriteria,
  responseLanguage,
  setResponseLanguage,
  onAnalyze,
  loading,
  error,
  notify,
}) {
  const [criteriaOpen, setCriteriaOpen] = useState(false)

  const charCount = transcript.length
  const overLimit = charCount > 20000
  const { dir: transcriptDir, className: transcriptRtlClass } = textProps(transcript)

  return (
    <div className="bg-console-surface border border-console-border rounded-2xl shadow-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-signal/10 text-signal flex items-center justify-center text-sm shrink-0">
            ▤
          </span>
          <div>
            <h2 className="font-display font-semibold text-console-text">Transcript intake</h2>
            <p className="text-xs text-console-muted mt-0.5">
              Paste a call transcript, dictate live, or upload an audio file — English or Urdu.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}>
            Sample (English)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTranscript(SAMPLE_TRANSCRIPT_UR)}>
            نمونہ Sample (Urdu)
          </Button>
        </div>
      </div>

      <input
        value={callTitle}
        onChange={(e) => setCallTitle(e.target.value)}
        placeholder="Call label (optional) — e.g. Internet outage, ticket #4821"
        className="w-full bg-console-raised border border-console-border rounded-lg px-3 py-2 text-sm text-console-text placeholder:text-console-faint focus:border-signal/50 outline-none transition-shadow focus:shadow-glow"
      />

      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          dir={transcriptDir}
          placeholder={'Agent: Thanks for calling, how can I help?\nCustomer: Hi, I have an issue with...\n\n(or paste/type Urdu — اردو میں بھی لکھ سکتے ہیں)'}
          rows={12}
          className={`w-full resize-y bg-console-raised border border-console-border rounded-xl px-4 py-3 text-sm text-console-text placeholder:text-console-faint focus:border-signal/50 outline-none scrollbar-thin transition-shadow focus:shadow-glow ${
            transcriptRtlClass || 'font-mono leading-relaxed'
          }`}
        />
        <span
          className={`absolute bottom-3 text-[11px] font-mono ${
            transcriptDir === 'rtl' ? 'left-3' : 'right-3'
          } ${overLimit ? 'text-alert' : 'text-console-faint'}`}
        >
          {charCount.toLocaleString()} / 20,000
        </span>
      </div>

      <AudioUpload onTranscript={setTranscript} disabled={loading} notify={notify} />

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-console-muted">Report language:</label>
        <div className="flex gap-1.5">
          {REPORT_LANGUAGES.map((l) => (
            <Button
              key={l.value}
              size="sm"
              variant={responseLanguage === l.value ? 'active' : 'secondary'}
              onClick={() => setResponseLanguage(l.value)}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <CriteriaConfig
        criteria={criteria}
        setCriteria={setCriteria}
        open={criteriaOpen}
        onToggle={() => setCriteriaOpen((o) => !o)}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm bg-alert/10 border border-alert/30 text-alert rounded-lg px-3 py-2.5 animate-fadeInUp">
          <span className="mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        pill={false}
        onClick={onAnalyze}
        disabled={loading || !transcript.trim() || overLimit}
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
            Analyzing call…
          </>
        ) : (
          'Analyze call'
        )}
      </Button>

      {loading && (
        <div className="pt-2 border-t border-console-border/60">
          <ProgressSteps active={loading} />
        </div>
      )}
    </div>
  )
}
