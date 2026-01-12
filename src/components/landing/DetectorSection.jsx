import { useState, useEffect } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import ImageUpload from '../ImageUpload'
import UrlInput from '../UrlInput'
import TextInput from '../TextInput'
import ResultCard from '../ResultCard'
import ReportModal from '../ReportModal'
import SignupModal from '../SignupModal'
import LoginModal from '../LoginModal'
import BlurredResultPreview from '../BlurredResultPreview'
import AnalyzingSteps from '../AnalyzingSteps'
import OutOfChecksModal from '../OutOfChecksModal'
import { API_ENDPOINTS } from '../../config'
import { handleApiError, getUserFriendlyError } from '../../utils/errorHandler'
import { 
  getRemainingFreeChecks, 
  useFreeCheck, 
  isUserLoggedIn,
  getRemainingUserChecks,
  useUserCheck
} from '../../utils/checkLimits'
import { saveScanToHistory, uploadScanImage } from '../../utils/scanHistory'
// Supabase import removed - will be loaded dynamically to avoid build errors

const PENDING_SCAN_KEY = 'scam_checker_pending_scan'

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
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [remainingChecks, setRemainingChecks] = useState(getRemainingFreeChecks())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showBlurredPreview, setShowBlurredPreview] = useState(false)
  const [showOutOfChecksModal, setShowOutOfChecksModal] = useState(false)

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
            const { getRemainingUserChecks, initializeUserChecks } = await import('../../utils/checkLimits')
            
            // Check if user has ever been initialized
            const checksInitializedKey = `checks_initialized_${session.user.id}`;
            const hasBeenInitialized = localStorage.getItem(checksInitializedKey) === 'true';
            
            if (!hasBeenInitialized) {
              // First time - give 5 checks
              console.log('🆕 First-time user on mount - giving 5 checks');
              await initializeUserChecks(session.user.id, true);
              localStorage.setItem(checksInitializedKey, 'true');
            }
            
            const checks = getRemainingUserChecks(session.user.id)
            console.log('📊 User checks:', checks)
            setRemainingChecks(checks)
          }
        } catch (error) {
          console.error('Error getting user session:', error)
          // Fallback to free checks if there's an error
          const checks = getRemainingFreeChecks()
          setRemainingChecks(checks)
        }
      } else {
        // Anonymous user - always use free checks
        const checks = getRemainingFreeChecks()
        console.log('📊 Anonymous user - initial remaining free checks:', checks)
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
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          const loggedIn = !!session
          console.log('🔐 Auth state changed:', { event: _event, loggedIn })
          setIsLoggedIn(loggedIn)
          if (session?.user) {
            setUserId(session.user.id)
            setShowSignupModal(false)
            setShowBlurredPreview(false) // Hide blurred preview on login
            
            const { getRemainingUserChecks, initializeUserChecks } = await import('../../utils/checkLimits')
            
            // Check if user has ever been initialized
            const checksInitializedKey = `checks_initialized_${session.user.id}`;
            const hasBeenInitialized = localStorage.getItem(checksInitializedKey) === 'true';
            
            if (!hasBeenInitialized) {
              // First time - give 5 checks
              console.log('🆕 First-time user on auth change - giving 5 checks');
              await initializeUserChecks(session.user.id, true);
              localStorage.setItem(checksInitializedKey, 'true');
            }
            
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
            
            // NOTE: Pending scan handling is now in App.tsx OAuthCallback
            // This ensures it runs even when redirecting to dashboard
          } else {
            setUserId(null)
            // When logged out, switch back to free checks
            const checks = getRemainingFreeChecks()
            console.log('📊 Remaining free checks after logout:', checks)
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

  // Helper to store pending scan for later conversion
  const storePendingScan = async (scanType, imageFile, imageUrl, contentPreview, classification, analysisResult) => {
    try {
      let imageData = null;
      let imageName = null;
      
      // Convert image file to base64 so it survives OAuth redirect
      if (imageFile) {
        console.log('📸 Converting image to base64 for storage...');
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageName = imageFile.name;
        console.log('✅ Image converted to base64, size:', imageData.length, 'bytes');
      }
      
      const pendingScan = {
        scanType,
        imageData, // Base64 string instead of blob URL
        imageName, // Original filename
        imageUrl,
        contentPreview,
        classification,
        analysisResult,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(PENDING_SCAN_KEY, JSON.stringify(pendingScan));
      console.log('✅ Successfully stored pending scan:', { scanType, classification, hasImageData: !!imageData });
      console.log('📦 Full pending scan data (image truncated):', { ...pendingScan, imageData: imageData ? `base64 (${imageData.length} chars)` : null });
      
      // Verify it was stored
      const stored = localStorage.getItem(PENDING_SCAN_KEY);
      if (stored) {
        console.log('✅ Verified: Pending scan is in localStorage');
      } else {
        console.error('❌ ERROR: Pending scan was NOT stored in localStorage!');
      }
    } catch (error) {
      console.error('❌ Failed to store pending scan:', error);
      console.error('Error details:', error.message);
    }
  };

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
    
    // IMPORTANT: Only check user checks if we're actually logged in AND have a userId
    // Double-check login status to avoid false positives
    if (isLoggedIn && userId) {
      const userChecks = getRemainingUserChecks(userId)
      console.log('📊 User checks:', userChecks)
      if (userChecks === 0) {
        console.log('🚫 No user checks remaining - showing upgrade modal')
        setShowOutOfChecksModal(true)
        return false
      }
      console.log('✅ User has checks, allowing analysis')
      return true
    }
    
    // Anonymous user - ALWAYS check free checks (not affected by login state)
    // This ensures anonymous users always get 2 free checks
    const currentRemaining = getRemainingFreeChecks()
    console.log('📊 Anonymous user - remaining free checks:', currentRemaining)
    
    // If no checks remaining, show modal and block
    if (currentRemaining === 0) {
      console.log('🚫 No free checks remaining, showing signup modal')
      setShowSignupModal(true)
      setRemainingChecks(0) // Sync state
      return false
    }
    
    console.log('✅ Free checks available, allowing analysis')
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
        await useUserCheck(userId)
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
      
      // Check if this was the last free check for anonymous user
      const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
      const isLastFreeCheck = !isLoggedIn && checksAfter === 0
      
      console.log('🔍 After image analysis:', { isLoggedIn, checksAfter, isLastFreeCheck });
      
      if (isLastFreeCheck) {
        console.log('🎯 LAST FREE CHECK DETECTED - Storing pending scan and showing preview');
        
        // Store this scan for after signup (await since it's async now)
        await storePendingScan('image', file, null, null, data.classification, data)
        
        // Show blurred preview and signup modal
        setResult(data)
        setShowBlurredPreview(true)
        setShowSignupModal(true)
        console.log('✅ Blurred preview and signup modal should now be visible');
      } else {
        console.log('ℹ️ Normal flow - not last free check');
        // Normal flow - show full result
        setResult(data)
        
        // Save to history if logged in (stats will be auto-incremented)
        if (isLoggedIn && userId && data) {
          try {
            // Upload image to Supabase Storage
            const imageUrl = await uploadScanImage(file, userId)
            
            // Save scan to history (stats auto-incremented in Supabase)
            await saveScanToHistory(
              userId,
              'image',
              imageUrl,
              null, // No content preview for images
              data.classification,
              data
            )
          } catch (error) {
            console.error('Error saving scan to history:', error)
            // Don't block the user if history save fails
          }
        }
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
        await useUserCheck(userId)
        const after = getRemainingUserChecks(userId)
        console.log(`💳 After using user check: ${after}`)
        setRemainingChecks(after)
        // Notify header to update
        window.dispatchEvent(new Event('checksUpdated'))
      } else {
        const before = getRemainingFreeChecks()
        console.log(`💳 Before using free check: ${before}`)
        useFreeCheck()
        const after = getRemainingFreeChecks()
        console.log(`💳 After using free check: ${after}`)
        setRemainingChecks(after)
        // Notify header to update
        window.dispatchEvent(new Event('checksUpdated'))
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
      
      // Check if this was the last free check for anonymous user
      const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
      const isLastFreeCheck = !isLoggedIn && checksAfter === 0
      
      if (isLastFreeCheck) {
        // Create preview for storage
        const contentPreview = urlToAnalyze.length > 200 ? urlToAnalyze.substring(0, 200) + '...' : urlToAnalyze
        
        // Store this scan for after signup (await since it's async now)
        await storePendingScan('url', null, null, contentPreview, data.classification, data)
        
        // Show blurred preview and signup modal
        setResult(data)
        setShowBlurredPreview(true)
        setShowSignupModal(true)
        console.log('🎯 Last free check used - showing blurred preview and signup modal')
      } else {
        // Normal flow - show full result
        setResult(data)
        
        // Save to history if logged in (stats will be auto-incremented)
        if (isLoggedIn && userId && data) {
          try {
            // Create preview (first 200 chars of URL)
            const contentPreview = urlToAnalyze.length > 200 ? urlToAnalyze.substring(0, 200) + '...' : urlToAnalyze
            
            // Save scan to history (stats auto-incremented in Supabase)
            await saveScanToHistory(
              userId,
              'url',
              null, // No image for URL scans
              contentPreview,
              data.classification,
              data
            )
          } catch (error) {
            console.error('Error saving scan to history:', error)
            // Don't block the user if history save fails
          }
        }
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
        await useUserCheck(userId)
        const after = getRemainingUserChecks(userId)
        console.log(`💳 After using user check: ${after}`)
        setRemainingChecks(after)
        // Notify header to update
        window.dispatchEvent(new Event('checksUpdated'))
      } else {
        const before = getRemainingFreeChecks()
        console.log(`💳 Before using free check: ${before}`)
        useFreeCheck()
        const after = getRemainingFreeChecks()
        console.log(`💳 After using free check: ${after}`)
        setRemainingChecks(after)
        // Notify header to update
        window.dispatchEvent(new Event('checksUpdated'))
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
      
      // Check if this was the last free check for anonymous user
      const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
      const isLastFreeCheck = !isLoggedIn && checksAfter === 0
      
      if (isLastFreeCheck) {
        // Create preview for storage
        const contentPreview = textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent
        
        // Store this scan for after signup (await since it's async now)
        await storePendingScan('text', null, null, contentPreview, data.classification, data)
        
        // Show blurred preview and signup modal
        setResult(data)
        setShowBlurredPreview(true)
        setShowSignupModal(true)
        console.log('🎯 Last free check used - showing blurred preview and signup modal')
      } else {
        // Normal flow - show full result
        setResult(data)
        
        // Save to history if logged in (stats will be auto-incremented)
        if (isLoggedIn && userId && data) {
          try {
            // Create preview (first 200 chars of text)
            const contentPreview = textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent
            
            // Save scan to history (stats auto-incremented in Supabase)
            await saveScanToHistory(
              userId,
              'text',
              null, // No image for text scans
              contentPreview,
              data.classification,
              data
            )
          } catch (error) {
            console.error('Error saving scan to history:', error)
            // Don't block the user if history save fails
          }
        }
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
    setShowBlurredPreview(false)
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
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {result && !showBlurredPreview && (
            <div className="animate-fade-in">
              <ResultCard
                result={result}
                onNewAnalysis={handleNewAnalysis}
                onReportScam={handleReportScam}
              />
            </div>
          )}

          {showBlurredPreview && result && (
            <div className="animate-fade-in">
              <BlurredResultPreview
                classification={result.classification}
                onSignup={() => setShowSignupModal(true)}
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
        onSwitchToLogin={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
        remainingChecks={remainingChecks}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={async (method) => {
          // This is handled inside LoginModal
        }}
        onSwitchToSignup={() => {
          setShowLoginModal(false)
          setShowSignupModal(true)
        }}
      />

      <OutOfChecksModal
        isOpen={showOutOfChecksModal}
        onClose={() => setShowOutOfChecksModal(false)}
      />
    </section>
  )
}

export default DetectorSection
