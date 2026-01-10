import { useState, useEffect } from 'react'
import { isUserLoggedIn } from '../../utils/checkLimits'
import SignupModal from '../SignupModal'
import LoginModal from '../LoginModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Sparkles, PlayCircle, HelpCircle } from "lucide-react"

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await isUserLoggedIn()
      setIsLoggedIn(loggedIn)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const setupAuthListener = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsLoggedIn(!!session)
        })
        return () => subscription.unsubscribe()
      } catch (error) {
        // Supabase not available
      }
    }
    
    setupAuthListener()
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
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
              <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700 w-64 p-1">
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
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Blog
            </a>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Pricing
            </a>
            <a href="/for-business" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              For Business
            </a>
          </nav>

          {/* CTA Button / Dashboard Link / Logout */}
          <div className="hidden md:flex items-center gap-4">
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
                      const { supabase } = await import('@/integrations/supabase/client')
                      await supabase.auth.signOut()
                      window.location.href = '/'
                    } catch (error) {
                      console.error('Logout error:', error)
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  Logout
                </button>
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
              <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Blog
              </a>
              <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Pricing
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
                        const { supabase } = await import('@/integrations/supabase/client')
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
              const { supabase } = await import('@/integrations/supabase/client')
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
