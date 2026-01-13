import Header from "../components/landing/Header";
import Footer from "../components/landing/Footer";

function Business() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
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
            className="absolute top-1/4 right-0 w-96 h-96 opacity-20"
            style={{
              background:
                "radial-gradient(circle, hsl(280 80% 55% / 0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Enterprise Solution</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Scams start before payment.{" "}
                <span className="gradient-text">So should your protection.</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                Give your customers confidence in your brand with a self-service scam checker 
                powered by ScamGuard AI. Protect your users, reduce support costs, and build trust.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#contact"
                  className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-transform"
                >
                  Get in Touch
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a
                  href="#why-scamguard"
                  className="border border-border bg-card/50 backdrop-blur-sm text-foreground hover:border-primary/50 px-8 py-4 rounded-xl text-lg font-medium inline-flex items-center justify-center gap-2 transition-all"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-square">
                {/* Abstract illustration placeholder */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent border border-border/50 backdrop-blur-sm" />
                <div className="absolute inset-8 rounded-2xl bg-card/80 border border-border flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-button flex items-center justify-center">
                      <svg className="w-10 h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Enterprise Protection</h3>
                    <p className="text-sm text-muted-foreground">White-label scam detection for your platform</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 border-y border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by leading organizations</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60">
            {/* Placeholder logos */}
            {["TechCorp", "FinanceHub", "SecureBank", "TrustNet", "SafePay"].map((name) => (
              <div key={name} className="text-lg sm:text-xl font-display font-bold text-muted-foreground/50">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Every platform needs a <span className="gradient-text">scam checker</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Protect your customers before it's too late
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="feature-card rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Break the spell before it's cast
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Once a customer is ready to pay, it is often too late to change their mind. 
                Giving them the tools to check when something doesn't feel right can stop the scammer in their tracks.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feature-card rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Reduce manual interventions
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                When customers check scams upstream and on their own terms, you avoid the need for 
                last-minute interventions. It saves your team time and spares customers frustration.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feature-card rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Close the gaps in your protection
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                It's not practical to intervene in low-value, high-volume cases. A scam checker 
                fills the gap, offering protection where direct intervention isn't feasible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why ScamGuard Section */}
      <section id="why-scamguard" className="py-20 sm:py-28 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Your customers are already asking about scams.{" "}
                <span className="gradient-text">Make sure the answer comes from you.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Thousands of people check for scams every month, including your customers. 
                They are looking for guidance on suspicious texts, unusual payment requests, and unfamiliar websites.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                That same protection should be available to all of your customers as part of your 
                journey, under your brand, wherever it is needed.
              </p>
              <a
                href="#contact"
                className="gradient-button text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
              >
                Get in Touch
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>

            {/* Right - Features Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ),
                  title: "Trusted Scam Detection",
                  description: "Built a reputation as a go-to destination for scam checking, trusted by thousands."
                },
                {
                  icon: (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  ),
                  title: "Hundreds of Data Points",
                  description: "Deeper research across hundreds of data points for more accurate responses."
                },
                {
                  icon: (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  ),
                  title: "Real-World Data",
                  description: "Over 50,000 scans analyzed, giving us more patterns and insights than anyone else."
                },
                {
                  icon: (
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                  title: "Expert Insight",
                  description: "Responses shaped by specialists in behavioral psychology and security."
                }
              ].map((feature, index) => (
                <div key={index} className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h4 className="font-display font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Beyond <span className="gradient-text">Traditional Security</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              ScamGuard isn't just for banks. We partner with organizations across industries 
              to help protect people wherever scams reach them.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🏦", title: "Banks & Finance", desc: "Protect customers during transactions" },
              { icon: "🛒", title: "E-commerce", desc: "Prevent marketplace fraud" },
              { icon: "📱", title: "Telecom", desc: "Block SMS and call scams" },
              { icon: "🏛️", title: "Government", desc: "Protect citizens from impersonation" }
            ].map((useCase, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-card/30 border border-border hover:border-primary/30 transition-colors">
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h4 className="font-display font-semibold text-foreground mb-2">{useCase.title}</h4>
                <p className="text-sm text-muted-foreground">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 sm:py-28 bg-gradient-to-b from-card/50 to-background border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-8 rounded-2xl gradient-button flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to protect your customers?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Let's discuss how ScamGuard can be integrated into your platform. 
              We offer flexible solutions for businesses of all sizes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:business@scamguard.com"
                className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-transform"
              >
                Contact Sales
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="/"
                className="border border-border bg-card/50 backdrop-blur-sm text-foreground hover:border-primary/50 px-8 py-4 rounded-xl text-lg font-medium inline-flex items-center justify-center gap-2 transition-all"
              >
                Try the Free Tool
              </a>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Or email us at <a href="mailto:business@scamguard.com" className="text-primary hover:underline">business@scamguard.com</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Business;
