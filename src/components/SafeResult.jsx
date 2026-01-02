function SafeResult({ result, onNewAnalysis }) {
  const { reasons, explanation } = result

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
      {/* Safe Banner */}
      <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6 flex items-center gap-3">
        <svg
          className="w-6 h-6 text-green-600 flex-shrink-0"
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
        <p className="text-black font-bold text-lg">This looks safe</p>
      </div>

      {/* Verification Steps */}
      <div className={`space-y-6 mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          // Parse reason - should be "Title: Description" format
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : 'Verification Step'
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
              <div className="w-1 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-bold text-black mb-2">{heading}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-gray-600 mb-6 border-t border-gray-200 pt-6">
        Remember: Scam Checker is a free tool to be used alongside your own research and best judgement.
      </p>

      {/* Action Button */}
      <button
        onClick={onNewAnalysis}
        className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
  )
}

export default SafeResult

