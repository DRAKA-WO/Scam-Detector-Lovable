import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle, Clock, TrendingUp, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getRemainingUserChecks, getUserStats } from '@/utils/checkLimits'

function Dashboard() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:component-render',message:'Dashboard component rendering',data:{url:window.location.href,hash:window.location.hash},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [remainingChecks, setRemainingChecks] = useState(0)
  const [stats, setStats] = useState({
    totalScans: 0,
    scamsDetected: 0,
    safeResults: 0,
    suspiciousResults: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:useEffect:entry',message:'useEffect started',data:{loading,hasUser:!!user,url:window.location.href,hash:window.location.hash},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    let mounted = true
    let subscription = null
    
    // Helper to update user data
    const updateUserData = (session) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:updateUserData:entry',message:'updateUserData called',data:{mounted,hasSession:!!session,hasUser:!!session?.user,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!mounted || !session?.user) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:updateUserData:early-return',message:'Early return from updateUserData',data:{mounted,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return false
      }
      
      console.log('📊 Dashboard: Updating user data', session.user.email)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:updateUserData:before-setState',message:'Before setState calls',data:{userId:session.user.id,email:session.user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setUser(session.user)
      
      // Get user's remaining checks
      const checks = getRemainingUserChecks(session.user.id)
      console.log('📊 Dashboard: User checks', checks)
      setRemainingChecks(checks)
      
      // Get user stats
      const userStats = getUserStats(session.user.id)
      console.log('📊 Dashboard: User stats', userStats)
      setStats(userStats)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:updateUserData:before-setLoading',message:'Before setLoading(false)',data:{checks,stats:userStats},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setLoading(false)
      
      // Clear hash if it exists
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:updateUserData:exit',message:'updateUserData completed',data:{success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return true
    }
    
    // Check session immediately and synchronously
    const checkSessionImmediately = async () => {
      try {
        console.log('📊 Dashboard: Checking session immediately...')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:before-import',message:'Before Supabase import',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const { supabase } = await import('@/integrations/supabase/client')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:after-import',message:'After Supabase import',data:{hasSupabase:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const { data: { session }, error } = await supabase.auth.getSession()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:after-getSession',message:'After getSession call',data:{hasSession:!!session,hasError:!!error,error:error?.message,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        
        if (error) {
          console.error('❌ Dashboard: Session error', error)
          return false
        }
        
        if (session?.user) {
          console.log('📊 Dashboard: Session found immediately')
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:session-found',message:'Session found, calling updateUserData',data:{userId:session.user.id,email:session.user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
          // #endregion
          return updateUserData(session)
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:no-session',message:'No session found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        return false
      } catch (error) {
        console.error('❌ Dashboard: Error checking session', error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:checkSessionImmediately:error',message:'Error in checkSessionImmediately',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return false
      }
    }
    
    // Set up auth listener
    const setupAuthListener = async () => {
      try {
        console.log('📊 Dashboard: Setting up auth listener...')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:entry',message:'setupAuthListener started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const { supabase } = await import('@/integrations/supabase/client')
        
        // Check session immediately first
        const hasSession = await checkSessionImmediately()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:after-checkSession',message:'After checkSessionImmediately',data:{hasSession,mounted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (hasSession && mounted) {
          // We already have a session, we're done
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:early-return',message:'Early return - session found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          return
        }
        
        // Set up listener for future changes
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:onAuthStateChange:event',message:'Auth state change event fired',data:{event:_event,hasSession:!!session,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log('📊 Dashboard: Auth state changed', _event, session ? 'Session received' : 'No session')
          
          if (!session) {
            if (mounted && _event === 'SIGNED_OUT') {
              console.log('📊 Dashboard: User signed out, redirecting')
              navigate('/')
            } else if (mounted && !loading) {
              // If we're not loading and have no session, redirect
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
        if (!hasSession && mounted) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:setting-timeout',message:'Setting timeout for retry',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setTimeout(async () => {
            if (mounted && loading) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:timeout-callback',message:'Timeout callback executing',data:{mounted,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              const hasSessionNow = await checkSessionImmediately()
              if (!hasSessionNow && mounted) {
                console.log('📊 Dashboard: No session found after delay, redirecting')
                navigate('/')
              }
            }
          }, 1000)
        }
        
      } catch (error) {
        console.error('❌ Dashboard: Error setting up auth listener:', error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:setupAuthListener:error',message:'Error in setupAuthListener',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (mounted) {
          // On error, try one more time after a delay
          setTimeout(async () => {
            if (mounted && loading) {
              const hasSession = await checkSessionImmediately()
              if (!hasSession && mounted) {
                setLoading(false)
                navigate('/')
              }
            }
          }, 1500)
        }
      }
    }

    setupAuthListener()
    
    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [navigate, loading])

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
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
  if (!loading && !user) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Checks</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{remainingChecks}</div>
              <p className="text-xs text-muted-foreground">
                {remainingChecks > 0 ? 'Ready to scan' : 'Upgrade for more'}
              </p>
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
                onClick={() => navigate('/#detector')}
                className="w-full"
                size="lg"
              >
                Start New Scan
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled
              >
                View Scan History (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
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
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Member since</p>
                <p className="font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Recently'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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
