import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import FloatingDiamond from "../ui/FloatingDiamond"
import Header from '../landing/Header'
import ImageUpload from '../ImageUpload'
import UrlInput from '../UrlInput'
import TextInput from '../TextInput'
import ResultCard from '../ResultCard'
import LoginModal from '../LoginModal'
import SignupModal from '../SignupModal'
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
  useUserCheck,
  refundFreeCheck,
  refundUserCheck
} from '../../utils/checkLimits'
import { saveScanToHistory, uploadScanImage } from '../../utils/scanHistory'
// Supabase import removed - will be loaded dynamically to avoid build errors

const PENDING_SCAN_KEY = 'scam_checker_pending_scan'
const ANALYSIS_TIMEOUT_MS = 20000 // Show timeout message and refund if analysis takes longer
const ANALYSIS_TIMEOUT_MESSAGE = "It seems like it's taking so much longer.\n\n✅ Your check has been refunded. You can try again."

function DetectorSection() {
  const [activeTab, setActiveTab] = useState('image')
  const [image, setImage] = useState(null)
  const [url, setUrl] = useState(null)
  const [text, setText] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [remainingChecks, setRemainingChecks] = useState(getRemainingFreeChecks())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showBlurredPreview, setShowBlurredPreview] = useState(false)
  const [showOutOfChecksModal, setShowOutOfChecksModal] = useState(false)

  const navigate = useNavigate()
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation()
  const { ref: cardRef, isVisible: cardVisible } = useScrollAnimation()
  const resultSectionRef = useRef(null)
  const analysisTimeoutRef = useRef(null)
  const analysisTimedOutRef = useRef(false)

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
            
            // Initialize/sync checks - will check database to determine if new or existing user
            // Database is the source of truth - no need for localStorage flags
            // Don't sync if there's a pending update (check was just used)
            const key = `scam_checker_user_checks_${session.user.id}`
            const hasLocalValue = localStorage.getItem(key)
            if (hasLocalValue) {
              // Use local value first, then sync in background
              const checks = getRemainingUserChecks(session.user.id)
              setRemainingChecks(checks)
              // Sync in background without blocking
              initializeUserChecks(session.user.id, false).catch(() => {})
            } else {
              // No local value, sync immediately
              await initializeUserChecks(session.user.id, false)
              const checks = getRemainingUserChecks(session.user.id)
              setRemainingChecks(checks)
            }
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
            setShowAuthModal(false)
            setShowBlurredPreview(false) // Hide blurred preview on login
            
            const { getRemainingUserChecks, initializeUserChecks } = await import('../../utils/checkLimits')
            
            // Initialize/sync checks - will check database to determine if new or existing user
            // Database is the source of truth - no need for localStorage flags
            // Don't sync if there's a pending update (check was just used)
            const key = `scam_checker_user_checks_${session.user.id}`
            const hasLocalValue = localStorage.getItem(key)
            if (hasLocalValue) {
              // Use local value first, then sync in background
              const checks = getRemainingUserChecks(session.user.id)
              setRemainingChecks(checks)
              // Sync in background without blocking
              initializeUserChecks(session.user.id, false).catch(() => {})
            } else {
              // No local value, sync immediately
              await initializeUserChecks(session.user.id, false)
              const checks = getRemainingUserChecks(session.user.id)
              setRemainingChecks(checks)
            }
            
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
        subscription = data?.subscription ?? data
      } catch (error) {
        console.warn('Supabase not available, auth features disabled:', error)
      }
    }
    
    setupAuthListener()

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
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
    
    // If no checks remaining, show signup modal and block (only for anonymous users)
    if (currentRemaining === 0 && !isLoggedIn) {
      console.log('🚫 No free checks remaining, showing signup modal for anonymous user')
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
          
          const redirectUrl = `${window.location.origin}/auth/callback`;
          console.log('🔵 [DETECTOR] Google OAuth redirect URL:', redirectUrl);
          
          const { error, data } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl
            }
          })
          
          if (error) {
            console.error('Supabase OAuth error:', error);
            console.error('Redirect URL used:', redirectUrl);
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
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setImage(file)
    setUrl(null)
    setText(null)
    setResult(null)
    setError(null)

    if (isLoggedIn && userId) {
      await useUserCheck(userId)
      const after = getRemainingUserChecks(userId)
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    } else {
      useFreeCheck()
      const after = getRemainingFreeChecks()
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    }

    const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
    const isLastFreeCheck = !isLoggedIn && checksAfter === 0

    if (isLastFreeCheck) {
      setLoading(true)
    } else {
      navigate('/results', { state: { analyzing: true, activeTab: 'image' } })
    }

    analysisTimedOutRef.current = false
    analysisTimeoutRef.current = setTimeout(async () => {
      analysisTimeoutRef.current = null
      analysisTimedOutRef.current = true
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      if (isLastFreeCheck) {
        setError(ANALYSIS_TIMEOUT_MESSAGE)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: ANALYSIS_TIMEOUT_MESSAGE, activeTab: 'image' }, replace: true })
      }
    }, ANALYSIS_TIMEOUT_MS)

    try {
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

      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return

      if (isLastFreeCheck) {
        await storePendingScan('image', file, null, null, data.classification, data)
        setResult(data)
        setShowBlurredPreview(true)
        if (!isLoggedIn) {
          setShowSignupModal(true)
          console.log('✅ Blurred preview and signup modal should now be visible')
        }
        setLoading(false)
      } else {
        if (isLoggedIn && userId && data) {
          try {
            const imageUrl = await uploadScanImage(file, userId)
            const savedScan = await saveScanToHistory(userId, 'image', imageUrl, null, data.classification, data)
            if (savedScan?.id) {
              const scanForUI = { ...savedScan, created_at: savedScan.created_at || new Date().toISOString(), classification: savedScan.classification || data.classification, scan_type: savedScan.scan_type || 'image', content_preview: savedScan.content_preview || null, analysis_result: savedScan.analysis_result || data }
              window.dispatchEvent(new CustomEvent('scanSaved', { detail: scanForUI }))
              if (typeof window !== 'undefined') sessionStorage.setItem('lastSavedScan', JSON.stringify(scanForUI))
            }
          } catch (saveErr) {
            console.error('❌ Error saving scan to history:', saveErr)
          }
        }
        navigate('/results', { state: { result: data, error: null, activeTab: 'image' }, replace: true })
      }
    } catch (err) {
      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      let errorMessage = getUserFriendlyError(err.message, 'image')
      if (refunded) errorMessage = `${errorMessage}\n\n✅ Your check has been refunded. You can try again.`
      if (isLastFreeCheck) {
        setError(errorMessage)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: errorMessage, activeTab: 'image' }, replace: true })
      }
    }
  }

  const handleUrlAnalyze = async (urlToAnalyze) => {
    console.log('🔗 handleUrlAnalyze called')
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setUrl(urlToAnalyze)
    setImage(null)
    setText(null)
    setResult(null)
    setError(null)

    if (isLoggedIn && userId) {
      await useUserCheck(userId)
      const after = getRemainingUserChecks(userId)
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    } else {
      useFreeCheck()
      const after = getRemainingFreeChecks()
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    }

    const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
    const isLastFreeCheck = !isLoggedIn && checksAfter === 0

    if (isLastFreeCheck) {
      setLoading(true)
    } else {
      navigate('/results', { state: { analyzing: true, activeTab: 'url' } })
    }

    analysisTimedOutRef.current = false
    analysisTimeoutRef.current = setTimeout(async () => {
      analysisTimeoutRef.current = null
      analysisTimedOutRef.current = true
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      if (isLastFreeCheck) {
        setError(ANALYSIS_TIMEOUT_MESSAGE)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: ANALYSIS_TIMEOUT_MESSAGE, activeTab: 'url' }, replace: true })
      }
    }, ANALYSIS_TIMEOUT_MS)

    try {
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

      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return

      if (isLastFreeCheck) {
        const contentPreview = urlToAnalyze.length > 200 ? urlToAnalyze.substring(0, 200) + '...' : urlToAnalyze
        await storePendingScan('url', null, null, contentPreview, data.classification, data)
        setResult(data)
        setShowBlurredPreview(true)
        if (!isLoggedIn) {
          setShowSignupModal(true)
          console.log('🎯 Last free check used - showing blurred preview and signup modal')
        }
        setLoading(false)
      } else {
        if (isLoggedIn && userId && data) {
          try {
            const contentPreview = urlToAnalyze.length > 200 ? urlToAnalyze.substring(0, 200) + '...' : urlToAnalyze
            const savedScan = await saveScanToHistory(userId, 'url', null, contentPreview, data.classification, data)
            if (savedScan?.id) {
              const scanForUI = { ...savedScan, created_at: savedScan.created_at || new Date().toISOString(), classification: savedScan.classification || data.classification, scan_type: savedScan.scan_type || 'url', content_preview: savedScan.content_preview || contentPreview, analysis_result: savedScan.analysis_result || data }
              window.dispatchEvent(new CustomEvent('scanSaved', { detail: scanForUI }))
              if (typeof window !== 'undefined') sessionStorage.setItem('lastSavedScan', JSON.stringify(scanForUI))
            }
          } catch (saveErr) {
            console.error('❌ Error saving scan to history:', saveErr)
          }
        }
        navigate('/results', { state: { result: data, error: null, activeTab: 'url' }, replace: true })
      }
    } catch (err) {
      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      let errorMessage = getUserFriendlyError(err.message, 'url')
      if (refunded) errorMessage = `${errorMessage}\n\n✅ Your check has been refunded. You can try again.`
      if (isLastFreeCheck) {
        setError(errorMessage)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: errorMessage, activeTab: 'url' }, replace: true })
      }
    }
  }

  const handleTextAnalyze = async (textContent) => {
    console.log('📝 handleTextAnalyze called')
    if (!checkAndShowSignup()) {
      console.log('⛔ Analysis blocked - signup required')
      return
    }

    setText(textContent)
    setImage(null)
    setUrl(null)
    setResult(null)
    setError(null)

    if (isLoggedIn && userId) {
      await useUserCheck(userId)
      const after = getRemainingUserChecks(userId)
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    } else {
      useFreeCheck()
      const after = getRemainingFreeChecks()
      setRemainingChecks(after)
      window.dispatchEvent(new Event('checksUpdated'))
    }

    const checksAfter = isLoggedIn ? getRemainingUserChecks(userId) : getRemainingFreeChecks()
    const isLastFreeCheck = !isLoggedIn && checksAfter === 0

    if (isLastFreeCheck) {
      setLoading(true)
    } else {
      navigate('/results', { state: { analyzing: true, activeTab: 'text' } })
    }

    analysisTimedOutRef.current = false
    analysisTimeoutRef.current = setTimeout(async () => {
      analysisTimeoutRef.current = null
      analysisTimedOutRef.current = true
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      if (isLastFreeCheck) {
        setError(ANALYSIS_TIMEOUT_MESSAGE)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: ANALYSIS_TIMEOUT_MESSAGE, activeTab: 'text' }, replace: true })
      }
    }, ANALYSIS_TIMEOUT_MS)

    try {
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

      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return

      if (isLastFreeCheck) {
        const PREVIEW_LENGTH = 1000
        const contentPreview = textContent.length > PREVIEW_LENGTH ? textContent.substring(0, PREVIEW_LENGTH) + '...' : textContent
        await storePendingScan('text', null, null, contentPreview, data.classification, data)
        setResult(data)
        setShowBlurredPreview(true)
        if (!isLoggedIn) {
          setShowSignupModal(true)
          console.log('🎯 Last free check used - showing blurred preview and signup modal')
        }
        setLoading(false)
      } else {
        if (isLoggedIn && userId && data) {
          try {
            const PREVIEW_LENGTH = 1000
            const contentPreview = textContent.length > PREVIEW_LENGTH ? textContent.substring(0, PREVIEW_LENGTH) + '...' : textContent
            const savedScan = await saveScanToHistory(userId, 'text', null, contentPreview, data.classification, data)
            if (savedScan?.id) {
              const scanForUI = { ...savedScan, created_at: savedScan.created_at || new Date().toISOString(), classification: savedScan.classification || data.classification, scan_type: savedScan.scan_type || 'text', content_preview: savedScan.content_preview || contentPreview, analysis_result: savedScan.analysis_result || data }
              window.dispatchEvent(new CustomEvent('scanSaved', { detail: scanForUI }))
              if (typeof window !== 'undefined') sessionStorage.setItem('lastSavedScan', JSON.stringify(scanForUI))
            }
          } catch (saveErr) {
            console.error('❌ Error saving scan to history:', saveErr)
          }
        }
        navigate('/results', { state: { result: data, error: null, activeTab: 'text' }, replace: true })
      }
    } catch (err) {
      clearTimeout(analysisTimeoutRef.current)
      analysisTimeoutRef.current = null
      if (analysisTimedOutRef.current) return
      let refunded = false
      if (isLoggedIn && userId) {
        refunded = await refundUserCheck(userId)
        if (refunded) {
          setRemainingChecks(getRemainingUserChecks(userId))
          window.dispatchEvent(new Event('checksUpdated'))
        }
      } else {
        refunded = refundFreeCheck()
        if (refunded) {
          setRemainingChecks(getRemainingFreeChecks())
          window.dispatchEvent(new Event('checksUpdated'))
        }
      }
      let errorMessage = getUserFriendlyError(err.message, 'text')
      if (refunded) errorMessage = `${errorMessage}\n\n✅ Your check has been refunded. You can try again.`
      if (isLastFreeCheck) {
        setError(errorMessage)
        setLoading(false)
      } else {
        navigate('/results', { state: { result: null, error: errorMessage, activeTab: 'text' }, replace: true })
      }
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

  // Locked overlay on Index: only loading or blurred signup preview; result/error go to /results
  const isAnalyzeLocked = loading || (!!result && showBlurredPreview)

  // When we have result (not blurred) or error, navigate to /results with state
  useEffect(() => {
    if (result && !showBlurredPreview) {
      navigate('/results', { state: { result, error: null, activeTab } })
    } else if (error) {
      navigate('/results', { state: { result: null, error, activeTab } })
    }
  }, [result, error, showBlurredPreview, activeTab, navigate])

  // Scroll the analyze result section into view when result appears (so it's not cut off)
  useEffect(() => {
    if (result && !showBlurredPreview && resultSectionRef.current && !isAnalyzeLocked) {
      resultSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result, showBlurredPreview, isAnalyzeLocked])

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
      {/* Locked full-page analyze view: from loading through result/error */}
      {isAnalyzeLocked && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
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
          <Header backToAnalyzerOnClick={handleNewAnalysis} />
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative z-10 pt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 min-h-0 flex flex-col items-center justify-center">
              <div className="w-full max-w-4xl mx-auto flex flex-col">
                {loading && <AnalyzingSteps type={activeTab} />}
                {showBlurredPreview && result && !loading && (
                  <div className="animate-fade-in">
                    <BlurredResultPreview
                      classification={result.classification}
                      onSignup={() => setShowSignupModal(true)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular view: header + tab card (hidden when locked) */}
      {!isAnalyzeLocked && (
        <>
          {/* Decorative layer - overflow hidden only here so result card is never clipped */}
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

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto">
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

              <div 
                ref={cardRef}
                className={`bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 md:p-8 glow-effect gradient-border transition-all duration-700 delay-150 ${
                  cardVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                }`}
              >
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
                <div className="min-h-[300px]">
                  {activeTab === 'image' && <ImageUpload onUpload={handleImageUpload} />}
                  {activeTab === 'url' && <UrlInput onAnalyze={handleUrlAnalyze} />}
                  {activeTab === 'text' && <TextInput onAnalyze={handleTextAnalyze} loading={loading} />}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* SignupModal - Only for anonymous users who have exhausted free checks */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => {
          setShowSignupModal(false)
          // Don't show result if user closes without signing up
          if (!isLoggedIn) {
            setResult(null)
            setShowBlurredPreview(false)
          }
        }}
        onSignup={handleSignup}
        remainingChecks={remainingChecks}
      />

      <OutOfChecksModal
        isOpen={showOutOfChecksModal}
        onClose={() => setShowOutOfChecksModal(false)}
      />
    </section>
  )
}

export default DetectorSection
