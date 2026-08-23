import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LANGUAGES = [
  { value: 'auto', label: 'Auto detect', speechLang: 'en-US' },
  { value: 'ur', label: 'اردو Urdu', speechLang: 'ur-PK' },
  { value: 'en', label: 'English', speechLang: 'en-US' },
]

// Bonus feature: audio upload + speech-to-text transcription, with Urdu
// support end-to-end. Two paths, both wired to something real:
//  1. Live microphone dictation via the browser's built-in Web Speech API -
//     free, needs no backend key, works in Chrome/Edge. Urdu dictation uses
//     the 'ur-PK' recognition locale.
//  2. Upload an audio file -> backend /api/transcribe -> local faster-whisper
//     (multilingual, transcribes Urdu natively, no key needed).
export default function AudioUpload({ onTranscript, disabled, notify }) {
  const [recording, setRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [language, setLanguage] = useState('auto')
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        }
      }
      if (finalText) onTranscript((prev) => (prev ? prev + '\n' : '') + finalText.trim())
    }
    recognition.onerror = (e) => notify?.(`Microphone error: ${e.error}`, 'error')
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) return
    if (recording) {
      recognitionRef.current.stop()
      setRecording(false)
    } else {
      const langConfig = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0]
      recognitionRef.current.lang = langConfig.speechLang
      recognitionRef.current.start()
      setRecording(true)
      notify?.(`Listening (${langConfig.label})… speak now.`, 'info', 2500)
    }
  }

  const sendFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('language', language)
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Transcription failed.')
      onTranscript((prev) => (prev ? prev + '\n' : '') + body.transcript)
      const detected = body.detected_language ? ` (detected: ${body.detected_language})` : ''
      notify?.(`Audio transcribed and added to the transcript${detected}.`, 'success')
    } catch (err) {
      notify?.(err.message, 'error', 6000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileInput = (e) => sendFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      sendFile(file)
    } else if (file) {
      notify?.('Please drop an audio file.', 'error')
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled && !uploading) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-xl border transition-colors ${
        dragOver ? 'border-signal/60 bg-signal/5' : 'border-transparent'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={disabled}
          className="text-xs bg-console-surface border border-console-border rounded-full px-3 py-2 text-console-muted focus:border-signal/50 outline-none disabled:opacity-40"
          title="Audio language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled || !speechSupported}
          onClick={toggleRecording}
          className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border font-display font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
            recording
              ? 'border-alert/50 bg-alert/10 text-alert'
              : 'bg-console-surface border-console-border text-console-muted hover:text-console-text hover:border-signal/40 hover:-translate-y-px'
          }`}
          title={speechSupported ? 'Live mic dictation (Web Speech API)' : 'Not supported in this browser'}
        >
          <span className={`w-2 h-2 rounded-full ${recording ? 'bg-alert animate-pulse' : 'bg-console-faint'}`} />
          {recording ? 'Stop recording' : 'Record from microphone'}
        </button>

        <label
          className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border bg-console-surface border-console-border text-console-muted font-display font-semibold hover:text-console-text hover:border-signal/40 hover:-translate-y-px cursor-pointer transition-all duration-150 active:scale-[0.97] ${
            disabled || uploading ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? (
            <>
              <span className="w-3 h-3 border-2 border-console-muted/40 border-t-console-muted rounded-full animate-spin" />
              Transcribing…
            </>
          ) : (
            'Upload or drop audio file'
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={handleFileInput}
          />
        </label>

        {!speechSupported && (
          <span className="text-[11px] text-console-faint">Mic dictation needs Chrome/Edge.</span>
        )}
      </div>
    </div>
  )
}
