import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import FloatingDiamond from '@/components/ui/FloatingDiamond'
import ResultCard from '@/components/ResultCard'

const DetectorPage = () => {
  const location = useLocation()
  const state = location.state as { result?: unknown; error?: string; activeTab?: string } | null

  const result = state?.result
  const error = state?.error

  useEffect(() => {
    if (!result && !error) {
      window.location.href = '/#detector'
    }
  }, [result, error])

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
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/90 z-10 relative">
        <button
          type="button"
          onClick={goToAnalyzer}
          className="flex items-center gap-2 text-foreground hover:text-foreground font-medium transition-colors py-2 px-3 rounded-lg hover:bg-secondary/50"
          aria-label="Back to analyzer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to analyzer</span>
        </button>
        <span className="text-sm text-foreground">Analysis</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 min-h-0 flex flex-col">
          <div className="max-w-4xl mx-auto flex-1 min-h-0 flex flex-col">
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
              <div className="animate-fade-in flex-1 min-h-0 flex flex-col">
                <ResultCard
                  result={result as Parameters<typeof ResultCard>[0]['result']}
                  onNewAnalysis={goToAnalyzer}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetectorPage
