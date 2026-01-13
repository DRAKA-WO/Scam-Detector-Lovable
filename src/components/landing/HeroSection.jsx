function HeroSection() {
  return (
    <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-16 overflow-hidden">
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
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">AI-Powered Protection</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Detect Scams <span className="gradient-text">Before</span>
            <br />
            <span className="gradient-text">They Catch You</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload suspicious images, paste URLs, or enter text messages to instantly identify phishing attempts, fraud
            schemes, and online scams with advanced AI analysis.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#detector"
              className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"
            >
              Start Scanning
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
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
          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
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

          {/* Browser Extension Section - Premium Card Design */}
          <div className="mt-16 sm:mt-20">
            <div className="relative max-w-xl mx-auto">
              {/* Glow effect behind card */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 blur-3xl rounded-3xl" />
              
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="relative block bg-card/60 backdrop-blur-xl border border-border hover:border-primary/50 rounded-2xl p-6 sm:p-8 transition-all duration-500 group hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
                  {/* Chrome Logo */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-card to-secondary flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                      {/* Chrome Icon - Accurate */}
                      <svg className="w-10 h-10 sm:w-12 sm:h-12" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" fill="white" />
                        <path d="M24 8C15.163 8 8 15.163 8 24H16C16 19.582 19.582 16 24 16V8Z" fill="#EA4335" />
                        <path d="M24 8V16C28.418 16 32 19.582 32 24H40C40 15.163 32.837 8 24 8Z" fill="#FBBC05" />
                        <path d="M40 24H32C32 28.418 28.418 32 24 32L20 40.928C32.837 40.928 40 32.837 40 24Z" fill="#34A853" />
                        <path d="M24 32C19.582 32 16 28.418 16 24H8C8 32.837 15.163 40 24 40V32Z" fill="#4285F4" />
                        <circle cx="24" cy="24" r="8" fill="white" />
                        <circle cx="24" cy="24" r="6" fill="#4285F4" />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        FREE
                      </span>
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
                        Chrome Extension
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      Get ScamGuard for Chrome
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time protection while you browse. Instant scam alerts on any website.
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>4.9 rating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>10K+ users</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Verified</span>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
