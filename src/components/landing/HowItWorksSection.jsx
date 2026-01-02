function HowItWorksSection() {
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
    <section id="how-it-works" className="py-20 relative">
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
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Three simple steps to protect yourself from scams
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent" />
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
