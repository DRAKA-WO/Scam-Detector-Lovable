import { useState, useEffect } from 'react'
import { isUserLoggedIn, getRemainingFreeChecks, getRemainingUserChecks } from '../../utils/checkLimits'
import SignupModal from '../SignupModal'
import LoginModal from '../LoginModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Sparkles, PlayCircle, HelpCircle, MessageCircle, Zap, User, Settings, Gift, Mail, LogOut } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [remainingChecks, setRemainingChecks] = useState(0)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)

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
            const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
            const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
            setUserName(fullName)
            setUserAvatar(avatarUrl)
            setAvatarError(false) // Reset error when avatar changes
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
          }
        } catch (error) {
          console.error('Error getting session:', error)
        }
      } else {
        const checks = getRemainingFreeChecks()
        setRemainingChecks(checks)
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
            const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
            const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
            
            setUserName(fullName)
            setUserAvatar(avatarUrl)
            setAvatarError(false) // Reset error when avatar changes
            const checks = getRemainingUserChecks(session.user.id)
            setRemainingChecks(checks)
          } else {
            setUserId(null)
            setUserEmail('')
            setUserName('')
            setUserAvatar('')
            setAvatarError(false)
            const checks = getRemainingFreeChecks()
            setRemainingChecks(checks)
          }
        })
        return () => subscription.unsubscribe()
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
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('checksUpdated', handleStorageChange)
    }
  }, [isLoggedIn, userId])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1 outline-none">
                Resources
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700 w-[500px] p-3">
                <div className="grid grid-cols-2 gap-3">
                  <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                    <a href="#features" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
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
                    <a href="#how-it-works" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
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
                    <a href="#faq" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
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
                    <a href="/support" className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        <MessageCircle className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">Support</div>
                        <div className="text-gray-400 text-xs mt-0.5">Get help from our support team</div>
                      </div>
                    </a>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Pricing
            </a>
            <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Blog
            </a>
            <a href="/for-business" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              For Business
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
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  >
                    Dashboard
                  </a>
                )}
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                    {userAvatar && !avatarError ? (
                      <img 
                        src={userAvatar} 
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
                            src={userAvatar} 
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
                      <div className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-md font-medium">
                        FREE PLAN
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
                          <Settings className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-200 text-sm">Account details</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/pricing" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
                          <Zap className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-200 text-sm">Upgrade your plan</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/refer" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
                          <Gift className="h-4 w-4 text-green-400" />
                          <span className="text-gray-200 text-sm">Refer and earn</span>
                        </a>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <a href="/support" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 rounded-md transition-colors w-full">
                          <Mail className="h-4 w-4 text-orange-400" />
                          <span className="text-gray-200 text-sm">Contact us</span>
                        </a>
                      </DropdownMenuItem>
                    </div>

                    {/* Logout Button */}
                    <div className="p-2 border-t border-gray-700">
                      <button
                        onClick={async () => {
                          try {
                            await supabase.auth.signOut()
                            window.location.href = '/'
                          } catch (error) {
                            console.error('Logout error:', error)
                          }
                        }}
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
                  onClick={() => setShowLoginModal(true)}
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
              <a href="#features" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">Features</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Explore our powerful AI detection capabilities</div>
                </div>
              </a>
              <a href="#how-it-works" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <PlayCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">How it Works</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Learn how our scam detection system works</div>
                </div>
              </a>
              <a href="#faq" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <HelpCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">FAQ</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Find answers to frequently asked questions</div>
                </div>
              </a>
              <a href="/support" className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium text-sm">Support</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Get help from our support team</div>
                </div>
              </a>
              <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Pricing
              </a>
              <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Blog
              </a>
              <a href="/for-business" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                For Business
              </a>
              {isLoggedIn ? (
                <>
                  <a
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut()
                        window.location.href = '/'
                      } catch (error) {
                        console.error('Logout error:', error)
                      }
                    }}
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
                      setShowLoginModal(true)
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowSignupModal(true)
                    }}
                    className="gradient-button text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 w-fit"
                  >
                    Try for Free
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={async (method) => {
          if (method === 'google') {
            try {
              const { error, data } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`
                }
              })
              
              if (error) {
                console.error('Supabase OAuth error:', error)
                alert(error.message || 'Google signup failed. Please try again.')
                return
              }
              
              // OAuth redirect will happen automatically
              console.log('OAuth redirect initiated:', data)
            } catch (error) {
              console.error('Signup error:', error)
              alert('An error occurred. Please try again.')
            }
          } else if (method === 'login') {
            // Switch to login modal
            setShowSignupModal(false)
            setShowLoginModal(true)
          }
        }}
        onSwitchToLogin={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
        remainingChecks={0}
      />

      {/* Login Modal */}
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
    </header>
  )
}

export default Header
