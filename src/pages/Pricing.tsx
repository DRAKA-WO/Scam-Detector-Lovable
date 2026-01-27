import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/landing/Header'
import Footer from '../components/landing/Footer'
import FloatingDiamond from '../components/ui/FloatingDiamond'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Zap, Shield, Puzzle, History, FileText, Clock, Bell } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import SignupModal from '../components/SignupModal'
import LoginModal from '../components/LoginModal'

const Pricing = () => {
  const navigate = useNavigate()
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [userPlan, setUserPlan] = useState<string>('FREE') // Default to FREE
  const [planLoaded, setPlanLoaded] = useState(false) // Track loading state
  const [billingPeriod, setBillingPeriod] = useState<'annual' | 'monthly'>('annual') // Annual is default
  const planReceivedRef = useRef(false) // Track if we've received a plan update from Header
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Track the fallback timeout

  // Listen for plan updates from Header component (Header already fetches the plan)
  // This avoids duplicate Supabase requests since Header is rendered on this page
  useEffect(() => {
    const handlePlanUpdate = (event: CustomEvent) => {
      const plan = event.detail?.plan || 'FREE'
      console.log(`📥 [Pricing] Received plan update from Header: ${plan}`)
      planReceivedRef.current = true // Mark that we received an update
      
      // Clear the fallback timeout since we got the plan
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
      
      setUserPlan(plan)
      setPlanLoaded(true)
    }

    // Listen for custom event from Header
    window.addEventListener('planUpdated', handlePlanUpdate as EventListener)

    // Check auth state immediately to handle logged-out users
    const checkAuthAndSetFallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          // User is not logged in, set to FREE immediately
          planReceivedRef.current = true
          setUserPlan('FREE')
          setPlanLoaded(true)
          return
        }
        
        // User is logged in - wait for Header to send the plan update
        // Set a fallback timeout only if we haven't received an update
        fallbackTimeoutRef.current = setTimeout(() => {
          // Only set to FREE if we still haven't received a plan update
          if (!planReceivedRef.current) {
            console.log(`⏱️ [Pricing] No plan update from Header after 3s, defaulting to FREE`)
            setUserPlan('FREE')
            setPlanLoaded(true)
          }
        }, 3000) // Wait 3 seconds for Header to fetch and dispatch
      } catch (error) {
        // On error, default to FREE
        planReceivedRef.current = true
        setUserPlan('FREE')
        setPlanLoaded(true)
      }
    }
    
    checkAuthAndSetFallback()

    // Listen for auth changes to reset plan
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        planReceivedRef.current = true
        setUserPlan('FREE')
        setPlanLoaded(true)
      } else {
        // User logged in - reset the flag and wait for Header's update
        planReceivedRef.current = false
        setPlanLoaded(false)
        // Set a new fallback timeout
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current)
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!planReceivedRef.current) {
            console.log(`⏱️ [Pricing] No plan update from Header after login, defaulting to FREE`)
            setUserPlan('FREE')
            setPlanLoaded(true)
          }
        }, 3000)
      }
    })

    return () => {
      window.removeEventListener('planUpdated', handlePlanUpdate as EventListener)
      subscription.unsubscribe()
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
    }
  }, []) // Empty deps - only run once on mount

  const allFeatures = [
    { icon: Puzzle, text: 'Browser Extension Access' },
    { icon: Shield, text: 'Image, URL & Text Analysis' },
    { icon: FileText, text: 'Full Detailed Reports' },
    { icon: History, text: 'Analysis History' },
    { icon: CheckCircle, text: 'AI-Powered Detection' },
    { icon: CheckCircle, text: 'Dashboard Access' },
  ]

  const premiumFeatures = [
    { icon: Bell, text: 'Smart Notifications & Alerts' },
    { icon: CheckCircle, text: 'Instant Results' },
    { icon: Clock, text: 'Priority Processing' },
  ]

  // Base annual prices (default)
  const planConfigs = [
    {
      name: 'Free',
      annualPrice: 0,
      monthlyPrice: 0,
      checks: 5,
      description: 'Perfect for trying out',
      popular: false,
      isFree: true,
    },
    {
      name: 'Pro',
      annualPrice: 6,
      monthlyPrice: 8, // 30% more than annual: 6 * 1.3 = 7.8, rounded to 8
      checks: 50,
      description: 'Ideal for regular users',
      popular: false,
      isFree: false,
    },
    {
      name: 'Premium',
      annualPrice: 10,
      monthlyPrice: 13, // 30% more than annual: 10 * 1.3 = 13
      checks: 100,
      description: 'Best for power users',
      popular: true,
      isFree: false,
    },
    {
      name: 'Ultra',
      annualPrice: 40,
      monthlyPrice: 52, // 30% more than annual: 40 * 1.3 = 52
      checks: 500,
      description: 'For heavy users and power users',
      popular: false,
      isFree: false,
    },
  ]

  const plans = planConfigs.map((config) => {
    const price = billingPeriod === 'annual' ? config.annualPrice : config.monthlyPrice
    const period = config.isFree ? '' : '/month'
    const billingNote = config.isFree ? '' : (billingPeriod === 'annual' ? '(Billed annually)' : '')
    const displayPrice = `$${price}`
    
    // Check if this is the user's current plan (only when plan is loaded)
    const isCurrentPlan = planLoaded && userPlan && (
      (config.name === 'Free' && userPlan === 'FREE') ||
      (config.name === 'Pro' && userPlan === 'PRO') ||
      (config.name === 'Premium' && userPlan === 'PREMIUM') ||
      (config.name === 'Ultra' && userPlan === 'ULTRA')
    )
    
    // Check if user has already claimed free plan (they're on Pro/Premium/Ultra)
    const hasClaimedFree = planLoaded && userPlan && config.isFree && (userPlan === 'PRO' || userPlan === 'PREMIUM' || userPlan === 'ULTRA')
    
    return {
      name: config.name,
      price: displayPrice,
      period,
      billingNote,
      checks: config.checks,
      description: config.description,
      popular: config.popular,
      buttonText: isCurrentPlan
        ? 'Current Plan'
        : hasClaimedFree
        ? 'Already Claimed'
        : config.isFree 
        ? (planLoaded && userPlan === 'FREE' ? 'Current Plan' : 'Get Started')
        : 'Upgrade Now',
      buttonAction: () => {
        if (isCurrentPlan || hasClaimedFree) {
          // Do nothing if it's their current plan or already claimed
          return
        }
        if (config.isFree) {
          if (planLoaded && userPlan === 'FREE') {
            // Already on free plan, do nothing or navigate to dashboard
            navigate('/dashboard')
          } else {
            setShowSignupModal(true)
          }
        } else {
          setShowSignupModal(true)
        }
      },
      disabled: isCurrentPlan || hasClaimedFree || (config.isFree && planLoaded && userPlan === 'FREE'),
      isFree: config.isFree,
      isCurrentPlan,
    }
  })

  const handleButtonClick = (plan: typeof plans[0]) => {
    if (plan.disabled) return
    plan.buttonAction()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="relative pt-24 sm:pt-32 pb-20 overflow-hidden">
        {/* Floating Diamonds */}
        <FloatingDiamond className="top-32 left-[10%]" delay={0} size="md" />
        <FloatingDiamond className="top-48 right-[12%]" delay={0.6} size="lg" />
        <FloatingDiamond className="bottom-24 left-[15%]" delay={1.2} size="sm" />
        <FloatingDiamond className="bottom-32 right-[18%]" delay={1.8} size="md" />

        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(270 70% 60% / 0.4) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/4 left-0 w-96 h-96 opacity-20"
            style={{
              background:
                "radial-gradient(circle, hsl(320 75% 55% / 0.5) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/3 right-0 w-96 h-96 opacity-20"
            style={{
              background:
                "radial-gradient(circle, hsl(280 80% 55% / 0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Simple, Transparent Pricing</span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Choose Your <span className="gradient-text">Plan</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
              Paid plans include additional features like instant results and priority processing. The main difference is the number of checks you get.
            </p>

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex rounded-lg bg-secondary border border-border p-1 gap-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`relative px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`relative px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-300 ${
                    billingPeriod === 'annual'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    Annual
                    {billingPeriod === 'annual' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30">
                        Save 30%
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
            {plans.map((plan, index) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-2 border-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/10 via-card to-card'
                    : 'border border-border bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-sm mb-4">{plan.description}</CardDescription>
                  
                  <div className="flex flex-col items-center justify-center gap-1 mb-2">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground text-lg">{plan.period}</span>
                      )}
                    </div>
                    {plan.billingNote && (
                      <span className="text-muted-foreground text-sm">{plan.billingNote}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">
                      {typeof plan.checks === 'number' 
                        ? plan.isFree 
                          ? `${plan.checks} checks` 
                          : `${plan.checks} checks per month`
                        : plan.checks}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {plan.popular ? (
                    <Button
                      onClick={() => handleButtonClick(plan)}
                      disabled={plan.disabled}
                      className="w-full h-11 mb-6 gradient-button text-primary-foreground"
                    >
                      {plan.buttonText}
                    </Button>
                  ) : (
                    <div className="w-full mb-6 border border-border rounded-md bg-secondary/50">
                      <Button
                        onClick={() => handleButtonClick(plan)}
                        disabled={plan.disabled}
                        className={`w-full h-11 ${
                          plan.disabled
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        {plan.buttonText}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {plan.isFree ? 'Free Plan Includes:' : 'All Plans Include:'}
                    </div>
                    {allFeatures.map((feature, featureIndex) => {
                      const Icon = feature.icon
                      return (
                        <div key={featureIndex} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature.text}</span>
                        </div>
                      )
                    })}
                    {!plan.isFree && premiumFeatures.map((feature, featureIndex) => {
                      const Icon = feature.icon
                      return (
                        <div key={`premium-${featureIndex}`} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                Frequently Asked <span className="gradient-text">Questions</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to know about our scam detection plans
              </p>
            </div>

            {/* FAQ List */}
            <div className="space-y-4">
              <div className="bg-card/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/30">
                <div className="px-6 py-5">
                  <h3 className="font-medium text-foreground mb-3">What happens when I run out of checks?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You can upgrade to a paid plan at any time to get more checks. All your analysis history and features remain the same.
                  </p>
                </div>
              </div>
              
              <div className="bg-card/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/30">
                <div className="px-6 py-5">
                  <h3 className="font-medium text-foreground mb-3">Can I change plans later?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </div>
              </div>
              
              <div className="bg-card/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/30">
                <div className="px-6 py-5">
                  <h3 className="font-medium text-foreground mb-3">Do checks roll over?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Checks reset monthly based on your plan. Unused checks do not roll over to the next month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={async () => {}}
        remainingChecks={0}
        hideOutOfChecksMessage={true}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}

export default Pricing
