import { useCallback, useEffect, useState } from 'react'
import Hero from './components/Hero.jsx'
import AnalyzerForm from './components/AnalyzerForm.jsx'
import ResultCard from './components/ResultCard.jsx'
import CompareResults from './components/CompareResults.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Footer from './components/Footer.jsx'
import { analyzeText, analyzeFile, compareModels, fetchModels, checkBackendHealth } from './services/api.js'
import './App.css'

const STORAGE_KEY = 'aiexplainer-preferences'
const MAX_COMPARE = 4

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        provider: parsed.provider === 'GROQ' ? 'GROQ' : 'OLLAMA',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { provider: 'OLLAMA', model: '' }
}

export default function App() {
  const [exceptionText, setExceptionText] = useState('')
  const [file, setFile] = useState(null)
  const [provider, setProvider] = useState(() => loadPreferences().provider)
  const [model, setModel] = useState(() => loadPreferences().model)
  const [result, setResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedCompareModels, setSelectedCompareModels] = useState([])
  const [availableModels, setAvailableModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendUp, setBackendUp] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let active = true
    checkBackendHealth().then((up) => {
      if (active) setBackendUp(up)
    })
    return () => {
      active = false
    }
  }, [])

  const refreshModels = useCallback(async (prov) => {
    try {
      const data = await fetchModels(prov)
      setAvailableModels(data.models.map((m) => m.name))
    } catch {
      setAvailableModels([])
    }
  }, [])

  // On mount and whenever provider changes, refresh the real model list.
  useEffect(() => {
    refreshModels(provider)
  }, [provider, refreshModels])

  // Keep the stored model valid against the live list.
  useEffect(() => {
    if (provider === 'OLLAMA' && model && availableModels.length > 0 && !availableModels.includes(model)) {
      setModel('')
    }
  }, [provider, model, availableModels])

  function persistPreferences(prefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }

  function handleSettingsSave({ provider: newProvider, model: newModel }) {
    setProvider(newProvider)
    setModel(newProvider === 'GROQ' ? '' : newModel || '')
    persistPreferences({ provider: newProvider, model: newProvider === 'GROQ' ? '' : newModel || '' })
    setSettingsOpen(false)
    refreshModels(newProvider)
    setResult(null)
    setCompareResult(null)
    setError(null)
  }

  function toggleCompareModel(m, checked) {
    setSelectedCompareModels((prev) => {
      if (checked) {
        if (prev.length >= MAX_COMPARE) return prev
        return prev.includes(m) ? prev : [...prev, m]
      }
      return prev.filter((x) => x !== m)
    })
  }

  async function handleAnalyze() {
    const text = exceptionText.trim()
    if (!text && !file) {
      setError('Please paste some text or upload a file first.')
      setResult(null)
      setCompareResult(null)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setCompareResult(null)

    try {
      if (compareMode) {
        const data = await compareModels(text, selectedCompareModels)
        setCompareResult(data.results)
      } else if (file) {
        const data = await analyzeFile(file, provider, model)
        setResult(data)
      } else {
        const data = await analyzeText(text, provider, model)
        setResult(data)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setExceptionText('')
    setFile(null)
    setResult(null)
    setCompareResult(null)
    setError(null)
    setSelectedCompareModels([])
  }

  const providerLabel = provider === 'GROQ' ? 'Groq' : 'Ollama'
  const settingsLabel =
    provider === 'GROQ'
      ? 'Groq'
      : model
        ? `${providerLabel} · ${model}`
        : 'Ollama · no model selected'

  const compareDisabledReason = availableModels.length < 2
    ? 'Install at least 2 Ollama models to compare.'
    : 'Select models to compare.'

  return (
    <div className="app">
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <main className="container">
        <Hero backendUp={backendUp} />

        <AnalyzerForm
          exceptionText={exceptionText}
          onExceptionTextChange={setExceptionText}
          file={file}
          onFileChange={setFile}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
          compareModels={availableModels}
          selectedCompareModels={selectedCompareModels}
          onCompareModelsChange={toggleCompareModel}
          loading={loading}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
          onOpenSettings={() => setSettingsOpen(true)}
          settingsLabel={settingsLabel}
          compareDisabledReason={compareDisabledReason}
        />

        {loading && <div className="loading-region" aria-live="polite" />}

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {compareResult && <CompareResults results={compareResult} />}

        {result && !compareResult && <ResultCard result={result} model={settingsLabel} />}
      </main>

      <Footer />

      {settingsOpen && (
        <SettingsModal
          provider={provider}
          model={model}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
