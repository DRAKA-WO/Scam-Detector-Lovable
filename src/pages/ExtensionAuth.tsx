import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { syncSessionToExtension } from '@/utils/extensionSync'
import LoginModal from '@/components/LoginModal'
import SignupModal from '@/components/SignupModal'

function ExtensionAuth() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authSuccess, setAuthSuccess] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSignup = searchParams.get('mode') === 'signup'
  const providerGoogle = searchParams.get('provider') === 'google'
  const [redirectingToGoogle, setRedirectingToGoogle] = useState(false)

  // Check if user is already logged in - sync to extension and show success
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Sync session to extension with auth metadata update - this will fetch database avatar and update auth metadata
          // Extension fetches checks/plan from Supabase when popup opens
          await syncSessionToExtension(session, session.user.id, null, null, true)
          
          // Show success message
          setIsCheckingAuth(false)
          setAuthSuccess(true)
          
          // Request extension to close the tab after showing success message
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scamChecker:closeTab'));
          }, 3000)
          return
        }
        
        // Not logged in
        setIsCheckingAuth(false)
        if (providerGoogle) {
          setRedirectingToGoogle(true)
          return
        }
        setShowAuthModal(true)
      } catch (error) {
        console.error('Error checking auth:', error)
        setIsCheckingAuth(false)
        setShowAuthModal(true)
      }
    }
    checkAuth()
  }, [providerGoogle])

  // When provider=google, redirect directly to Google OAuth (no modal)
  useEffect(() => {
    if (!redirectingToGoogle || authSuccess) return
    let cancelled = false
    const run = async () => {
      try {
        sessionStorage.setItem('oauth_from_extension_auth', 'true')
        const redirectUrl = `${window.location.origin}/auth/callback`
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl },
        })
        if (cancelled) return
        if (error) {
          setRedirectingToGoogle(false)
          setShowAuthModal(true)
        }
      } catch {
        if (!cancelled) {
          setRedirectingToGoogle(false)
          setShowAuthModal(true)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [redirectingToGoogle, authSuccess])

  // Listen for auth state changes and check session periodically
  useEffect(() => {
    if (isCheckingAuth || authSuccess) return
    
    let intervalId: NodeJS.Timeout | null = null
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Close modal immediately
        setShowAuthModal(false)
        
        // Fetch user data from database first (avatar_url) - database is source of truth
        let sessionToSync = session;
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!userError && userData?.avatar_url) {
            // Create modified session with database avatar_url in user_metadata for extension sync
            sessionToSync = {
              ...session,
              user: {
                ...session.user,
                user_metadata: {
                  ...session.user.user_metadata,
                  avatar_url: userData.avatar_url,
                  picture: userData.avatar_url
                }
              }
            };
          }
        } catch (fetchErr) {
          console.warn('⚠️ [ExtensionAuth] Error fetching user data for extension sync:', fetchErr);
        }
        
        // Sync session with database avatar to extension - extension fetches checks/plan from Supabase when popup opens
        await syncSessionToExtension(sessionToSync, session.user.id)
        
        // Show success message
        setAuthSuccess(true)
        
        // Clear interval if it exists
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
        
        // Request extension to close the tab after showing success message
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('scamChecker:closeTab'));
        }, 3000)
      }
    })

    // Poll for session changes immediately and frequently
    intervalId = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Close modal
          setShowAuthModal(false)
          
          // Sync session to extension with auth metadata update - this will fetch database avatar and update auth metadata
          // Extension fetches checks/plan from Supabase when popup opens
          await syncSessionToExtension(session, session.user.id, null, null, true)
          
          // Show success message
          setAuthSuccess(true)
          
          // Clear interval
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          
          // Request extension to close the tab after showing success message
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('scamChecker:closeTab'));
          }, 3000)
        }
      } catch (error) {
        // Ignore errors
      }
    }, 200) // Check every 200ms for faster detection

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe()
      if (intervalId) clearInterval(intervalId)
    }
  }, [isCheckingAuth, authSuccess])

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Redirecting to Google OAuth (no modal)
  if (redirectingToGoogle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-foreground font-medium">Redirecting to Google...</p>
          <p className="text-muted-foreground text-sm mt-1">You will sign in with your Google account.</p>
        </div>
      </div>
    )
  }

  // Show success message after authentication
  if (authSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Successfully signed in!</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been synced to the extension. Click the extension icon to see your dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            This window will close automatically...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isSignup ? (
          <SignupModal
            isOpen={showAuthModal}
            preventRedirect={true}
            onClose={() => { setShowAuthModal(false); navigate('/'); }}
            onSignup={async (userId) => {
              const { data: { session } } = await supabase.auth.getSession()
              if (session) await syncSessionToExtension(session, userId)
              setAuthSuccess(true)
            }}
            onSwitchToLogin={() => navigate('/extension-auth')}
          />
        ) : (
          <LoginModal
            isOpen={showAuthModal}
            preventRedirect={true}
            onClose={() => { setShowAuthModal(false); navigate('/'); }}
          />
        )}
      </div>
    </div>
  )
}

export default ExtensionAuth
