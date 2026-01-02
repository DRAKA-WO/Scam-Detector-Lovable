import getScamNextSteps from '../utils/scamNextSteps'

function ScamResult({ result, onNewAnalysis, onReportScam }) {
  const { reasons, explanation, scam_type, next_steps } = result
  // Use AI-generated next_steps if available, otherwise fall back to hardcoded steps
  const nextSteps = next_steps && next_steps.length > 0 ? next_steps : getScamNextSteps(scam_type)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
      {/* Scam Banner */}
      <div className="bg-pink-50 border border-red-300 rounded-lg p-4 mb-6 flex items-center gap-3">
        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p className="text-black font-bold text-lg">This looks like a scam</p>
      </div>

      {/* Scam Indicators */}
      <div className={`space-y-6 mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          // Parse reason - should be "Title: Description" format
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : `Scam Indicator ${index + 1}`
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
              <div className="w-1 bg-red-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-bold text-black mb-2">{heading}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scam Type and Next Steps */}
      {scam_type && (
        <div className="mb-6 border-t border-gray-200 pt-6">
          {/* Scam Type */}
          <div className="mb-4">
            <h3 className="font-bold text-black mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Type of Scam: {scam_type}
            </h3>
          </div>

          {/* What to Do Next */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600"
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
              {nextSteps.map((step, index) => (
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

export default ScamResult

