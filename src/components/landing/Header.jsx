import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { isUserLoggedIn } from '../../utils/checkLimits'

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              How it Works
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              FAQ
            </a>
          </nav>

          {/* CTA Button / Dashboard Link / Logout */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
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
            ) : null}
            <a
              href="#detector"
              className="gradient-button text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              Try Now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
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
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                How it Works
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                FAQ
              </a>
              {isLoggedIn && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  >
                    Dashboard
                  </Link>
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
              )}
              <a
                href="#detector"
                className="gradient-button text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 w-fit"
              >
                Try Now
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
