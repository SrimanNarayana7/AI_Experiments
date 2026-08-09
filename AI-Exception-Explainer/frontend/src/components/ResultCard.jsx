import './ResultCard.css'

const CONFIDENCE_META = {
  HIGH: { label: 'High', className: 'confidence-high' },
  MEDIUM: { label: 'Medium', className: 'confidence-medium' },
  LOW: { label: 'Low', className: 'confidence-low' },
}

const TYPE_META = {
  EXCEPTION: 'Exception',
  LOG: 'Log',
  API_ERROR: 'API Error',
  SQL: 'SQL',
  PLAYWRIGHT: 'Playwright',
  SELENIUM: 'Selenium',
}

/**
 * Displays the structured AI analysis result.
 */
export default function ResultCard({ result, model }) {
  const confidence = CONFIDENCE_META[result.confidence] || CONFIDENCE_META.MEDIUM
  const typeLabel = TYPE_META[result.analysisType]

  return (
    <section className="result-card" aria-label="Analysis result">
      <header className="result-header">
        <div>
          <span className="result-eyebrow">Analysis Result</span>
          <h2 className="result-title">{result.exceptionType || 'Unknown Exception'}</h2>
        </div>
        <div className="result-badges">
          {typeLabel && <span className="type-chip">{typeLabel}</span>}
          <span className={`confidence-badge ${confidence.className}`}>{confidence.label}</span>
        </div>
      </header>

      <div className="result-meta">
        <span className="result-model">{model}</span>
      </div>

      <div className="result-body">
        <ResultSection title="Root Cause" icon="🔍">
          <p>{result.rootCause}</p>
        </ResultSection>

        <ResultSection title="Technical Explanation" icon="⚙️">
          <p>{result.technicalExplanation}</p>
        </ResultSection>

        <ResultSection title="Suggested Fix" icon="🛠️">
          <pre className="code-block">{result.fix}</pre>
        </ResultSection>

        <ListSection title="Best Practices" icon="✨" items={result.bestPractices} />

        <ListSection title="Prevention Tips" icon="🛡️" items={result.preventionTips} />

        {Array.isArray(result.sections) &&
          result.sections.map((section, i) => (
            <Section key={i} section={section} />
          ))}
      </div>
    </section>
  )
}

function Section({ section }) {
  if (section.kind === 'LIST') {
    return <ListSection title={section.title} icon="📋" items={section.items} />
  }
  return (
    <ResultSection title={section.title} icon="📋">
      {section.kind === 'CODE' ? (
        <pre className="code-block">{section.content}</pre>
      ) : (
        <p>{section.content}</p>
      )}
    </ResultSection>
  )
}

function ResultSection({ title, icon, children }) {
  return (
    <div className="result-section">
      <h3 className="result-section-title">
        <span className="result-section-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      <div className="result-section-content">{children}</div>
    </div>
  )
}

function ListSection({ title, icon, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="result-section">
      <h3 className="result-section-title">
        <span className="result-section-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      <ul className="result-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
