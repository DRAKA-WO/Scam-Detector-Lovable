import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Header from "../components/landing/Header";
import Footer from "../components/landing/Footer";

// Floating diamond decoration component
const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-16 h-16",
};

const FloatingDiamond = ({
  className,
  delay = 0,
  size = "md"
}: {
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}) => <motion.div className={`absolute pointer-events-none ${className}`} initial={{
  opacity: 0,
  y: 20
}} animate={{
  opacity: [0.3, 0.6, 0.3],
  y: [0, -15, 0],
  rotate: [0, 10, 0]
}} transition={{
  duration: 4,
  delay,
  repeat: Infinity,
  ease: "easeInOut"
}}>
    <div className={`${sizeClasses[size]} border-2 border-purple-500/30 rotate-45 rounded-sm`} />
  </motion.div>;

// Animated section wrapper with scroll reveal
const AnimatedSection = ({
  children,
  className = "",
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px"
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    y: 60
  }} animate={isInView ? {
    opacity: 1,
    y: 0
  } : {
    opacity: 0,
    y: 60
  }} transition={{
    duration: 0.8,
    delay,
    ease: [0.25, 0.1, 0.25, 1]
  }} className={className}>
      {children}
    </motion.div>;
};

// Staggered children animation
const StaggerContainer = ({
  children,
  className = "",
  staggerDelay = 0.1
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px"
  });
  return <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={{
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }} className={className}>
      {children}
    </motion.div>;
};
const StaggerItem = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) => <motion.div variants={{
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}} className={className}>
    {children}
  </motion.div>;
function Business() {
  return <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div initial={{
          opacity: 0,
          scale: 0.8
        }} animate={{
          opacity: 0.3,
          scale: 1
        }} transition={{
          duration: 1.5,
          ease: "easeOut"
        }} className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px]" style={{
          background: "radial-gradient(ellipse at center, hsl(270 70% 60% / 0.4) 0%, transparent 70%)"
        }} />
          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 0.2
        }} transition={{
          duration: 2,
          delay: 0.3
        }} className="absolute top-1/4 right-0 w-96 h-96" style={{
          background: "radial-gradient(circle, hsl(280 80% 55% / 0.5) 0%, transparent 70%)"
        }} />
        </div>

        {/* Floating decorations */}
        <FloatingDiamond className="top-32 left-[10%]" delay={0} />
        <FloatingDiamond className="bottom-24 left-[20%]" delay={1.2} />
        <FloatingDiamond className="bottom-32 right-[12%]" delay={1.8} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6,
              delay: 0.2
            }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Enterprise Solution</span>
              </motion.div>

              <motion.h1 initial={{
              opacity: 0,
              y: 30
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8,
              delay: 0.3
            }} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Scams start before payment.{" "}
                <span className="gradient-text">So should your protection.</span>
              </motion.h1>

              <motion.p initial={{
              opacity: 0,
              y: 30
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8,
              delay: 0.4
            }} className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                Give your customers confidence in your brand with a self-service scam checker 
                powered by ScamGuard AI. Protect your users, reduce support costs, and build trust.
              </motion.p>

              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6,
              delay: 0.5
            }} className="flex flex-col sm:flex-row gap-4">
                <motion.a href="#contact" whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.98
              }} className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-lg">
                  Get in Touch
                  <motion.svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" initial={{
                  x: 0
                }} whileHover={{
                  x: 5
                }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </motion.svg>
                </motion.a>
                <motion.a href="#why-scamguard" whileHover={{
                scale: 1.02,
                borderColor: "hsl(var(--primary) / 0.5)"
              }} whileTap={{
                scale: 0.98
              }} className="border border-border bg-card/50 backdrop-blur-sm text-foreground px-8 py-4 rounded-xl text-lg font-medium inline-flex items-center justify-center gap-2 transition-colors">
                  Learn More
                </motion.a>
              </motion.div>
            </div>

            {/* Right Illustration */}
            <motion.div initial={{
            opacity: 0,
            scale: 0.9,
            rotate: -5
          }} animate={{
            opacity: 1,
            scale: 1,
            rotate: 0
          }} transition={{
            duration: 1,
            delay: 0.4,
            ease: [0.25, 0.1, 0.25, 1]
          }} className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-square">
                {/* Animated rings */}
                <motion.div className="absolute inset-0 rounded-3xl border border-purple-500/20" animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3]
              }} transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }} />
                <motion.div className="absolute inset-4 rounded-3xl border border-purple-500/15" animate={{
                scale: [1, 1.03, 1],
                opacity: [0.2, 0.4, 0.2]
              }} transition={{
                duration: 3,
                delay: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }} />
                
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent border border-border/50 backdrop-blur-sm" />
                
                {/* Big floating diamond in corner - behind the box */}
                <div className="absolute -top-6 -right-6 -z-10">
                  <FloatingDiamond className="!relative !opacity-80" size="lg" delay={0.3} />
                </div>
                
                <div className="absolute inset-8 rounded-2xl bg-card/80 border border-border flex items-center justify-center">
                  <div className="text-center p-6">
                    <motion.div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-button flex items-center justify-center" animate={{
                    boxShadow: ["0 0 20px rgba(168, 85, 247, 0.3)", "0 0 40px rgba(168, 85, 247, 0.5)", "0 0 20px rgba(168, 85, 247, 0.3)"]
                  }} transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}>
                      <svg className="w-10 h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </motion.div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Enterprise Protection</h3>
                    <p className="text-sm text-muted-foreground">White-label scam detection for your platform</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By Section - Removed empty section */}

      {/* Benefits Section */}
      <section className="py-20 sm:py-28 relative">
        <FloatingDiamond className="top-20 left-[5%]" delay={0} />
        <FloatingDiamond className="top-40 right-[8%]" delay={0.6} />
        <FloatingDiamond className="bottom-32 right-[10%]" delay={1.2} />
        <FloatingDiamond className="bottom-20 left-[12%]" delay={1.8} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Every platform needs a <span className="gradient-text">scam checker</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Protect your customers before it's too late
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.15}>
            {/* Card 1 */}
            <StaggerItem>
              <motion.div className="feature-card rounded-2xl p-8 h-full" whileHover={{
              y: -8,
              transition: {
                duration: 0.3
              }
            }}>
                <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6" whileHover={{
                rotate: 5,
                scale: 1.1
              }}>
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </motion.div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  Break the spell before it's cast
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Once a customer is ready to pay, it is often too late to change their mind. 
                  Giving them the tools to check when something doesn't feel right can stop the scammer in their tracks.
                </p>
              </motion.div>
            </StaggerItem>

            {/* Card 2 */}
            <StaggerItem>
              <motion.div className="feature-card rounded-2xl p-8 h-full" whileHover={{
              y: -8,
              transition: {
                duration: 0.3
              }
            }}>
                <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6" whileHover={{
                rotate: 5,
                scale: 1.1
              }}>
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  Reduce manual interventions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  When customers check scams upstream and on their own terms, you avoid the need for 
                  last-minute interventions. It saves your team time and spares customers frustration.
                </p>
              </motion.div>
            </StaggerItem>

            {/* Card 3 */}
            <StaggerItem>
              <motion.div className="feature-card rounded-2xl p-8 h-full" whileHover={{
              y: -8,
              transition: {
                duration: 0.3
              }
            }}>
                <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6" whileHover={{
                rotate: 5,
                scale: 1.1
              }}>
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </motion.div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  Close the gaps in your protection
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  It's not practical to intervene in low-value, high-volume cases. A scam checker 
                  fills the gap, offering protection where direct intervention isn't feasible.
                </p>
              </motion.div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Why ScamGuard Section */}
      <section id="why-scamguard" className="py-20 sm:py-28 bg-card/30 border-y border-border relative">
        <FloatingDiamond className="top-16 right-[12%]" delay={0} />
        <FloatingDiamond className="top-32 left-[6%]" delay={0.6} />
        <FloatingDiamond className="bottom-20 left-[8%]" delay={1.2} />
        <FloatingDiamond className="bottom-28 right-[10%]" delay={1.8} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <AnimatedSection>
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
              <motion.a href="#contact" whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.98
            }} className="gradient-button text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg">
                Get in Touch
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.a>
            </AnimatedSection>

            {/* Right - Features Grid */}
            <StaggerContainer className="grid sm:grid-cols-2 gap-6" staggerDelay={0.1}>
              {[{
              icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>,
              title: "Trusted Scam Detection",
              description: "Built a reputation as a go-to destination for scam checking, trusted by thousands."
            }, {
              icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>,
              title: "Hundreds of Data Points",
              description: "Deeper research across hundreds of data points for more accurate responses."
            }, {
              icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>,
              title: "Real-World Data",
              description: "Over 50,000 scans analyzed, giving us more patterns and insights than anyone else."
            }, {
              icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>,
              title: "Expert Insight",
              description: "Responses shaped by specialists in behavioral psychology and security."
            }].map((feature, index) => <StaggerItem key={index}>
                  <motion.div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border h-full" whileHover={{
                borderColor: "hsl(var(--primary) / 0.3)",
                y: -4,
                transition: {
                  duration: 0.2
                }
              }}>
                    <motion.div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-4" whileHover={{
                  rotate: 10,
                  scale: 1.1
                }}>
                      {feature.icon}
                    </motion.div>
                    <h4 className="font-display font-semibold text-foreground mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                </StaggerItem>)}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 sm:py-28 relative">
        <FloatingDiamond className="top-24 left-[15%]" delay={0} />
        <FloatingDiamond className="top-40 right-[10%]" delay={0.6} />
        <FloatingDiamond className="bottom-16 right-[20%]" delay={1.2} />
        <FloatingDiamond className="bottom-28 left-[8%]" delay={1.8} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Beyond <span className="gradient-text">Traditional Security</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              ScamGuard isn't just for banks. We partner with organizations across industries 
              to help protect people wherever scams reach them.
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
            {[{
            icon: "🏦",
            title: "Banks & Finance",
            desc: "Protect customers during transactions"
          }, {
            icon: "🛒",
            title: "E-commerce",
            desc: "Prevent marketplace fraud"
          }, {
            icon: "📱",
            title: "Telecom",
            desc: "Block SMS and call scams"
          }, {
            icon: "🏛️",
            title: "Government",
            desc: "Protect citizens from impersonation"
          }].map((useCase, index) => <StaggerItem key={index}>
                <motion.div className="text-center p-6 rounded-xl bg-card/30 border border-border h-full" whileHover={{
              borderColor: "hsl(var(--primary) / 0.3)",
              y: -6,
              transition: {
                duration: 0.2
              }
            }}>
                  <motion.div className="text-4xl mb-4" whileHover={{
                scale: 1.2,
                rotate: [0, -10, 10, 0]
              }} transition={{
                duration: 0.4
              }}>
                    {useCase.icon}
                  </motion.div>
                  <h4 className="font-display font-semibold text-foreground mb-2">{useCase.title}</h4>
                  <p className="text-sm text-muted-foreground">{useCase.desc}</p>
                </motion.div>
              </StaggerItem>)}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 sm:py-28 bg-gradient-to-b from-card/50 to-background border-t border-border relative overflow-hidden">
        {/* Background animation */}
        <motion.div className="absolute inset-0 pointer-events-none" initial={{
        opacity: 0
      }} whileInView={{
        opacity: 1
      }} viewport={{
        once: true
      }}>
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{
          background: "radial-gradient(circle, hsl(270 70% 60% / 0.15) 0%, transparent 70%)"
        }} animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }} transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
        </motion.div>

        <FloatingDiamond className="top-12 left-[10%]" delay={0} />
        <FloatingDiamond className="top-28 right-[8%]" delay={0.6} />
        <FloatingDiamond className="bottom-24 right-[15%]" delay={1.2} />
        <FloatingDiamond className="bottom-16 left-[12%]" delay={1.8} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection className="max-w-3xl mx-auto text-center">
            <motion.div className="w-16 h-16 mx-auto mb-8 rounded-2xl gradient-button flex items-center justify-center" animate={{
            boxShadow: ["0 0 20px rgba(168, 85, 247, 0.3)", "0 0 40px rgba(168, 85, 247, 0.5)", "0 0 20px rgba(168, 85, 247, 0.3)"]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}>
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </motion.div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to protect your customers?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Let's discuss how ScamGuard can be integrated into your platform. 
              We offer flexible solutions for businesses of all sizes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a href="mailto:business@scamguard.com" whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.98
            }} className="gradient-button text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-lg">
                Contact Sales
                <motion.svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" whileHover={{
                x: 5
              }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              </motion.a>
              <motion.a href="/" whileHover={{
              scale: 1.02,
              borderColor: "hsl(var(--primary) / 0.5)"
            }} whileTap={{
              scale: 0.98
            }} className="border border-border bg-card/50 backdrop-blur-sm text-foreground px-8 py-4 rounded-xl text-lg font-medium inline-flex items-center justify-center gap-2 transition-colors">
                Try the Free Tool
              </motion.a>
            </div>

            <motion.p initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} transition={{
            delay: 0.5
          }} viewport={{
            once: true
          }} className="mt-8 text-sm text-muted-foreground">
              Or email us at <a href="mailto:business@scamguard.com" className="text-primary hover:underline">business@scamguard.com</a>
            </motion.p>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>;
}
export default Business;