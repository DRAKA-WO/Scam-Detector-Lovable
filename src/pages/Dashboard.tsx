import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle, Clock, TrendingUp, LogOut, User, AlertCircle, History, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import ScanHistory from '@/components/ScanHistory'
import ResultCard from '@/components/ResultCard'
import { getRemainingUserChecks } from '@/utils/checkLimits'

function Dashboard() {
  const navigate = useNavigate()
  
  // Initialize user state synchronously from localStorage if available
  const [user, setUser] = useState(() => {
    try {
      // Supabase stores session in localStorage with key: sb-<project-ref>-auth-token
      // Try to find the session key
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
      if (supabaseKeys.length > 0) {
        const sessionStr = localStorage.getItem(supabaseKeys[0])
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          if (session?.currentSession?.user) {
            return session.currentSession.user
          } else if (session?.user) {
            return session.user
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return null
  })
  
  const [remainingChecks, setRemainingChecks] = useState(() => {
    if (user?.id) {
      try {
        const checks = getRemainingUserChecks(user.id)
        return checks
      } catch (e) {
        return 0
      }
    }
    return 0
  })
  const [stats, setStats] = useState({
    totalScans: 0,
    scamsDetected: 0,
    safeResults: 0,
    suspiciousResults: 0
  })
  // Initialize loading state - check if we already have a session
  // IMPORTANT: Use the same logic as user state to ensure consistency
  const [loading, setLoading] = useState(() => {
    // If we have a user from the state above, start with loading false
    if (user) {
      return false
    }
    // Otherwise check localStorage directly (same dynamic key lookup as user state)
    try {
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
      if (supabaseKeys.length > 0) {
        const sessionStr = localStorage.getItem(supabaseKeys[0])
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          if (session?.currentSession?.user || session?.user) {
            return false
          }
        }
      }
    } catch (e) {
      // Ignore errors, default to loading true
    }
    return true
  })
  const effectIdRef = useRef(0)
  const hasLoadedRef = useRef(!!user)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedScan, setSelectedScan] = useState(null)
  const [latestScan, setLatestScan] = useState(null)
  const [showLatestScan, setShowLatestScan] = useState(false)

  // Function to refresh stats from database
  const refreshStats = async () => {
    if (!user?.id) return
    
    try {
      const { getUserStatsFromDatabase } = await import('@/utils/scanHistory')
      const userStats = await getUserStatsFromDatabase(user.id)
      console.log('🔄 Dashboard: Refreshed stats from database', userStats)
      setStats(userStats)
    } catch (error) {
      console.error('❌ Dashboard: Error refreshing stats:', error)
    }
  }

  useEffect(() => {
    const currentEffectId = ++effectIdRef.current
    let subscription = null
    
    // Helper to update user data
    const updateUserData = async (session) => {
      if (!session?.user) {
        return false
      }
      
      // Check if this effect is still active (not cleaned up)
      if (currentEffectId !== effectIdRef.current) {
        return false
      }
      
      console.log('📊 Dashboard: Updating user data', session.user.email)
      setUser(session.user)
      
      // Get user's remaining checks
      const checks = getRemainingUserChecks(session.user.id)
      console.log('📊 Dashboard: User checks', checks)
      setRemainingChecks(checks)
      
      // Get user stats from database (not localStorage)
      try {
        const { getUserStatsFromDatabase } = await import('@/utils/scanHistory')
        const userStats = await getUserStatsFromDatabase(session.user.id)
        console.log('📊 Dashboard: User stats from database', userStats)
        setStats(userStats)
      } catch (error) {
        console.error('❌ Dashboard: Error fetching stats:', error)
        setStats({
          totalScans: 0,
          scamsDetected: 0,
          safeResults: 0,
          suspiciousResults: 0
        })
      }
      
      // Double-check effect is still active before setLoading
      if (currentEffectId !== effectIdRef.current) {
        return false
      }
      setLoading(false)
      hasLoadedRef.current = true
      
      // Clear hash if it exists
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      
      return true
    }
    
    // Check session immediately and synchronously
    const checkSessionImmediately = async () => {
      try {
        console.log('📊 Dashboard: Checking session immediately...')
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Dashboard: Session error', error)
          return false
        }
        
        if (session?.user) {
          console.log('📊 Dashboard: Session found immediately')
          return updateUserData(session)
        }
        
        return false
      } catch (error) {
        console.error('❌ Dashboard: Error checking session', error)
        return false
      }
    }
    
    // Set up auth listener
    const setupAuthListener = async () => {
      try {
        console.log('📊 Dashboard: Setting up auth listener...')
        const { supabase } = await import('@/integrations/supabase/client')
        
        // Check session immediately first
        const hasSession = await checkSessionImmediately()
        if (hasSession && currentEffectId === effectIdRef.current) {
          // We already have a session, we're done
          return
        }
        
        // Set up listener for future changes
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          // Check if this effect is still active before processing
          if (currentEffectId !== effectIdRef.current) {
            return
          }
          console.log('📊 Dashboard: Auth state changed', _event, session ? 'Session received' : 'No session')
          
          if (!session) {
            if (_event === 'SIGNED_OUT') {
              console.log('📊 Dashboard: User signed out, redirecting')
              navigate('/')
            } else if (loading) {
              // If we're loading and have no session, redirect
              navigate('/')
            }
          } else {
            // We have a session - update user data
            updateUserData(session)
          }
        })
        subscription = data
        
        // If we still don't have a session, check again after a short delay
        // This handles the case where Supabase is still processing
        if (!hasSession) {
          setTimeout(async () => {
            // Check if this effect is still active
            if (currentEffectId !== effectIdRef.current) {
              return
            }
            const hasSessionNow = await checkSessionImmediately()
            if (!hasSessionNow && currentEffectId === effectIdRef.current) {
              console.log('📊 Dashboard: No session found after delay, redirecting')
              navigate('/')
            }
          }, 1000)
        }
        
      } catch (error) {
        console.error('❌ Dashboard: Error setting up auth listener:', error)
        // On error, try one more time after a delay
        setTimeout(async () => {
          if (currentEffectId !== effectIdRef.current) return
          const hasSession = await checkSessionImmediately()
          if (!hasSession && currentEffectId === effectIdRef.current) {
            setLoading(false)
            navigate('/')
          }
        }, 1500)
      }
    }

    setupAuthListener()
    
    return () => {
      // Increment effect ID to invalidate any pending async operations
      effectIdRef.current++
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [navigate])

  // Fetch latest scan on mount - only show once after signup
  useEffect(() => {
    const fetchLatestScan = async () => {
      if (!user?.id) return
      
      // Check if user has already seen the latest scan result
      const hasSeenKey = `has_seen_latest_scan_${user.id}`
      const hasSeen = localStorage.getItem(hasSeenKey)
      
      if (hasSeen === 'true') {
        console.log('📋 Dashboard: User has already seen latest scan, not showing')
        return
      }
      
      try {
        const { getScanHistory } = await import('@/utils/scanHistory')
        const scans = await getScanHistory(user.id)
        
        if (scans && scans.length > 0) {
          console.log('📋 Dashboard: Loaded latest scan for first-time display:', scans[0])
          setLatestScan(scans[0])
          setShowLatestScan(true)
          
          // Mark as seen immediately
          localStorage.setItem(hasSeenKey, 'true')
        } else {
          console.log('📋 Dashboard: No scans found')
        }
      } catch (error) {
        console.error('Error fetching latest scan:', error)
      }
    }

    fetchLatestScan()
  }, [user?.id])

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // If we've already loaded the user, don't show loading screen even if loading is true
  // This prevents React Strict Mode from resetting the UI
  if (loading && !hasLoadedRef.current) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              animation: 'spin 1s linear infinite',
              width: '48px',
              height: '48px',
              border: '2px solid #9333ea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: '#a1a1aa' }}>Loading dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Fallback if user is not set but loading is false
  // BUT: Always check localStorage first before showing fallback (OAuth might still be processing)
  const [showFallback, setShowFallback] = useState(false)
  const oauthCheckRef = useRef(false)
  
  useEffect(() => {
    // Always check localStorage when we don't have a user, regardless of loading state
    // This handles the case where OAuthCallback redirected before localStorage was written
    if (!user && !oauthCheckRef.current) {
      oauthCheckRef.current = true
      
      // Wait a bit to see if session appears in localStorage (OAuth callback might still be processing)
      const checkForSession = (attempt = 0) => {
        // Check if user was set (might have been set by another effect)
        if (user) {
          return
        }
        
        const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
        if (supabaseKeys.length > 0) {
          try {
            const sessionStr = localStorage.getItem(supabaseKeys[0])
            if (sessionStr) {
              const storedSession = JSON.parse(sessionStr)
              const sessionUser = storedSession?.currentSession?.user || storedSession?.user
              if (sessionUser) {
                setUser(sessionUser)
                const checks = getRemainingUserChecks(sessionUser.id)
                setRemainingChecks(checks)
                
                // Fetch stats from database asynchronously
                import('@/utils/scanHistory').then(({ getUserStatsFromDatabase }) => {
                  getUserStatsFromDatabase(sessionUser.id).then(userStats => {
                    setStats(userStats)
                  }).catch(err => {
                    console.error('Error fetching stats:', err)
                  })
                })
                
                setLoading(false)
                hasLoadedRef.current = true
                return
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Retry up to 20 times (4 seconds total) - increased for OAuth processing time
        if (attempt < 20) {
          setTimeout(() => checkForSession(attempt + 1), 200)
        } else {
          // Only show fallback if loading is also false
          if (!loading) {
            setShowFallback(true)
          }
        }
      }
      
      // Start checking immediately
      checkForSession()
    } else if (!loading && !user && oauthCheckRef.current) {
      // We've already checked, and still no user - show fallback
      setShowFallback(true)
    }
  }, [loading, user]) // Removed getRemainingUserChecks from dependencies - it's a stable function
  
  if (!loading && !user && showFallback) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Unable to load dashboard</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }
  
  // If we're waiting for OAuth session, show loading
  if (!loading && !user && !showFallback) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              animation: 'spin 1s linear infinite',
              width: '48px',
              height: '48px',
              border: '2px solid #9333ea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: '#a1a1aa' }}>Loading dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }
  

  return (
    <div 
      className="min-h-screen bg-background" 
      style={{ 
        minHeight: '100vh',
        backgroundColor: '#0a0a0a', 
        color: '#ffffff',
        paddingTop: '64px'
      }}
    >
      <Header />
      <main 
        className="container mx-auto px-4 py-8 max-w-7xl" 
        style={{ 
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '32px 16px',
          color: '#ffffff'
        }}
      >
        
        {/* Welcome Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#ffffff' }}>
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}! 👋
              </h1>
              <p style={{ color: '#a1a1aa' }}>
                Manage your scam detection activity and track your protection stats
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Checks</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{remainingChecks}</div>
                  <p className="text-xs text-muted-foreground">
                    {remainingChecks > 0 ? 'Ready to scan' : 'Upgrade for more'}
                  </p>
                </div>
                <a
                  href="/pricing"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-medium transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Get more
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground">
                All-time scans performed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scams Detected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scamsDetected}</div>
              <p className="text-xs text-muted-foreground">
                Threats identified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious Results</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspiciousResults}</div>
              <p className="text-xs text-muted-foreground">
                Potentially risky content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safe Results</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.safeResults}</div>
              <p className="text-xs text-muted-foreground">
                Verified safe content
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Start a new scan or view your history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => {
                  // Navigate to home page with hash, then scroll smoothly
                  if (window.location.pathname === '/') {
                    // Already on home page, just scroll
                    const detectorSection = document.getElementById('detector')
                    if (detectorSection) {
                      detectorSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  } else {
                    // Navigate to home page with hash
                    window.location.href = '/#detector'
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-base h-14 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] border-0"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Start New Scan
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'Hide' : 'View'} Scan History
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Info and Plan - Side by Side */}
              <div className="flex items-stretch gap-4">
                {/* Left: User Info (50%) */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      {user?.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {user?.user_metadata?.full_name || user?.email || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Member since</p>
                    <p className="font-medium text-sm">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Recently'}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-border"></div>

                {/* Right: Current Plan & Upgrade - Centered (50%) */}
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Current Plan</p>
                    <div className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                      <span className="text-sm font-bold text-purple-300">FREE PLAN</span>
                    </div>
                  </div>
                  <a
                    href="/pricing"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold transition-all hover:scale-105 shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Upgrade Plan
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Scan Result - Auto Display */}
        {latestScan && showLatestScan && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Latest Scan Result</CardTitle>
                <CardDescription>Your most recent scan</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLatestScan(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResultCard
                result={latestScan.analysis_result}
                onNewAnalysis={() => {
                  window.location.href = '/#detector'
                }}
                onReportScam={() => {}}
              />
            </CardContent>
          </Card>
        )}

        {/* Scan History Section */}
        <Card className={`mb-8 ${!showHistory ? 'hidden' : ''}`}>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
            <CardDescription>View your latest 3 scans</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedScan ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedScan(null)}
                  className="mb-4"
                >
                  ← Back to History
                </Button>
                <ResultCard
                  result={selectedScan.analysis_result}
                  onNewAnalysis={() => setSelectedScan(null)}
                  onReportScam={() => {}}
                />
              </div>
            ) : (
              <ScanHistory
                userId={user?.id}
                onScanClick={(scan) => setSelectedScan(scan)}
                onRefresh={refreshStats}
              />
            )}
          </CardContent>
        </Card>

        {/* Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Features</CardTitle>
            <CardDescription>What you can do with your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Unlimited Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Get 5 free checks on signup, then upgrade for unlimited scans
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Full Detailed Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    Access comprehensive analysis reports for every scan
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Priority Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Faster analysis times for logged-in users
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Analysis History</h4>
                  <p className="text-sm text-muted-foreground">
                    Track all your scans and results (coming soon)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default Dashboard
