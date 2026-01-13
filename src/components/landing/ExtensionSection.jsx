function ExtensionSection() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(270 70% 60% / 0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Extension Download Card */}
          <div className="relative group">
            {/* Glow effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-500"></div>
            
            {/* Main Card */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 sm:p-10 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Left side - Icon & Text */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Extension Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  
                  {/* Text */}
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                      Get the Browser Extension
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Scan any webpage instantly - it's free!
                    </p>
                  </div>
                </div>

                {/* Right side - Chrome Download Button */}
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 group/btn"
                >
                  <div className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                    {/* Chrome Logo */}
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="#fff"/>
                      <circle cx="12" cy="12" r="6" fill="#1a73e8"/>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" stroke="#fff" strokeWidth="0.5"/>
                      <path d="M12 2v10l-8.66 5L12 2z" fill="#ea4335" opacity="0.9"/>
                      <path d="M12 12l8.66 5L12 22V12z" fill="#34a853" opacity="0.9"/>
                      <path d="M12 12V2l8.66 5L12 12z" fill="#fbbc04" opacity="0.9"/>
                    </svg>
                    
                    {/* Text */}
                    <span className="text-white font-semibold whitespace-nowrap">
                      Add to Chrome
                    </span>
                    
                    {/* Arrow */}
                    <svg className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              </div>

              {/* Optional: Feature Pills */}
              <div className="mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  One-click scanning
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Works on any site
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  100% Free
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExtensionSection
