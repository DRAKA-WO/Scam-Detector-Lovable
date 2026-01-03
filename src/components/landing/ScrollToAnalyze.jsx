import { useState, useEffect } from 'react'

function ScrollToAnalyze() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      const detectorSection = document.getElementById('detector')
      if (detectorSection) {
        const rect = detectorSection.getBoundingClientRect()
        // Show button when bottom of detector section passes viewport top
        setIsVisible(rect.bottom < window.innerHeight * 0.3)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToAnalyze = () => {
    document.getElementById('detector')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToAnalyze}
      className={`fixed bottom-6 right-6 z-50 gradient-button text-primary-foreground px-5 py-3 rounded-full font-semibold shadow-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="Go to Analyze section"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
      </svg>
      Analyze
    </button>
  )
}

export default ScrollToAnalyze
