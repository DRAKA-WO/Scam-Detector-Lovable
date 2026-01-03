import { useState } from 'react'

function TextInput({ onAnalyze, loading }) {
  const [text, setText] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) {
      return
    }
    await onAnalyze(text.trim())
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste email content, message text, or any suspicious text here..."
            className="w-full px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200 dark-input"
            rows={8}
            disabled={loading}
          />
          <div className="mt-4 tip-box rounded-xl p-4 flex items-start gap-3">
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
            <p className="text-foreground text-sm leading-relaxed">
              <span className="font-semibold">Tip:</span> Include the full text with sender info and links for best results.
            </p>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className={`w-full font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
            loading || !text.trim()
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : 'gradient-button text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-[1.02]'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              Check Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default TextInput
