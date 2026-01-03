import { useState } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import ImageUpload from '../ImageUpload'
import UrlInput from '../UrlInput'
import TextInput from '../TextInput'
import ResultCard from '../ResultCard'
import ReportModal from '../ReportModal'
import AnalyzingSteps from '../AnalyzingSteps'
import { API_ENDPOINTS } from '../../config'

function DetectorSection() {
  const [activeTab, setActiveTab] = useState('image')
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)
  const [text, setText] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation()
  const { ref: cardRef, isVisible: cardVisible } = useScrollAnimation()

  const handleImageUpload = async (file) => {
    setImage(file)
    setUrl(null)
    setText(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUrlAnalyze = async (urlToAnalyze) => {
    setUrl(urlToAnalyze)
    setImage(null)
    setText(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(API_ENDPOINTS.analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToAnalyze }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze URL')
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTextAnalyze = async (textContent) => {
    setText(textContent)
    setImage(null)
    setUrl(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(API_ENDPOINTS.analyzeText, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze text')
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewAnalysis = () => {
    setImage(null)
    setUrl(null)
    setText(null)
    setResult(null)
    setError(null)
  }

  const handleReportScam = () => {
    setShowReportModal(true)
  }

  const handleConfirmReport = async (userConsent) => {
    if ((!image && !url && !text) || !result) {
      alert('Error: Missing source or analysis data')
      return
    }
    setIsSubmittingReport(true)
    try {
      const formData = new FormData()
      if (image) {
        formData.append('image', image)
      } else if (url) {
        formData.append('source_type', 'url')
        formData.append('source_url', url)
      } else if (text) {
        formData.append('source_type', 'text')
        formData.append('source_text', text)
      }
      const analysisData = {
        classification: result.classification,
        content_type: result.content_type,
        scam_type: result.scam_type || 'Unknown',
        reasons: result.reasons || [],
        explanation: result.explanation || '',
        timestamp: new Date().toISOString()
      }
      formData.append('data', JSON.stringify(analysisData))
      formData.append('user_consent', userConsent.toString())
      const response = await fetch(API_ENDPOINTS.report, {
        method: 'POST',
        body: formData
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit report')
      }
      alert('Thank you for reporting! Your report has been submitted successfully.')
      setShowReportModal(false)
    } catch (err) {
      alert(`Error submitting report: ${err.message}`)
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const tabs = [
    { id: 'image', label: 'Image', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'url', label: 'URL', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
      </svg>
    )},
    { id: 'text', label: 'Text', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
  ]

  return (
    <section id="detector" className="py-20 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(270 70% 60% / 0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <div 
            ref={headerRef}
            className={`text-center mb-10 transition-all duration-700 ${
              headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">Analyze</span> Any Content
            </h2>
            <p className="text-muted-foreground text-lg">
              Paste, upload, or enter suspicious content to get instant AI analysis
            </p>
          </div>

          {!result && !loading && (
            <div 
              ref={cardRef}
              className={`bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 md:p-8 glow-effect gradient-border transition-all duration-700 delay-150 ${
                cardVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
              }`}
            >
              {/* Tabs */}
              <div className="flex bg-secondary rounded-xl p-1 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'gradient-button text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {activeTab === 'image' && <ImageUpload onUpload={handleImageUpload} />}
                {activeTab === 'url' && <UrlInput onAnalyze={handleUrlAnalyze} />}
                {activeTab === 'text' && <TextInput onAnalyze={handleTextAnalyze} loading={loading} />}
              </div>
            </div>
          )}

          {loading && <AnalyzingSteps type={activeTab} />}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 backdrop-blur-xl animate-fade-in">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={handleNewAnalysis}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {result && (
            <div className="animate-fade-in">
              <ResultCard
                result={result}
                onNewAnalysis={handleNewAnalysis}
                onReportScam={handleReportScam}
              />
            </div>
          )}
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={handleConfirmReport}
        isSubmitting={isSubmittingReport}
      />
    </section>
  )
}

export default DetectorSection
