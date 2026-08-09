import ResultCard from './ResultCard.jsx'
import './CompareResults.css'

/**
 * Grid of per-model analysis results from a comparison.
 */
export default function CompareResults({ results }) {
  return (
    <section className="compare-results" aria-label="Model comparison">
      <h2 className="compare-title">Model Comparison</h2>
      <div className="compare-grid">
        {results.map((entry, index) => (
          <div key={`${entry.model}-${index}`} className="compare-item">
            <div className="compare-item-label">
              {entry.model} {entry.provider && <span className="compare-item-provider">{entry.provider}</span>}
            </div>
            {entry.error ? (
              <div className="compare-error" role="alert">
                {entry.error}
              </div>
            ) : (
              <ResultCard result={entry.analysis} model={`${entry.provider} · ${entry.model}`} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
