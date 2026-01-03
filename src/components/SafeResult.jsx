function SafeResult({ result, onNewAnalysis }) {
  const { reasons, explanation } = result

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-6 md:p-8 glow-effect">
      {/* Safe Banner */}
      <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-foreground font-bold text-lg">This looks safe</p>
      </div>

      {/* Verification Steps */}
      <div className={`space-y-6 mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : 'Verification Step'
          let description = parts.length > 1 ? parts.slice(1).join(':').trim() : reason
          
          if (heading.length > 25) {
            heading = heading.substring(0, 22) + '...'
          }
          
          if (description.length > 185) {
            description = description.substring(0, 182) + '...'
          }
          
          return (
            <div key={index} className={`flex gap-4 ${reasons.length < 3 ? 'w-full max-w-2xl' : ''}`}>
              <div className="w-1 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">{heading}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-muted-foreground mb-6 border-t border-border pt-6">
        Remember: Scam Checker is a free tool to be used alongside your own research and best judgement.
      </p>

      {/* Action Button */}
      <button
        onClick={onNewAnalysis}
        className="w-full gradient-button text-primary-foreground font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
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
