import { useState, useEffect } from 'react'

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

function LearnMoreModal({ isOpen, onClose, data, isLoading, error }) {
  const [revealed, setRevealed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRevealed(false)
      const t1 = setTimeout(() => setMounted(true), 10)
      const t2 = setTimeout(() => setRevealed(true), 120)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else {
      setMounted(false)
    }
  }, [isOpen, data])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-card border border-border rounded-xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-border relative">
          <h2 className="text-lg font-bold text-white pr-8">Learn more about this scam</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {data && !isLoading && (
            <>
              <div className="flex gap-4 mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-red-500/10 border border-red-500/30">
                  <CategoryIcon category={data.icon_category} className="w-12 h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg leading-tight mb-2">{data.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{data.short_description}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">Here’s how it works and how to stay safe.</p>

              {data.how_it_works && data.how_it_works.length > 0 && (
                <section className="mb-6">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-red-500 rounded-full" />
                    How it works
                  </h4>
                  <ul className="space-y-2">
                    {data.how_it_works.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-400 text-sm leading-relaxed transition-all duration-300 ease-out"
                        style={{
                          opacity: revealed ? 1 : 0,
                          transform: revealed ? 'translateY(0)' : 'translateY(0.5rem)',
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

              {data.prevention_tips && data.prevention_tips.length > 0 && (
                <section>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full" />
                    How to stay safe
                  </h4>
                  <ul className="space-y-2">
                    {data.prevention_tips.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-400 text-sm leading-relaxed transition-all duration-300 ease-out"
                        style={{
                          opacity: revealed ? 1 : 0,
                          transform: revealed ? 'translateY(0)' : 'translateY(0.5rem)',
                          transitionDelay: `${(data.how_it_works?.length || 0) * 80 + 120 + i * 80}ms`,
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

              <p className="text-sm text-gray-500 mt-6 pt-4 border-t border-border">
                You’re now better prepared to spot this type of scam.
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 gradient-button text-primary-foreground font-medium rounded-lg sm:rounded-xl transition-all hover:scale-[1.02]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default LearnMoreModal
