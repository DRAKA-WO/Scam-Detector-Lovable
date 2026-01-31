import { useState, useEffect } from 'react'
import { isUserLoggedIn, getRemainingFreeChecks, getRemainingUserChecks } from '../../utils/checkLimits'
import LoginModal from '../LoginModal'
import SignupModal from '../SignupModal'
import ContactSupportModal from '../ContactSupportModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Sparkles, PlayCircle, HelpCircle, MessageCircle, Zap, User, Settings, History, BookOpen, Mail, LogOut, Bell, AlertTriangle, X, Download } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'
import { clearExtensionSession } from '@/utils/extensionSync'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAlerts } from '../../contexts/AlertsContext'

function Header({ alerts: propsAlerts, onDismissAlert: propsOnDismissAlert, backToAnalyzerOnClick }) {
  // Use context alerts if available, otherwise fall back to props (for backward compatibility)
  let alertsContext
  try {
    alertsContext = useAlerts()
  } catch (e) {
    // Context not available, use props
    alertsContext = null
  }
  
  const alerts = alertsContext?.alerts || propsAlerts || []
  const onDismissAlert = alertsContext?.dismissAlert || propsOnDismissAlert || (() => {})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showContactSupportModal, setShowContactSupportModal] = useState(false)
  const [remainingChecks, setRemainingChecks] = useState(0)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  // Helper function to extract base64 data URL from marked initial avatar
  const INITIAL_AVATAR_MARKER = 'INITIAL_AVATAR:'
  const getInitialAvatarDataUrl = (avatarUrl) => {
    if (!avatarUrl) return ''
    if (avatarUrl.startsWith(INITIAL_AVATAR_MARKER)) {
      return avatarUrl.substring(INITIAL_AVATAR_MARKER.length)
    }
    return avatarUrl
  }
  
  // Initialize avatar from cached sessionStorage first, then fallback to session
  // This prevents flash when navigating between pages
  const [userAvatar, setUserAvatar] = useState(() => {
    // First, try to get cached avatar from sessionStorage (if already fetched)
    if (typeof window !== 'undefined') {
      const cachedAvatar = sessionStorage.getItem('header_cached_avatar')
      if (cachedAvatar) {
        return cachedAvatar
      }
    }
    
    // Fallback to session data if no cache
    try {
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
      if (supabaseKeys.length > 0) {
        const sessionStr = localStorage.getItem(supabaseKeys[0])
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          const user = session?.currentSession?.user || session?.user
          if (user) {
            // Get avatar from user_metadata first (immediate, no fetch needed)
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
            // Extract base64 data URL if it's a marked initial avatar
            return getInitialAvatarDataUrl(avatarUrl)
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return ''
  })
  const [avatarError, setAvatarError] = useState(false)
  const [userPlan, setUserPlan] = useState(null) // Start with null to prevent flash
  const [planLoaded, setPlanLoaded] = useState(false) // Track if plan has been loaded
  // Use sessionStorage to persist fetch flag across page changes
  const [avatarFetched, setAvatarFetched] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('header_avatar_fetched') === 'true'
    }
    return false
  })
  
  // Helper to update avatarFetched and persist to sessionStorage
  const setAvatarFetchedWithStorage = (value) => {
    setAvatarFetched(value)
    if (typeof window !== 'undefined') {
      if (value) {
        sessionStorage.setItem('header_avatar_fetched', 'true')
      } else {
        sessionStorage.removeItem('header_avatar_fetched')
      }
    }
  }

  // Shared logout function
  const handleLogout = async () => {
    try {
      // Clear user state immediately
      setIsLoggedIn(false)
      setUserId(null)
      setUserEmail('')
      setUserName('')
      setUserAvatar('')
      setUserPlan('FREE')
      setAvatarFetchedWithStorage(false) // Reset fetch flag on logout
      // Clear cached avatar on logout
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('header_cached_avatar')
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
      }
      
      // Clear all Supabase-related localStorage keys
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key.includes('auth-token')
      )
      
      supabaseKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn('Failed to remove localStorage key:', key, e)
        }
      })
      
      // Clear extension session
      await clearExtensionSession()
      
      // Clear any user-specific localStorage items
      if (userId) {
        const hasSeenKey = `has_seen_latest_scan_${userId}`
        try {
          localStorage.removeItem(hasSeenKey)
        } catch (e) {
          // Ignore
        }
      }
      
      // Small delay to ensure localStorage is cleared
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate to home page with page reload to ensure clean state
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
      // Still try to navigate and clear localStorage even on error
      try {
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || 
          key.includes('supabase') ||
          key.includes('auth-token')
        )
        supabaseKeys.forEach(key => localStorage.removeItem(key))
        await clearExtensionSession()
        window.location.href = '/'
      } catch (e) {
        window.location.href = '/'
      }
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isUserLoggedIn()
      setIsLoggedIn(loggedIn)
      
      // Get checks count
      if (loggedIn) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setUserId(session.user.id)
            setUserEmail(session.user.email || '')
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
            
            // Fetch user data from database FIRST (plan, full_name, avatar_url) - database is source of truth
            // This ensures custom avatar shows immediately, not Google OAuth picture
            // Only fetch if we haven't fetched yet (prevents refetching on every page change)
            if (!avatarFetched) {
              try {
                const { data, error } = await supabase
                  .from('users')
                  .select('plan, full_name, avatar_url')
                  .eq('id', session.user.id)
                  .maybeSingle()
                
                if (!error && data) {
                  // Set plan
                  if (data.plan) {
                    const planUpper = (data.plan || '').toString().toUpperCase().trim()
                    setUserPlan(planUpper)
                    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: planUpper } }))
                  } else {
                    setUserPlan('FREE')
                    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                  }
                  
                  // Set name and avatar from database (source of truth for custom data)
                  const dbFullName = data.full_name || 
                                    session.user.user_metadata?.full_name || 
                                    session.user.user_metadata?.name || 
                                    session.user.email?.split('@')[0] || 
                                    'User'
                  const dbAvatarUrl = data.avatar_url || 
                                    session.user.user_metadata?.avatar_url || 
                                    session.user.user_metadata?.picture || 
                                    ''
                  
                  setUserName(dbFullName)
                  // Extract base64 data URL if it's a marked initial avatar
                  const extractedDbAvatarUrl = getInitialAvatarDataUrl(dbAvatarUrl)
                  setUserAvatar(extractedDbAvatarUrl)
                  // Cache avatar in sessionStorage to prevent flash on page navigation
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('header_cached_avatar', extractedDbAvatarUrl)
                  }
                } else {
                  // Fallback to user_metadata if database fetch fails
                  const initialFullName = session.user.user_metadata?.full_name || 
                                         session.user.user_metadata?.name || 
                                         session.user.email?.split('@')[0] || 
                                         'User'
                  const initialAvatarUrl = session.user.user_metadata?.avatar_url || 
                                           session.user.user_metadata?.picture || 
                                           ''
                  setUserName(initialFullName)
                  const extractedAvatarUrl = getInitialAvatarDataUrl(initialAvatarUrl)
                  setUserAvatar(extractedAvatarUrl)
                  // Cache avatar in sessionStorage to prevent flash on page navigation
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('header_cached_avatar', extractedAvatarUrl)
                  }
                  setUserPlan('FREE')
                  window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                }
                setAvatarFetchedWithStorage(true)
              } catch (fetchError) {
                // Fallback to user_metadata on error
                const initialFullName = session.user.user_metadata?.full_name || 
                                       session.user.user_metadata?.name || 
                                       session.user.email?.split('@')[0] || 
                                       'User'
                const initialAvatarUrl = session.user.user_metadata?.avatar_url || 
                                         session.user.user_metadata?.picture || 
                                         ''
                setUserName(initialFullName)
                const extractedAvatarUrl = getInitialAvatarDataUrl(initialAvatarUrl) || ''
                setUserAvatar(extractedAvatarUrl)
                // Cache avatar in sessionStorage to prevent flash on page navigation
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('header_cached_avatar', extractedAvatarUrl)
                }
                setUserPlan('FREE')
                window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                setAvatarFetchedWithStorage(true)
              } finally {
                setAvatarError(false)
                setPlanLoaded(true)
              }
            } else {
              // Already fetched - use cached avatar to prevent flash
              // Only check database for updates in background (database is source of truth)
              // Don't update from session user_metadata as it might have Google avatar
              ;(async () => {
                try {
                  const { data, error } = await supabase
                    .from('users')
                    .select('plan, full_name, avatar_url')
                    .eq('id', session.user.id)
                    .maybeSingle()
                  
                  if (!error && data) {
                    // Update plan if needed
                    if (data.plan) {
                      const planUpper = (data.plan || '').toString().toUpperCase().trim()
                      if (planUpper !== userPlan) {
                        setUserPlan(planUpper)
                        window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: planUpper } }))
                      }
                    }
                    
                    // Update name and avatar from database if different (silent update)
                    const dbFullName = data.full_name || 
                                    session.user.user_metadata?.full_name || 
                                    session.user.user_metadata?.name || 
                                    session.user.email?.split('@')[0] || 
                                    'User'
                    const dbAvatarUrl = data.avatar_url || 
                                      session.user.user_metadata?.avatar_url || 
                                      session.user.user_metadata?.picture || 
                                      ''
                    
                    if (dbFullName !== userName) {
                      setUserName(dbFullName)
                    }
                    // Extract base64 data URL if it's a marked initial avatar
                    const extractedDbAvatarUrl = getInitialAvatarDataUrl(dbAvatarUrl)
                    if (extractedDbAvatarUrl !== userAvatar) {
                      setUserAvatar(extractedDbAvatarUrl)
                      // Update cache when avatar changes
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('header_cached_avatar', extractedDbAvatarUrl)
                      }
                    }
                  }
                } catch (fetchError) {
                  // Silent error
                }
              })()
              
              if (!planLoaded) {
                setUserPlan('FREE')
                setPlanLoaded(true)
                window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
              }
            }
          }
        } catch (error) {
          console.error('Error getting session:', error)
        }
      } else {
        const checks = getRemainingFreeChecks()
        setRemainingChecks(checks)
        setUserPlan('FREE')
        setPlanLoaded(true)
        // Dispatch event for other components (like Pricing) to listen to
        window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
      }
    }
    
    checkAuth()
    
    // Listen for auth changes
    const setupAuthListener = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          const loggedIn = !!session
          setIsLoggedIn(loggedIn)
          
          if (loggedIn && session?.user) {
            setUserId(session.user.id)
            setUserEmail(session.user.email || '')
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
            
            // Fetch user data from database FIRST (plan, full_name, avatar_url) - database is source of truth
            // This ensures custom avatar shows immediately, not Google OAuth picture
            // Only fetch if we haven't fetched yet (prevents refetching on every page change)
            if (!avatarFetched) {
              // Fetch immediately without delay to get custom avatar right away
              ;(async () => {
                
                try {
                  const { data, error } = await supabase
                    .from('users')
                    .select('plan, full_name, avatar_url')
                    .eq('id', session.user.id)
                    .maybeSingle()
                  
                  if (!error && data) {
                    // Set plan
                    if (data.plan) {
                      const planUpper = (data.plan || '').toString().toUpperCase().trim()
                      setUserPlan(planUpper)
                      window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: planUpper } }))
                    } else {
                      setUserPlan('FREE')
                      window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                    }
                    
                    // Set name and avatar from database (source of truth for custom data)
                    const dbFullName = data.full_name || 
                                    session.user.user_metadata?.full_name || 
                                    session.user.user_metadata?.name || 
                                    session.user.email?.split('@')[0] || 
                                    'User'
                    const dbAvatarUrl = data.avatar_url || 
                                      session.user.user_metadata?.avatar_url || 
                                      session.user.user_metadata?.picture || 
                                      ''
                    
                    setUserName(dbFullName)
                    // Extract base64 data URL if it's a marked initial avatar
                    const extractedDbAvatarUrl = getInitialAvatarDataUrl(dbAvatarUrl) || ''
                    setUserAvatar(extractedDbAvatarUrl)
                    // Cache avatar in sessionStorage to prevent flash on page navigation
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('header_cached_avatar', extractedDbAvatarUrl)
                    }
                  } else {
                    // Fallback to user_metadata if database fetch fails
                    const initialFullName = session.user.user_metadata?.full_name || 
                                           session.user.user_metadata?.name || 
                                           session.user.email?.split('@')[0] || 
                                           'User'
                    const initialAvatarUrl = session.user.user_metadata?.avatar_url || 
                                             session.user.user_metadata?.picture || 
                                             ''
                    setUserName(initialFullName)
                    const extractedAvatarUrl = getInitialAvatarDataUrl(initialAvatarUrl) || ''
                    setUserAvatar(extractedAvatarUrl)
                    // Cache avatar in sessionStorage to prevent flash on page navigation
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('header_cached_avatar', extractedAvatarUrl)
                    }
                    setUserPlan('FREE')
                    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                  }
                  setAvatarFetchedWithStorage(true)
                } catch (fetchError) {
                  // Fallback to user_metadata on error
                  const initialFullName = session.user.user_metadata?.full_name || 
                                         session.user.user_metadata?.name || 
                                         session.user.email?.split('@')[0] || 
                                         'User'
                  const initialAvatarUrl = session.user.user_metadata?.avatar_url || 
                                         session.user.user_metadata?.picture || 
                                         ''
                  setUserName(initialFullName)
                  const extractedAvatarUrl = getInitialAvatarDataUrl(initialAvatarUrl)
                  setUserAvatar(extractedAvatarUrl)
                  // Cache avatar in sessionStorage to prevent flash on page navigation
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('header_cached_avatar', extractedAvatarUrl)
                  }
                  setUserPlan('FREE')
                  window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
                  setAvatarFetchedWithStorage(true)
                } finally {
                  setAvatarError(false)
                  setPlanLoaded(true)
                }
              })()
            } else {
              // Already fetched - use cached avatar to prevent flash
              // Only check database for updates in background (database is source of truth)
              // Don't update from session user_metadata as it might have Google avatar
              ;(async () => {
                try {
                  const { data, error } = await supabase
                    .from('users')
                    .select('plan, full_name, avatar_url')
                    .eq('id', session.user.id)
                    .maybeSingle()
                  
                  if (!error && data) {
                    // Update plan if needed
                    if (data.plan) {
                      const planUpper = (data.plan || '').toString().toUpperCase().trim()
                      if (planUpper !== userPlan) {
                        setUserPlan(planUpper)
                        window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: planUpper } }))
                      }
                    }
                    
                    // Update name and avatar from database if different (silent update)
                    const dbFullName = data.full_name || 
                                    session.user.user_metadata?.full_name || 
                                    session.user.user_metadata?.name || 
                                    session.user.email?.split('@')[0] || 
                                    'User'
                    const dbAvatarUrl = data.avatar_url || 
                                      session.user.user_metadata?.avatar_url || 
                                      session.user.user_metadata?.picture || 
                                      ''
                    
                    if (dbFullName !== userName) {
                      setUserName(dbFullName)
                    }
                    // Extract base64 data URL if it's a marked initial avatar
                    const extractedDbAvatarUrl = getInitialAvatarDataUrl(dbAvatarUrl)
                    if (extractedDbAvatarUrl !== userAvatar) {
                      setUserAvatar(extractedDbAvatarUrl)
                      // Update cache when avatar changes
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('header_cached_avatar', extractedDbAvatarUrl)
                      }
                    }
                  }
                } catch (fetchError) {
                  // Silent error
                }
              })()
              
              if (!planLoaded) {
                setUserPlan('FREE')
                setPlanLoaded(true)
                window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
              }
            }
          } else {
            setUserId(null)
            setUserEmail('')
            setUserName('')
            setUserAvatar('')
            setAvatarError(false)
            setUserPlan('FREE')
            // Dispatch event for other components (like Pricing) to listen to
            window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: 'FREE' } }))
            const checks = getRemainingFreeChecks()
            setRemainingChecks(checks)
          }
        })
        return () => { if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe() }
      } catch (error) {
        // Supabase not available
      }
    }
    
    setupAuthListener()
    
    // Also listen for localStorage changes (when checks are used)
    const handleStorageChange = () => {
      if (isLoggedIn && userId) {
        const checks = getRemainingUserChecks(userId)
        setRemainingChecks(checks)
      } else {
        const checks = getRemainingFreeChecks()
        setRemainingChecks(checks)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Custom event for same-tab updates
    window.addEventListener('checksUpdated', handleStorageChange)
    
    // Listen for avatar updates from Dashboard
    const handleAvatarUpdate = (event) => {
      const { avatar_url, full_name } = (event.detail || {})
      if (avatar_url !== undefined) {
        const extractedAvatarUrl = getInitialAvatarDataUrl(avatar_url)
        setUserAvatar(extractedAvatarUrl)
        // Update cache
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('header_cached_avatar', extractedAvatarUrl)
        }
      }
      if (full_name !== undefined && full_name !== userName) {
        setUserName(full_name)
      }
    }
    
    window.addEventListener('avatarUpdated', handleAvatarUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('checksUpdated', handleStorageChange)
      window.removeEventListener('avatarUpdated', handleAvatarUpdate)
    }
  }, [isLoggedIn, userId])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo or Back to analyzer */}
          {backToAnalyzerOnClick ? (
            <button
              type="button"
              onClick={backToAnalyzerOnClick}
              className="flex items-center gap-2 text-foreground hover:text-foreground font-medium transition-colors py-2 px-3 rounded-lg hover:bg-secondary/50"
              aria-label="Back to analyzer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to analyzer</span>
            </button>
          ) : (
            <a 
              href="/" 
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-foreground">ScamGuard</span>
            </a>
          )}

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-baseline gap-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium flex items-center gap-1 outline-none">
                Resources
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700 w-[500px] p-3">
                <div className="grid grid-cols-2 gap-3">
                  <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                    <a href="/#features" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">Features</div>
                        <div className="text-gray-400 text-xs mt-0.5">Explore our powerful AI detection capabilities</div>
                      </div>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                    <a href="/#how-it-works" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        <PlayCircle className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">How it Works</div>
                        <div className="text-gray-400 text-xs mt-0.5">Learn how our scam detection system works</div>
                      </div>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                    <a href="/#faq" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        <HelpCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">FAQ</div>
                        <div className="text-gray-400 text-xs mt-0.5">Find answers to frequently asked questions</div>
                      </div>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                    <button 
                      onClick={() => setShowContactSupportModal(true)}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full text-left"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <MessageCircle className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">Support</div>
                        <div className="text-gray-400 text-xs mt-0.5">Get help from our support team</div>
                      </div>
                    </button>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium">
              Pricing
            </a>
            <a href="/business" className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium">
              For Business
            </a>
            <a href="/#detector" className="gradient-text font-semibold transition-all text-sm font-medium relative group subtle-pulse">
              Scan Now!
              <span className="absolute inset-0 bg-primary/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10"></span>
            </a>
          </nav>

          {/* Checks Counter & CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Checks Counter with Upgrade Button - Only show when logged in */}
            {isLoggedIn && (
              <div className="flex items-center rounded-md overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
                {/* Checks Display */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/30">
                  <span className="text-sm font-medium text-foreground">Checks:</span>
                  <span className="text-sm font-bold text-foreground">{remainingChecks}</span>
                </div>
                
                {/* Upgrade Button */}
                <a
                  href="/pricing"
                  className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium transition-all"
                >
                  <Zap className="w-3 h-3" />
                  Get more
                </a>
              </div>
            )}
            
            {isLoggedIn ? (
              <>
                {/* Only show Dashboard link if NOT on dashboard */}
                {window.location.pathname !== '/dashboard' && (
                  <a
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium"
                  >
                    Dashboard
                  </a>
                )}
                
                {/* Smart Notifications & Alerts - Bell Icon */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 rounded-full p-0"
                    >
                      <Bell className="h-5 w-5 text-foreground" />
                      {(() => {
                        const nonRiskAlerts = alerts ? alerts.filter(alert => !alert.isRiskAlert) : []
                        return nonRiskAlerts.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {nonRiskAlerts.length > 9 ? '9+' : nonRiskAlerts.length}
                          </span>
                        )
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-96 p-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 shadow-2xl">
                    <div className="relative overflow-hidden p-4 border-b border-gray-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2 relative z-10">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <Bell className="h-4 w-4 text-purple-400" />
                        </div>
                        Smart Notifications & Alerts
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto dark-scrollbar">
                      {alerts && alerts.length > 0 ? (
                        <div className="p-3 space-y-2">
                          {alerts.map((alert) => {
                            // Special styling for first-scam alert (orange/amber) to differentiate from risk pattern alerts
                            const isFirstScam = alert.type === 'first-scam'
                            
                            return (
                            <Card
                              key={alert.id || alert.type}
                              className={`relative overflow-hidden rounded-lg border transition-all ${
                                isFirstScam
                                  ? 'bg-gradient-to-br from-orange-500/10 via-card/50 to-card/50 border-orange-500/30 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10' :
                                  alert.severity === 'error' 
                                  ? 'bg-gradient-to-br from-red-500/10 via-card/50 to-card/50 border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10' :
                                  alert.severity === 'warning' 
                                  ? 'bg-gradient-to-br from-yellow-500/10 via-card/50 to-card/50 border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10' :
                                  'bg-gradient-to-br from-blue-500/10 via-card/50 to-card/50 border-blue-500/30 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10'
                              }`}
                            >
                              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-30 ${
                                isFirstScam ? 'bg-orange-500' :
                                alert.severity === 'error' ? 'bg-red-500' :
                                alert.severity === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}></div>
                              <CardContent className="pt-3 pb-3 px-3 relative">
                                <div className="flex items-start gap-3">
                                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                    isFirstScam ? 'bg-orange-500/20' :
                                    alert.severity === 'error' ? 'bg-red-500/20' :
                                    alert.severity === 'warning' ? 'bg-yellow-500/20' :
                                    'bg-blue-500/20'
                                  }`}>
                                    <AlertTriangle className={`h-4 w-4 ${
                                      isFirstScam ? 'text-orange-400' :
                                      alert.severity === 'error' ? 'text-red-400' :
                                      alert.severity === 'warning' ? 'text-yellow-400' :
                                      'text-blue-400'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-relaxed ${
                                      isFirstScam ? 'text-orange-300' :
                                      alert.severity === 'error' ? 'text-red-300' :
                                      alert.severity === 'warning' ? 'text-yellow-300' :
                                      'text-blue-300'
                                    }`}>
                                      {alert.message}
                                    </p>
                                    {alert.actionButton && (
                                      <Button
                                        onClick={alert.actionButton.onClick}
                                        className={`mt-3 text-xs h-8 px-3 font-medium transition-all ${
                                          isFirstScam
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                                            alert.severity === 'error' 
                                            ? 'bg-red-500 hover:bg-red-600 text-white' :
                                            alert.severity === 'warning'
                                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                        size="sm"
                                      >
                                        <Download className="h-3 w-3 mr-1.5" />
                                        {alert.actionButton.label}
                                      </Button>
                                    )}
                                  </div>
                                  {onDismissAlert && alert.id && !alert.isRiskAlert && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onDismissAlert(alert.id)}
                                      className="h-6 w-6 p-0 flex-shrink-0 hover:bg-gray-800/50 rounded-md transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-6">
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                              <Bell className="h-6 w-6 text-purple-400/50" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-300 mb-1">
                                No alerts at this time
                              </p>
                              <p className="text-xs text-gray-500">
                                Alerts will appear here when unusual patterns, new scam types, or risk changes are detected.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                    {userAvatar && !avatarError ? (
                      <img 
                        src={getInitialAvatarDataUrl(userAvatar)} 
                        alt="User Avatar" 
                        className="w-8 h-8 rounded-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                        <span>{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                      </div>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-gray-900 border-gray-700 p-0">
                    {/* User Info Header */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-3 mb-2">
                        {userAvatar && !avatarError ? (
                          <img 
                            src={getInitialAvatarDataUrl(userAvatar)} 
                            alt="User Avatar" 
                            className="w-12 h-12 rounded-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                            <span>{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold truncate">{userName}</div>
                          <div className="text-gray-400 text-xs truncate">{userEmail}</div>
                        </div>
                      </div>
                      {planLoaded && userPlan && (
                        <div className={`inline-block px-2 py-0.5 text-xs rounded-md font-medium ${
                          userPlan.toUpperCase() === 'FREE'
                            ? 'bg-slate-500/20 text-slate-300'
                            : userPlan.toUpperCase() === 'PRO'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : userPlan.toUpperCase() === 'PREMIUM'
                            ? 'bg-purple-500/20 text-purple-300'
                            : userPlan.toUpperCase() === 'ULTRA'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {userPlan.toUpperCase()} PLAN
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/dashboard#account-info" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                          <Settings className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200 text-sm">Account details</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/dashboard#scan-history-section" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                          <History className="h-4 w-4 text-yellow-400" />
                          <span className="text-gray-200 text-sm">My Scan history</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/dashboard#unlocked-scam-learning" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                          <BookOpen className="h-4 w-4 text-purple-400" />
                          <span className="text-gray-200 text-sm">My Scam Library</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/pricing" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full">
                          <Zap className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-200 text-sm">Upgrade your plan</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <button 
                          onClick={() => setShowContactSupportModal(true)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-all duration-300 hover:scale-105 w-full text-left"
                        >
                          <Mail className="h-4 w-4 text-orange-400" />
                          <span className="text-gray-200 text-sm">Contact us</span>
                        </button>
                      </DropdownMenuItem>
                    </div>

                    {/* Logout Button */}
                    <div className="p-2 border-t border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-red-500/10 rounded-md transition-colors w-full text-left"
                      >
                        <LogOut className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="gradient-button text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2"
                >
                  Try for Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <div className="text-muted-foreground text-sm font-semibold mb-2">Resources</div>
              <a href="/#features" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-all duration-300 hover:scale-105">
                <div className="flex-shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">Features</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Explore our powerful AI detection capabilities</div>
                </div>
              </a>
              <a href="/#how-it-works" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-all duration-300 hover:scale-105">
                <div className="flex-shrink-0 mt-0.5">
                  <PlayCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">How it Works</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Learn how our scam detection system works</div>
                </div>
              </a>
              <a href="/#faq" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-all duration-300 hover:scale-105">
                <div className="flex-shrink-0 mt-0.5">
                  <HelpCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">FAQ</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Find answers to frequently asked questions</div>
                </div>
              </a>
              <button 
                onClick={() => setShowContactSupportModal(true)}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-all duration-300 hover:scale-105 w-full text-left"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <MessageCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">Support</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Get help from our support team</div>
                </div>
              </button>
              <a href="/pricing" className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium">
                Pricing
              </a>
              <a href="/business" className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium">
                For Business
              </a>
              <a href="/#detector" className="gradient-text font-semibold transition-all text-sm font-medium relative group subtle-pulse">
                Scan Now!
                <span className="absolute inset-0 bg-primary/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10"></span>
              </a>
              {isLoggedIn ? (
                <>
                  <a
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground hover:scale-105 transition-all text-sm font-medium"
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowAuthModal(true)
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium text-left"
                  >
                    Login
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Signup Modal - for "Try for Free" button */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={async (method) => {
          // OAuth will redirect automatically
        }}
        remainingChecks={remainingChecks}
        hideOutOfChecksMessage={true}
      />

      {/* Contact/Support Modal */}
      <ContactSupportModal
        open={showContactSupportModal}
        onOpenChange={setShowContactSupportModal}
      />
    </header>
  )
}

export default Header
