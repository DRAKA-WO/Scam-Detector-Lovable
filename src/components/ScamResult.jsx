import { useState, useCallback, useEffect } from 'react'
import getScamNextSteps from '../utils/scamNextSteps'
import { API_ENDPOINTS } from '../config'

function CategoryIcon({ category, className = 'w-16 h-16' }) {
  const c = category || 'generic'
  const base = 'flex-shrink-0 text-red-500'
  if (c === 'phishing') {
    return (
      <svg className={`${className} ${base}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  }
  if (c === 'impersonation') {
    return (
      <svg className={`${className} ${base}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  if (c === 'fake_product') {
    return (
      <svg className={`${className} ${base}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  }
  if (c === 'credential') {
    return (
      <svg className={`${className} ${base}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  }
  return (
    <svg className={`${className} ${base}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function ScamResult({ result, onNewAnalysis }) {
  const { reasons, explanation, scam_type, next_steps } = result
  const [showLearnMoreView, setShowLearnMoreView] = useState(false)
  const [learnMoreData, setLearnMoreData] = useState(null)
  const [learnMoreLoading, setLearnMoreLoading] = useState(false)
  const [learnMoreError, setLearnMoreError] = useState(null)
  const [learnMoreRevealed, setLearnMoreRevealed] = useState(false)

  const handleLearnMore = useCallback(async () => {
    if (!scam_type) return
    setShowLearnMoreView(true)
    setLearnMoreRevealed(false)
    if (learnMoreData) {
      setLearnMoreRevealed(true)
      return
    }
    setLearnMoreError(null)
    setLearnMoreLoading(true)
    try {
      const res = await fetch(API_ENDPOINTS.learnMore, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scam_type,
          reasons: reasons || [],
          explanation: explanation || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setLearnMoreData(data)
      setTimeout(() => setLearnMoreRevealed(true), 100)
    } catch (e) {
      setLearnMoreError(e.message || 'Could not load learn more content.')
    } finally {
      setLearnMoreLoading(false)
    }
  }, [scam_type, reasons, explanation, learnMoreData])

  useEffect(() => {
    if (!showLearnMoreView) setLearnMoreRevealed(false)
  }, [showLearnMoreView])

  const nextSteps = next_steps && next_steps.length > 0 ? next_steps : getScamNextSteps(scam_type)

  const cardClassName = 'bg-card backdrop-blur-xl rounded-xl sm:rounded-2xl border border-border glow-effect animate-fade-in'

  if (showLearnMoreView) {
    return (
      <div className={`${cardClassName} flex flex-col h-full min-h-0 text-sm sm:text-base`}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Learn more about this scam</h2>
          <button
            type="button"
            onClick={() => setShowLearnMoreView(false)}
            className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Back to results"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {learnMoreLoading && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400 text-sm sm:text-base">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading...</p>
            </div>
          )}
          {learnMoreError && !learnMoreLoading && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                {learnMoreError}
              </div>
              <button
                type="button"
                onClick={() => setShowLearnMoreView(false)}
                className="border-2 border-border text-foreground hover:bg-white/10 font-medium py-2.5 px-4 rounded-xl transition-colors"
              >
                Back to results
              </button>
            </div>
          )}
          {learnMoreData && !learnMoreLoading && (
            <>
              <div className="flex gap-4 mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-red-500/10 border border-red-500/30 flex-shrink-0">
                  <CategoryIcon category={learnMoreData.icon_category} className="w-12 h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg leading-tight mb-2">{learnMoreData.title}</h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{learnMoreData.short_description}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Here’s how it works and how to stay safe.</p>
              {learnMoreData.how_it_works && learnMoreData.how_it_works.length > 0 && (
                <section className="mb-6">
                  <h4 className="font-semibold text-white text-base mb-2 flex items-center gap-2">
                    <span className="w-1 h-5 bg-red-500 rounded-full" />
                    How it works
                  </h4>
                  <ul className="space-y-2.5">
                    {learnMoreData.how_it_works.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-400 text-sm sm:text-base leading-relaxed transition-all duration-300 ease-out"
                        style={{
                          opacity: learnMoreRevealed ? 1 : 0,
                          transform: learnMoreRevealed ? 'translateY(0)' : 'translateY(0.5rem)',
                          transitionDelay: `${i * 80}ms`,
                        }}
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {learnMoreData.prevention_tips && learnMoreData.prevention_tips.length > 0 && (
                <section className="mb-6">
                  <h4 className="font-semibold text-white text-base mb-2 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full" />
                    How to stay safe
                  </h4>
                  <ul className="space-y-2.5">
                    {learnMoreData.prevention_tips.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-400 text-sm sm:text-base leading-relaxed transition-all duration-300 ease-out"
                        style={{
                          opacity: learnMoreRevealed ? 1 : 0,
                          transform: learnMoreRevealed ? 'translateY(0)' : 'translateY(0.5rem)',
                          transitionDelay: `${(learnMoreData.how_it_works?.length || 0) * 80 + 120 + i * 80}ms`,
                        }}
                      >
                        <span className="flex-shrink-0 text-green-500 mt-0.5">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <p className="text-sm text-gray-500 mb-5 pt-4 border-t border-border">
                You’re now better prepared to spot this type of scam.
              </p>
            </>
          )}
        </div>
        <div className="p-4 sm:p-6 border-t border-border bg-white/5 flex-shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setShowLearnMoreView(false)}
            className="flex-1 border-2 border-border text-foreground hover:bg-white/10 font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg sm:rounded-xl text-sm sm:text-base transition-colors"
          >
            Back to results
          </button>
          <button
            type="button"
            onClick={onNewAnalysis}
            className="flex-1 gradient-button text-primary-foreground font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg sm:rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            Start New Analysis
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardClassName} flex flex-col h-full min-h-0 text-sm sm:text-base`}>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 md:p-9">
        {/* Scam Banner */}
        <div className="bg-red-500/20 border border-red-500/40 rounded-lg sm:rounded-xl p-3.5 sm:p-4 mb-4 sm:mb-6 flex items-center gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p className="text-white font-bold text-base sm:text-lg">This looks like a scam</p>
      </div>

      {/* Scam Indicators */}
      <div className={`space-y-4 sm:space-y-6 mb-4 sm:mb-6 ${reasons.length < 3 ? 'flex flex-col items-center' : ''}`}>
        {reasons.slice(0, 3).map((reason, index) => {
          const parts = reason.split(':')
          let heading = parts.length > 1 ? parts[0].trim() : `Scam Indicator ${index + 1}`
          let description = parts.length > 1 ? parts.slice(1).join(':').trim() : reason
          if (heading.length > 25) heading = heading.substring(0, 22) + '...'
          if (description.length > 185) description = description.substring(0, 182) + '...'
          return (
            <div key={index} className={`flex gap-4 ${reasons.length < 3 ? 'w-full max-w-2xl' : ''}`}>
              <div className="w-1 bg-red-500 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-1.5">{heading}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {scam_type && (
        <div className="mb-4 sm:mb-6 border-t border-border pt-4 sm:pt-6">
          <div className="mb-3">
            <h3 className="font-semibold text-white text-sm sm:text-base mb-1.5 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Type of Scam: {scam_type}
            </h3>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <h4 className="font-semibold text-white text-sm sm:text-base mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What to Do Next
            </h4>
            <ol className="space-y-1.5 sm:space-y-2 list-decimal list-inside">
              {nextSteps.map((step, index) => (
                <li key={index} className="text-gray-400 text-sm leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 border-t border-gray-700 pt-4 sm:pt-6">
          Remember: Scam Checker is a free tool to be used alongside your own research and best judgement.
        </p>
      </div>

      <div className="flex-shrink-0 p-5 sm:p-7 md:p-9 pt-0 border-t border-border bg-card/50">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {scam_type && (
            <button
              onClick={handleLearnMore}
            className="flex-1 border-2 border-amber-500/60 text-amber-400 hover:bg-amber-500/10 font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg sm:rounded-xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Learn more about this scam
          </button>
        )}
        <button
          onClick={onNewAnalysis}
          className="flex-1 gradient-button text-primary-foreground font-medium py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg sm:rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        >
          Start New Analysis
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        </div>
      </div>
    </div>
  )
}

export default ScamResult
