import { useState } from 'react'

function UrlInput({ onAnalyze }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)

  const validateUrl = (urlToValidate) => {
    setError(null)
    
    if (!urlToValidate || !urlToValidate.trim()) {
      setError('Please enter a URL')
      return false
    }

    // Basic URL validation
    let urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    if (!urlPattern.test(urlToValidate.trim())) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)')
      return false
    }

    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateUrl(url)) {
      onAnalyze(url.trim())
    }
  }

  const handleChange = (e) => {
    setUrl(e.target.value)
    setError(null)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
            Enter website URL
          </label>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="https://example.com or example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Tip Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-4 h-4 text-white"
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
            <p className="text-blue-900 text-sm leading-relaxed">
              <span className="font-semibold">Tip:</span> We'll take a full-page screenshot of the website, including the footer, to analyze all elements including contact information, pricing, payment methods, and trust indicators.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
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
