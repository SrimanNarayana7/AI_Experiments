import './Hero.css'

/**
 * Page hero with the title, subtitle and backend status indicator.
 */
export default function Hero({ backendUp }) {
  return (
    <header className="hero">
      <h1 className="hero-title">AI Exception Explainer</h1>
      <p className="hero-subtitle">Understand exceptions instantly using AI.</p>

      <div className="hero-status">
        <span
          className={`status-dot ${
            backendUp === null ? 'status-checking' : backendUp ? 'status-up' : 'status-down'
          }`}
        />
        {backendUp === null
          ? 'Checking backend…'
          : backendUp
            ? 'Backend connected'
            : 'Backend offline'}
      </div>
    </header>
  )
}
