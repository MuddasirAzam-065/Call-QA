import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import TranscriptPanel from './components/TranscriptPanel.jsx'
import QAReport from './components/QAReport.jsx'
import HistorySidebar from './components/HistorySidebar.jsx'
import { ToastStack, useToasts } from './components/Toast.jsx'
import { DEFAULT_CRITERIA } from './components/CriteriaConfig.jsx'
import { analyzeCall, checkHealth, deleteHistoryItem, fetchHistory } from './api.js'

export default function App() {
  const [transcript, setTranscript] = useState('')
  const [callTitle, setCallTitle] = useState('')
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA)
  const [responseLanguage, setResponseLanguage] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState('checking')

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const { toasts, pushToast, dismissToast } = useToasts()

  useEffect(() => {
    checkHealth()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'))
    refreshHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshHistory() {
    setHistoryLoading(true)
    try {
      const data = await fetchHistory()
      setHistory(data.items || [])
    } catch {
      // History is a nice-to-have; fail silently in the UI, backend must be down.
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleAnalyze() {
    setError('')
    setLoading(true)
    setReport(null)
    try {
      const data = await analyzeCall({ transcript, criteria, callTitle, responseLanguage })
      setReport(data.report)
      setSelectedId(data.report.id)
      pushToast('QA report ready.', 'success')
      refreshHistory()
    } catch (err) {
      const message = err.message || 'Something went wrong analyzing this call.'
      setError(message)
      pushToast(message, 'error', 6000)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectHistory(item) {
    setReport(item)
    setSelectedId(item.id)
  }

  async function handleDeleteHistory(id) {
    try {
      await deleteHistoryItem(id)
      if (selectedId === id) {
        setReport(null)
        setSelectedId(null)
      }
      refreshHistory()
      pushToast('Call removed from history.', 'info', 2500)
    } catch {
      pushToast('Could not delete that report.', 'error')
    }
  }

  return (
    <div className="min-h-screen">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Header status={status} />

      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <TranscriptPanel
            transcript={transcript}
            setTranscript={setTranscript}
            callTitle={callTitle}
            setCallTitle={setCallTitle}
            criteria={criteria}
            setCriteria={setCriteria}
            responseLanguage={responseLanguage}
            setResponseLanguage={setResponseLanguage}
            onAnalyze={handleAnalyze}
            loading={loading}
            error={error}
            notify={pushToast}
          />

          {report && <QAReport report={report} />}

          {!report && !loading && (
            <div className="border border-dashed border-console-border rounded-2xl p-10 text-center">
              <p className="text-sm text-console-muted">
                Your QA report will appear here once a call is analyzed.
              </p>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20">
          <HistorySidebar
            items={history}
            loading={historyLoading}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
            selectedId={selectedId}
          />
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 pt-2 text-center text-[11px] text-console-faint">
        Callboard — FastAPI · LangChain · LangGraph · OpenRouter · English & Urdu
      </footer>
    </div>
  )
}
