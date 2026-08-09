import { useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner.jsx'
import { fetchModels, fetchPreferences } from '../services/api.js'
import './SettingsModal.css'

/**
 * Preferences modal: choose LLM provider (Ollama/Groq) and the default model.
 * Ollama models are fetched live from the backend — never hardcoded.
 * Groq shows only safe configuration status; the API key stays server-side.
 */
export default function SettingsModal({ provider, model, onSave, onClose }) {
  const [selectedProvider, setSelectedProvider] = useState(provider || 'OLLAMA')
  const [selectedModel, setSelectedModel] = useState(model || '')
  const [ollamaModels, setOllamaModels] = useState([])
  const [ollamaAvailable, setOllamaAvailable] = useState(null) // null = checking
  const [groqConfigured, setGroqConfigured] = useState(null)
  const [groqModel, setGroqModel] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPreferences()
      .then((prefs) => {
        setGroqConfigured(prefs.configured)
        setGroqModel(prefs.model || '')
      })
      .catch(() => setGroqConfigured(false))
    refreshOllamaModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshOllamaModels() {
    setLoadingModels(true)
    try {
      const data = await fetchModels('OLLAMA')
      setOllamaModels(data.models.map((m) => m.name))
      setOllamaAvailable(data.available)
      if (data.models.length === 0 && selectedModel) {
        setSelectedModel('')
      }
    } catch {
      setOllamaModels([])
      setOllamaAvailable(false)
    } finally {
      setLoadingModels(false)
    }
  }

  function handleSave() {
    if (selectedProvider === 'OLLAMA' && !selectedModel) {
      setMessage('Select an Ollama model to save, or pick a different provider.')
      return
    }
    onSave({ provider: selectedProvider, model: selectedProvider === 'OLLAMA' ? selectedModel : null })
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          <fieldset className="provider-group">
            <legend className="form-label">AI Provider</legend>
            <label className="provider-option">
              <input
                type="radio"
                name="provider"
                value="OLLAMA"
                checked={selectedProvider === 'OLLAMA'}
                onChange={() => setSelectedProvider('OLLAMA')}
              />
              Ollama
            </label>
            <label className="provider-option">
              <input
                type="radio"
                name="provider"
                value="GROQ"
                checked={selectedProvider === 'GROQ'}
                onChange={() => setSelectedProvider('GROQ')}
              />
              Groq
            </label>
          </fieldset>

          {selectedProvider === 'OLLAMA' && (
            <div className="provider-panel">
              <p className="status-line">
                Ollama status:{' '}
                {ollamaAvailable === null
                  ? 'Checking…'
                  : ollamaAvailable
                    ? <span className="status-ok">Connected</span>
                    : <span className="status-bad">Unable to connect</span>}
              </p>

              {ollamaAvailable && ollamaModels.length === 0 && !loadingModels && (
                <p className="empty-state">
                  ⚠ Ollama is connected but no local models were found. Pull a model in Ollama and
                  click Refresh Models.
                </p>
              )}

              {!ollamaAvailable && !loadingModels && (
                <p className="empty-state">
                  ✕ Unable to connect to Ollama. Make sure Ollama is running, then click Refresh Models.
                </p>
              )}

              {ollamaModels.length > 0 && (
                <div className="model-select-row">
                  <label className="form-label" htmlFor="settings-model">
                    Available local models
                  </label>
                  <select
                    id="settings-model"
                    className="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={loadingModels}
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={refreshOllamaModels}
                disabled={loadingModels}
              >
                {loadingModels ? (
                  <span className="btn-loading">
                    <LoadingSpinner size={16} />
                    Refreshing…
                  </span>
                ) : (
                  'Refresh Models'
                )}
              </button>
            </div>
          )}

          {selectedProvider === 'GROQ' && (
            <div className="provider-panel">
              <p className="status-line">
                Groq status:{' '}
                {groqConfigured === null
                  ? 'Checking…'
                  : groqConfigured
                    ? <span className="status-ok">Configured</span>
                    : <span className="status-bad">API key not configured</span>}
              </p>
              {groqConfigured && groqModel && (
                <p className="status-line">
                  Model: <span className="model-name">{groqModel}</span>
                </p>
              )}
              {groqConfigured === false && (
                <p className="empty-state">
                  Set the GROQ_API_KEY environment variable on the backend to use Groq.
                </p>
              )}
            </div>
          )}

          {message && <p className="modal-message">{message}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Preferences
          </button>
        </footer>
      </div>
    </div>
  )
}
