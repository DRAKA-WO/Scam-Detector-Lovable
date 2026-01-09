import { useState, useEffect } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import ImageUpload from '../ImageUpload'
import UrlInput from '../UrlInput'
import TextInput from '../TextInput'
import ResultCard from '../ResultCard'
import ReportModal from '../ReportModal'
import SignupModal from '../SignupModal'
import AnalyzingSteps from '../AnalyzingSteps'
import { API_ENDPOINTS } from '../../config'
import { handleApiError, getUserFriendlyError } from '../../utils/errorHandler'
import { 
  getRemainingFreeChecks, 
  useFreeCheck, 
  isUserLoggedIn,
  getRemainingUserChecks,
  useUserCheck,
  updateUserStats
} from '../../utils/checkLimits'
// Supabase import removed - will be loaded dynamically to avoid build errors

function DetectorSection() {
  const [activeTab, setActiveTab] = useState('image')
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)
  const [text, setText] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [remainingChecks, setRemainingChecks] = useState(getRemainingFreeChecks())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState(null)

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation()
  const { ref: cardRef, isVisible: cardVisible } = useScrollAnimation()

  // Check authentication status on mount and when it changes
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isUserLoggedIn()
      console.log('🔐 Auth check on mount:', { loggedIn })
      setIsLoggedIn(loggedIn)
      
      if (loggedIn) {
        try {
          const { supabase } = await import('@/integrations/supabase/client')
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setUserId(session.user.id)
            const checks = getRemainingUserChecks(session.user.id)
            console.log('📊 User checks:', checks)
            setRemainingChecks(checks)
          }
        } catch (error) {
          console.error('Error getting user session:', error)
        }
      } else {
        const checks = getRemainingFreeChecks()
        console.log('📊 Initial remaining checks:', checks)
        setRemainingChecks(checks)
      }
    }
    
    checkAuth()
    
    // Listen for auth state changes - make Supabase optional
    let subscription = null
    const setupAuthListener = async () => {
      try {
        console.log('📦 Loading Supabase client...')
        const { supabase } = await import('@/integrations/supabase/client')
        console.log('✅ Supabase client loaded successfully')
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          const loggedIn = !!session
          console.log('🔐 Auth state changed:', { event: _event, loggedIn })
          setIsLoggedIn(loggedIn)
          if (session?.user) {
            setUserId(session.user.id)
            setShowSignupModal(false)
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
          } else {
            setUserId(null)
            const checks = getRemainingFreeChecks()
            console.log('📊 Remaining checks after logout:', checks)
            setRemainingChecks(checks)
          }
        })
        subscription = data
      } catch (error) {
        console.warn('Supabase not available, auth features disabled:', error)
      }
    }
    
    setupAuthListener()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Check if user can perform analysis
  const canPerformAnalysis = () => {
    if (isLoggedIn && userId) {
      const userChecks = getRemainingUserChecks(userId)
      return userChecks > 0
    }
    return remainingChecks > 0
  }

  // Show signup modal if needed
  const checkAndShowSignup = () => {
    // Debug logging
    console.log('🔍 checkAndShowSignup:', {
      isLoggedIn,
      userId,
      remainingChecks,
    })
    
    if (isLoggedIn && userId) {
      const userChecks = getRemainingUserChecks(userId)
      console.log('📊 User checks:', userChecks)
      if (userChecks === 0) {
        console.log('🚫 No user checks remaining - showing upgrade message')
        alert('You have no checks remaining. Please upgrade your account for more checks.')
        return false
      }
      console.log('✅ User has checks, allowing analysis')
      return true
    }
    
    // Anonymous user - check free checks
    const currentRemaining = getRemainingFreeChecks()
    console.log('📊 Current remaining free checks:', currentRemaining)
    
    // If no checks remaining, show modal and block
    if (currentRemaining === 0) {
      console.log('🚫 No checks remaining, showing signup modal')
      setShowSignupModal(true)
      setRemainingChecks(0) // Sync state
      return false
    }
    
    console.log('✅ Checks available, allowing analysis')
    return true
  }

  // Handle signup/login
  const handleSignup = async (method) => {
    try {
      if (method === 'google') {
        // Google OAuth signup - load Supabase dynamically
        try {
          const { supabase } = await import('@/integrations/supabase/client')
          
          // Check if Supabase is properly configured
          if (!supabase) {
            throw new Error('Supabase client not initialized')
          }
          
          const { error, data } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          })
          
          if (error) {
            console.error('Supabase OAuth error:', error)
            // Check for specific error types
            if (error.message?.includes('provider is not enabled') || 
                error.message?.includes('Unsupported provider')) {
              alert('Google signup is not enabled yet. Please enable Google OAuth in your Supabase project settings, or use email signup instead.')
            } else {
              alert(`Signup error: ${error.message || 'Please try again later.'}`)
            }
            return
          }
          
          // If successful, the redirect will happen automatically
          console.log('OAuth redirect initiated:', data)
        } catch (supabaseError) {
          console.error('Supabase error:', supabaseError)
          // Check if it's a configuration error
          if (supabaseError.message?.includes('provider is not enabled') ||
              supabaseError.message?.includes('Unsupported provider')) {
            alert('Google signup is not configured. Please enable Google OAuth in Supabase project settings.\n\nFor now, you can continue using free checks or contact support.')
          } else if (supabaseError.message?.includes('VITE_SUPABASE')) {
            alert('Authentication is not configured. Please set up Supabase environment variables.\n\nYou can continue using free checks for now.')
          } else {
            alert('Google signup is temporarily unavailable. Please try again later or use email signup.')
          }
        }
      } else if (method === 'email') {
        // TODO: Show email signup form or redirect to signup page
        alert('Email signup coming soon! For now, you can continue using your free checks.')
      } else if (method === 'login') {
        // TODO: Show login form or redirect to login page
        alert('Login page coming soon! For now, you can continue using your free checks.')
      }
    } catch (error) {
      console.error('Signup error:', error)
      alert('An unexpected error occurred. Please try again or contact support.')
    }
  }

  const handleImageUpload = async (file) => {
    console.log('📸 handleImageUpload called')
    // Check BEFORE using check - if no checks remaining, show modal and block
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setImage(file)
    setUrl(null)
    setText(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      // Use a check (user check if logged in, free check if not)
      if (isLoggedIn && userId) {
        const before = getRemainingUserChecks(userId)
        console.log(`💳 Before using user check: ${before}`)
        useUserCheck(userId)
        const after = getRemainingUserChecks(userId)
        console.log(`💳 After using user check: ${after}`)
        setRemainingChecks(after)
      } else {
        const before = getRemainingFreeChecks()
        console.log(`💳 Before using free check: ${before}`)
        useFreeCheck()
        const after = getRemainingFreeChecks()
        console.log(`💳 After using free check: ${after}`)
        setRemainingChecks(after)
      }

      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'image')
        throw new Error(errorMessage)
      }
      const data = await response.json()
      setResult(data)
      
      // Update user stats if logged in
      if (isLoggedIn && userId && data) {
        const resultType = data.type === 'scam' ? 'scam' : data.type === 'safe' ? 'safe' : 'suspicious'
        updateUserStats(userId, resultType)
      }
    } catch (err) {
      setError(getUserFriendlyError(err.message, 'image'))
    } finally {
      setLoading(false)
    }
  }

  const handleUrlAnalyze = async (urlToAnalyze) => {
    console.log('🔗 handleUrlAnalyze called')
    // Check BEFORE using check - if no checks remaining, show modal and block
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setUrl(urlToAnalyze)
    setImage(null)
    setText(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      // Use a check (user check if logged in, free check if not)
      if (isLoggedIn && userId) {
        const before = getRemainingUserChecks(userId)
        console.log(`💳 Before using user check: ${before}`)
        useUserCheck(userId)
        const after = getRemainingUserChecks(userId)
        console.log(`💳 After using user check: ${after}`)
        setRemainingChecks(after)
      } else {
        const before = getRemainingFreeChecks()
        console.log(`💳 Before using free check: ${before}`)
        useFreeCheck()
        const after = getRemainingFreeChecks()
        console.log(`💳 After using free check: ${after}`)
        setRemainingChecks(after)
      }

      const response = await fetch(API_ENDPOINTS.analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToAnalyze }),
      })
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'url')
        throw new Error(errorMessage)
      }
      const data = await response.json()
      setResult(data)
      
      // Update user stats if logged in
      if (isLoggedIn && userId && data) {
        const resultType = data.type === 'scam' ? 'scam' : data.type === 'safe' ? 'safe' : 'suspicious'
        updateUserStats(userId, resultType)
      }
    } catch (err) {
      setError(getUserFriendlyError(err.message, 'url'))
    } finally {
      setLoading(false)
    }
  }

  const handleTextAnalyze = async (textContent) => {
    console.log('📝 handleTextAnalyze called')
    // Check BEFORE using check - if no checks remaining, show modal and block
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setText(textContent)
    setImage(null)
    setUrl(null)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      // Use a check (user check if logged in, free check if not)
      if (isLoggedIn && userId) {
        const before = getRemainingUserChecks(userId)
        console.log(`💳 Before using user check: ${before}`)
        useUserCheck(userId)
        const after = getRemainingUserChecks(userId)
        console.log(`💳 After using user check: ${after}`)
        setRemainingChecks(after)
      } else {
        const before = getRemainingFreeChecks()
        console.log(`💳 Before using free check: ${before}`)
        useFreeCheck()
        const after = getRemainingFreeChecks()
        console.log(`💳 After using free check: ${after}`)
        setRemainingChecks(after)
      }

      const response = await fetch(API_ENDPOINTS.analyzeText, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent }),
      })
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'text')
        throw new Error(errorMessage)
      }
      const data = await response.json()
      setResult(data)
      
      // Update user stats if logged in
      if (isLoggedIn && userId && data) {
        const resultType = data.type === 'scam' ? 'scam' : data.type === 'safe' ? 'safe' : 'suspicious'
        updateUserStats(userId, resultType)
      }
    } catch (err) {
      setError(getUserFriendlyError(err.message, 'text'))
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
        const errorMessage = await handleApiError(response, 'report')
        throw new Error(errorMessage)
      }
      alert('Thank you for reporting! Your report has been submitted successfully.')
      setShowReportModal(false)
    } catch (err) {
      alert(getUserFriendlyError(err.message, 'report'))
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

          {/* Show remaining checks banner */}
          {(!isLoggedIn || (isLoggedIn && remainingChecks > 0)) && (
            <div className={`rounded-xl p-4 mb-6 animate-fade-in border ${
              remainingChecks === 0 
                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 dark:border-orange-400/30' 
                : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 dark:border-blue-400/30'
            }`}>
              <p className={`text-center text-sm font-medium ${
                remainingChecks === 0 
                  ? 'text-orange-700 dark:text-orange-300' 
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                <strong>
                  {isLoggedIn ? 'Your checks remaining: ' : 'Free checks remaining: '}
                  {remainingChecks}
                </strong>
                {remainingChecks === 0 && !isLoggedIn && (
                  <span className="ml-2 block mt-1 text-xs opacity-90">
                    Sign up to continue analyzing
                  </span>
                )}
                {remainingChecks === 0 && isLoggedIn && (
                  <span className="ml-2 block mt-1 text-xs opacity-90">
                    Upgrade for more checks
                  </span>
                )}
              </p>
            </div>
          )}

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

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={handleSignup}
        remainingChecks={remainingChecks}
      />
    </section>
  )
}

export default DetectorSection
