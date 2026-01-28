import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import FloatingDiamond from '@/components/ui/FloatingDiamond'
import Header from '@/components/landing/Header'
import ResultCard from '@/components/ResultCard'

const DetectorPage = () => {
  const location = useLocation()
  const state = location.state as { result?: unknown; error?: string; activeTab?: string } | null

  const result = state?.result
  const error = state?.error
  const [showScrollHint, setShowScrollHint] = useState(true)
  const hasScrolledDown = useRef(false)

  useEffect(() => {
    if (!result && !error) {
      window.location.href = '/#detector'
    }
  }, [result, error])

  // Start at top when result/error is shown (arrow stays visible until user scrolls)
  useEffect(() => {
    if (!result && !error) return
    window.scrollTo(0, 0)
  }, [result, error])

  // Hide scroll-down arrow once user scrolls — disappears forever for this page view
  useEffect(() => {
    const handleScroll = () => {
      if (hasScrolledDown.current) return
      if (window.scrollY >= 60) {
        hasScrolledDown.current = true
        setShowScrollHint(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const goToAnalyzer = () => {
    window.location.href = '/#detector'
  }

  if (!result && !error) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      {/* Effects on sides (same as main page) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingDiamond className="top-20 left-[8%]" delay={0} size="md" />
        <FloatingDiamond className="top-32 right-[10%]" delay={0.6} size="lg" />
        <FloatingDiamond className="bottom-28 left-[12%]" delay={1.2} size="sm" />
        <FloatingDiamond className="bottom-20 right-[15%]" delay={1.8} size="md" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(270 70% 60% / 0.3) 0%, transparent 70%)',
          }}
        />
      </div>
      <Header backToAnalyzerOnClick={goToAnalyzer} />
      <div className="flex-1 flex flex-col relative z-10 min-h-0 pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
          <div className="max-w-5xl mx-auto flex flex-col w-full">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 backdrop-blur-xl animate-fade-in">
                <p className="text-destructive whitespace-pre-line">{error}</p>
                <button
                  type="button"
                  onClick={goToAnalyzer}
                  className="mt-4 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition-colors"
                >
                  Back to analyzer
                </button>
              </div>
            )}
            {result && (
              <div className="animate-fade-in flex flex-col">
                <ResultCard
                  result={result as Parameters<typeof ResultCard>[0]['result']}
                  onNewAnalysis={goToAnalyzer}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated scroll-down hint (double chevron, glowing) — disappears forever once user scrolls */}
      {showScrollHint && (result || error) && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-300"
          aria-hidden
          style={{
            filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.8)) drop-shadow(0 0 24px hsl(var(--primary) / 0.5))',
          }}
        >
          <div className="animate-bounce">
            <svg className="w-9 h-9 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetectorPage
