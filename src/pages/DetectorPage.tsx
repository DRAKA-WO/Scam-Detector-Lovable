import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FloatingDiamond from '@/components/ui/FloatingDiamond'
import Header from '@/components/landing/Header'
import ResultCard from '@/components/ResultCard'
import AnalyzingSteps from '@/components/AnalyzingSteps'

const LAST_SAVED_SCAN_KEY = 'lastSavedScan'

const DetectorPage = () => {
  const location = useLocation()
  const state = location.state as { result?: unknown; error?: string; activeTab?: string; analyzing?: boolean } | null

  const result = state?.result
  const error = state?.error
  const analyzing = state?.analyzing === true
  const activeTab = state?.activeTab ?? 'image'
  // For scam results from a fresh scan: pass scan id so "Learn more" updates the same row instead of creating a new one
  const [lastSavedScanId, setLastSavedScanId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!result && !error && !analyzing) {
      window.location.href = '/#detector'
    }
  }, [result, error, analyzing])

  useEffect(() => {
    if (!result || typeof window === 'undefined') return
    const readSavedScanId = () => {
      try {
        const raw = sessionStorage.getItem(LAST_SAVED_SCAN_KEY)
        if (raw) {
          const scan = JSON.parse(raw) as { id?: string; classification?: string }
          if (scan?.id && scan?.classification === 'scam') setLastSavedScanId(scan.id)
        }
      } catch {
        // ignore
      }
    }
    readSavedScanId()
    window.addEventListener('scanSaved', readSavedScanId)
    return () => window.removeEventListener('scanSaved', readSavedScanId)
  }, [result])

  useEffect(() => {
    if (!result && !error && !analyzing) return
    window.scrollTo(0, 0)
  }, [result, error, analyzing])

  const goToAnalyzer = () => {
    window.location.href = '/#detector'
  }

  if (!result && !error && !analyzing) {
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-1 flex-col justify-center">
          <div className="max-w-5xl mx-auto flex flex-col w-full">
            {analyzing && !result && !error && (
              <div className="animate-fade-in flex flex-col">
                <AnalyzingSteps type={activeTab} />
              </div>
            )}
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
                  scanId={lastSavedScanId}
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
