import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import FloatingDiamond from "../ui/FloatingDiamond"

function HowItWorksSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation()
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollAnimation()

  const steps = [
    {
      number: '01',
      title: 'Upload Content',
      description: 'Paste a URL, upload an image, or enter suspicious text content you want to analyze.',
    },
    {
      number: '02',
      title: 'AI Analysis',
      description: 'Our advanced AI scans for known scam patterns, phishing indicators, and fraud signals.',
    },
    {
      number: '03',
      title: 'Get Results',
      description: 'Receive a detailed risk assessment with clear recommendations on how to proceed.',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 relative overflow-hidden">
      {/* Floating Diamonds */}
      <FloatingDiamond className="top-16 left-[12%]" delay={0.2} size="md" />
      <FloatingDiamond className="top-32 right-[10%]" delay={0.8} size="lg" />
      <FloatingDiamond className="bottom-20 left-[8%]" delay={1.4} size="sm" />
      <FloatingDiamond className="bottom-28 right-[15%]" delay={0.5} size="md" />
      <FloatingDiamond className="top-1/2 right-[6%]" delay={1.1} size="sm" />
      <FloatingDiamond className="top-24 left-[5%]" delay={1.7} size="lg" />
      
      {/* Background Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(270 70% 60% / 0.3) 50%, transparent 100%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center mb-16 max-w-2xl mx-auto transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Three simple steps to protect yourself from scams
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto" ref={stepsRef}>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`relative text-center transition-all duration-700 ${
                  stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: stepsVisible ? `${index * 150}ms` : '0ms' }}
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent transition-all duration-1000 ${
                      stepsVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                    }`}
                    style={{ 
                      transitionDelay: stepsVisible ? `${(index + 1) * 200}ms` : '0ms',
                      transformOrigin: 'left'
                    }}
                  />
                )}
                
                {/* Number */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-button text-primary-foreground font-display text-2xl font-bold mb-6 shadow-lg">
                  {step.number}
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
