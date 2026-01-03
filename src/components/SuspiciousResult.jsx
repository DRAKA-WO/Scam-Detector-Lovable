function SuspiciousResult({ result, onNewAnalysis, onReportScam }) {
  const { reasons, explanation, verification_steps } = result

  return (
    <div className="bg-card backdrop-blur-xl rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 md:p-8 glow-effect animate-fade-in">
      {/* Suspicious Banner */}
      <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
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
        </div>
        <p className="text-white font-bold text-base sm:text-lg">This looks suspicious</p>
      </div>

      {/* Warning Indicators */}
      <div className={`space-y-4 sm:space-y-6 mb-4 sm:mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : `Warning ${index + 1}`
          let description = parts.length > 1 ? parts.slice(1).join(':').trim() : reason
          
          if (heading.length > 25) {
            heading = heading.substring(0, 22) + '...'
          }
          
          if (description.length > 185) {
            description = description.substring(0, 182) + '...'
          }
          
          return (
            <div key={index} className={`flex gap-3 sm:gap-4 ${reasons.length < 3 ? 'w-full max-w-2xl' : ''}`}>
              <div className="w-1 bg-orange-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-1 sm:mb-2">{heading}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* What to Do Next - Verification Steps */}
      {verification_steps && verification_steps.length > 0 && (
        <div className="mb-4 sm:mb-6 border-t border-gray-700 pt-4 sm:pt-6">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <h4 className="font-semibold text-white text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500"
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
            <ol className="space-y-1.5 sm:space-y-2 list-decimal list-inside">
              {verification_steps.slice(0, 3).map((step, index) => (
                <li key={index} className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 border-t border-gray-700 pt-4 sm:pt-6">
        Remember: Scam Checker is a free tool to be used alongside your own research and best judgement.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={onReportScam}
          className="flex-1 border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10 font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-base transition-colors"
        >
          Report this scam
        </button>
        <button
          onClick={onNewAnalysis}
          className="flex-1 gradient-button text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
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
