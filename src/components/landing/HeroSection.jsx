import FloatingDiamond from "../ui/FloatingDiamond";
import chromeLogo from "@/assets/chrome-logo.svg";

function HeroSection() {
  return (
    <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-16 overflow-hidden">
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

          {/* Browser Extension - Dark Theme Pill */}
          <div className="mt-12">
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 px-6 py-3.5 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:border-primary/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 group hover:scale-105"
            >
              {/* Shield Icon - SIZE: w-6 h-6 */}
              <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              
              {/* TEXT - SIZE: text-base */}
              <span className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                Add to Chrome - it's free!
              </span>
              
              {/* Chrome Logo - SIZE: w-7 h-7 */}
              <img src={chromeLogo} alt="Chrome" className="w-7 h-7" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
