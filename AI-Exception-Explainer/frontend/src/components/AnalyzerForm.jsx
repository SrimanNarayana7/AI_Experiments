import LoadingSpinner from './LoadingSpinner.jsx'
import FileDropZone from './FileDropZone.jsx'
import './AnalyzerForm.css'

/**
 * The main input form: textarea, optional file upload, compare mode,
 * and action buttons. Provider/model live in Settings, not here.
 */
export default function AnalyzerForm({
  exceptionText,
  onExceptionTextChange,
  file,
  onFileChange,
  compareMode,
  onCompareModeChange,
  compareModels,
  selectedCompareModels,
  onCompareModelsChange,
  loading,
  onAnalyze,
  onClear,
  onOpenSettings,
  settingsLabel,
  compareDisabledReason,
}) {
  const canCompare = compareModels.length > 1

  return (
    <section className="form-card" aria-label="Analyzer">
      <label className="form-label" htmlFor="exception-input">
        Paste Exception / Stack Trace / Log / SQL / API Error — type is auto-detected
      </label>

      <textarea
        id="exception-input"
        className="exception-input"
        placeholder={'e.g.\njava.lang.NullPointerException: Cannot invoke "String.length()" because "s" is null\n\tat com.example.Main.process(Main.java:42)'}
        value={exceptionText}
        onChange={(e) => onExceptionTextChange(e.target.value)}
        rows={7}
        spellCheck={false}
        disabled={loading}
      />

      <FileDropZone file={file} onFileChange={onFileChange} disabled={loading} />

      <div className="compare-row">
        <label className="compare-toggle">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => onCompareModeChange(e.target.checked)}
            disabled={loading}
          />
          Compare models
        </label>

        {compareMode && (
          <div className="compare-selector">
            {canCompare ? (
              <>
                <span className="compare-hint">Select models to compare (up to 4):</span>
                <div className="compare-options">
                  {compareModels.map((m) => (
                    <label key={m} className="compare-option">
                      <input
                        type="checkbox"
                        checked={selectedCompareModels.includes(m)}
                        onChange={(e) => onCompareModelsChange(m, e.target.checked)}
                        disabled={loading}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <span className="compare-hint">{compareDisabledReason}</span>
            )}
          </div>
        )}
      </div>

      <div className="form-controls">
        <div className="model-indicator">
          <span className="model-indicator-label">Using</span>
          <button type="button" className="model-indicator-value" onClick={onOpenSettings}>
            {settingsLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-settings" onClick={onOpenSettings}>
            ⚙ Settings
          </button>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={loading || (!exceptionText && !file)}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <LoadingSpinner size={18} />
                Analyzing…
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
