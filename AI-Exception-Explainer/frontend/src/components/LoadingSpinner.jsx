import './LoadingSpinner.css'

/**
 * Animated gradient loading spinner.
 */
export default function LoadingSpinner({ size = 40 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}
