import { useState } from 'react'
import { validateUrl } from '../utils/urlValidator'

function UrlInput({ onAnalyze }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    
    const validation = validateUrl(url)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }
    
    onAnalyze(url.trim())
  }

  const handleChange = (e) => {
    setUrl(e.target.value)
    setError(null)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-foreground mb-2">
            Enter website URL
          </label>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="https://example.com"
            className="w-full px-4 py-4 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground transition-all duration-200"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Tip Notice */}
        <div className="tip-box rounded-xl p-4 flex items-start gap-3">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-foreground text-sm leading-relaxed">
              <span className="font-semibold">Tip:</span> We'll analyze the website for common scam indicators including suspicious patterns, trust signals, and more.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full gradient-button text-primary-foreground font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
        >
          Check Now
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}

export default UrlInput
