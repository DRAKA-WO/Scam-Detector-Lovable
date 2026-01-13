import { useScrollAnimation } from '../../hooks/useScrollAnimation'

function HeroSection() {
  const { ref: badgeRef, isVisible: badgeVisible } = useScrollAnimation()
  const { ref: headingRef, isVisible: headingVisible } = useScrollAnimation()
  const { ref: subtitleRef, isVisible: subtitleVisible } = useScrollAnimation()
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation()
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation()

  return (
    <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(270 70% 60% / 0.4) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute top-1/4 left-0 w-96 h-96 opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(320 75% 55% / 0.5) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute top-1/3 right-0 w-96 h-96 opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(280 80% 55% / 0.5) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div 
            ref={badgeRef}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 transition-all duration-700 ${
              badgeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">AI-Powered Protection</span>
          </div>

          {/* Main Heading */}
          <h1 
            ref={headingRef}
            className={`font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100 ${
              headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Detect Scams{' '}
            <span className="gradient-text">Before</span>
            <br />
            <span className="gradient-text">They Catch You</span>
          </h1>

          {/* Subtitle */}
          <p 
            ref={subtitleRef}
            className={`text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${
              subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Upload suspicious images, paste URLs, or enter text messages to instantly identify 
            phishing attempts, fraud schemes, and online scams with advanced AI analysis.
          </p>

          {/* CTA Buttons */}
          <div 
            ref={ctaRef}
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
              ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <a
              href="#detector"
              className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"
            >
              Start Scanning
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="text-foreground hover:text-primary px-8 py-4 rounded-xl text-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              Learn More
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          {/* Stats */}
          <div 
            ref={statsRef}
            className={`mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto transition-all duration-700 delay-500 ${
              statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="text-center">
              <div className="font-display text-2xl sm:text-4xl font-bold gradient-text">50K+</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Scans Performed</div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-4xl font-bold gradient-text">99%</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Detection Rate</div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-4xl font-bold gradient-text">Free</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">To Use</div>
            </div>
          </div>

          {/* Browser Extension Badge - Small & Modern */}
          <div 
            className={`mt-12 transition-all duration-700 delay-700 ${
              statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/50 backdrop-blur-sm border border-border hover:border-purple-500/50 transition-all duration-300 group hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
            >
              {/* Chrome Icon */}
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              
              {/* Text */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground group-hover:text-purple-400 transition-colors">
                  Get Browser Extension
                </span>
                <svg className="w-3 h-3 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
