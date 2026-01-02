import { useState, useEffect } from 'react'

function AnalyzingSteps({ type = 'image' }) {
  const [currentStep, setCurrentStep] = useState(0)

  const imageSteps = [
    {
      title: 'Uploading image',
      description: 'Receiving and processing the image you\'ve sent.',
    },
    {
      title: 'Analyzing content',
      description: 'Examining text, URLs, sender information, and visual elements.',
    },
    {
      title: 'Checking for red flags',
      description: 'Identifying markers of scams, phishing, and impersonation attempts.',
    },
    {
      title: 'Generating report',
      description: 'Preparing your detailed analysis and recommendations.',
    },
  ]

  const urlSteps = [
    {
      title: 'Accessing website',
      description: 'Connecting to the URL and loading the webpage.',
    },
    {
      title: 'Taking screenshot',
      description: 'Capturing a full-page screenshot including the footer.',
    },
    {
      title: 'Analyzing website',
      description: 'Examining domain, pricing, payment methods, and trust indicators.',
    },
    {
      title: 'Checking for red flags',
      description: 'Identifying markers of scams, fraudulent websites, and suspicious activity.',
    },
  ]

  const textSteps = [
    {
      title: 'Processing text',
      description: 'Receiving and processing the text content you\'ve provided.',
    },
    {
      title: 'Analyzing content',
      description: 'Examining sender information, links, language, and message patterns.',
    },
    {
      title: 'Checking for red flags',
      description: 'Identifying markers of phishing, scams, and suspicious communication.',
    },
    {
      title: 'Generating report',
      description: 'Preparing your detailed analysis and recommendations.',
    },
  ]

  const steps = type === 'url' ? urlSteps : type === 'text' ? textSteps : imageSteps

  useEffect(() => {
    const timers = []
    
    timers.push(setTimeout(() => setCurrentStep(1), 500))
    timers.push(setTimeout(() => setCurrentStep(2), 1500))
    timers.push(setTimeout(() => setCurrentStep(3), 2500))
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [type])

  return (
    <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 glow-effect">
      <h2 className="text-2xl font-display font-bold text-foreground mb-8">Analysing...</h2>
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          
          return (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full gradient-button flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-6 h-6 border-2 border-border rounded-full"></div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AnalyzingSteps
