const API_BASE = '/api'

/**
 * Shared fetch wrapper: parses JSON, extracts the backend error message,
 * and throws an Error with a friendly message on failure.
 */
async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options)

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (body && body.message) message = body.message
    } catch {
      // keep default message
    }
    throw new Error(message)
  }

  return response.json()
}

/**
 * Analyzes pasted text via the backend. Type is auto-detected server-side.
 * @param {string} exception - the pasted text
 * @param {string} provider - 'OLLAMA' | 'GROQ'
 * @param {string} model - model name
 */
export async function analyzeText(exception, provider, model) {
  return request('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exception, provider, model }),
  })
}

/** Backwards-compatible alias for the existing single-model call. */
export const analyzeException = analyzeText

/**
 * Analyzes an uploaded file's extracted text.
 * @param {File} file
 * @param {string} provider
 * @param {string} model
 */
export async function analyzeFile(file, provider, model) {
  const formData = new FormData()
  formData.append('file', file)
  if (provider) formData.append('provider', provider)
  if (model) formData.append('model', model)
  return request('/analyze/file', {
    method: 'POST',
    body: formData, // browser sets the multipart boundary
  })
}

/**
 * Compares analysis across multiple models of the active provider.
 * @param {string} exception
 * @param {string[]} models
 */
export async function compareModels(exception, models) {
  return request('/analyze/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exception, models }),
  })
}

/**
 * Fetches models actually available for a provider.
 * @param {string} provider
 * @returns {Promise<{provider: string, models: [{name: string}], available: boolean, message?: string}>}
 */
export async function fetchModels(provider) {
  return request(`/models?provider=${encodeURIComponent(provider)}`)
}

/**
 * Fetches safe provider configuration status (never secrets).
 */
export async function fetchPreferences() {
  return request('/preferences')
}

/** Checks whether the backend is reachable. */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}
