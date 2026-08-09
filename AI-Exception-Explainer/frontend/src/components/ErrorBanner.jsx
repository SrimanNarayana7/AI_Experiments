import './ErrorBanner.css'

/**
 * Friendly error message banner with dismiss action.
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="error-banner" role="alert">
      <span className="error-icon" aria-hidden="true">
        ⚠
      </span>
      <p className="error-message">{message}</p>
      <button type="button" className="error-dismiss" onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  )
}
