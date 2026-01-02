function SuspiciousResult({ result, onNewAnalysis, onReportScam }) {
  const { reasons, explanation, verification_steps } = result

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
      {/* Suspicious Banner */}
      <div className="bg-yellow-50 border border-orange-300 rounded-lg p-4 mb-6 flex items-center gap-3">
        <svg
          className="w-6 h-6 text-orange-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-black font-bold text-lg">This looks suspicious</p>
      </div>

      {/* Warning Indicators */}
      <div className={`space-y-6 mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          // Parse reason - should be "Title: Description" format
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : `Warning ${index + 1}`
          let description = parts.length > 1 ? parts.slice(1).join(':').trim() : reason
          
          // Truncate title to 25 characters if needed
          if (heading.length > 25) {
            heading = heading.substring(0, 22) + '...'
          }
          
          // Truncate description to 185 characters if needed
          if (description.length > 185) {
            description = description.substring(0, 182) + '...'
          }
          
          return (
            <div key={index} className={`flex gap-4 ${reasons.length < 3 ? 'w-full max-w-2xl' : ''}`}>
              <div className="w-1 bg-orange-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-bold text-black mb-2">{heading}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* What to Do Next - Verification Steps */}
      {verification_steps && verification_steps.length > 0 && (
        <div className="mb-6 border-t border-gray-200 pt-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              What to Do Next
            </h4>
            <ol className="space-y-2 list-decimal list-inside">
              {verification_steps.slice(0, 3).map((step, index) => (
                <li key={index} className="text-gray-700 text-sm leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-sm text-gray-600 mb-6 border-t border-gray-200 pt-6">
        Remember: Scam Checker is a free tool to be used alongside your own research and best judgement.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReportScam}
          className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50 font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Report this scam
        </button>
        <button
          onClick={onNewAnalysis}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          Start New Analysis
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
      </div>
    </div>
  )
}

export default SuspiciousResult

