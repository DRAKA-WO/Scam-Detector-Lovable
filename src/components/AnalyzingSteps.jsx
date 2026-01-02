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
    // Progress through steps with delays
    const timers = []
    
    if (type === 'url') {
      // URL steps: 4 steps
      // Step 1 completes quickly (accessing)
      timers.push(setTimeout(() => setCurrentStep(1), 500))
      
      // Step 2 starts screenshot (medium delay)
      timers.push(setTimeout(() => setCurrentStep(2), 1500))
      
      // Step 3 starts analyzing (longer delay)
      timers.push(setTimeout(() => setCurrentStep(3), 2500))
      
      // Step 4 continues until analysis completes (handled by parent)
    } else if (type === 'text') {
      // Text steps: 4 steps
      // Step 1 completes quickly (processing)
      timers.push(setTimeout(() => setCurrentStep(1), 500))
      
      // Step 2 starts analyzing (medium delay)
      timers.push(setTimeout(() => setCurrentStep(2), 1500))
      
      // Step 3 starts checking red flags (longer delay)
      timers.push(setTimeout(() => setCurrentStep(3), 2500))
      
      // Step 4 continues until analysis completes (handled by parent)
    } else {
      // Image steps: 4 steps
      // Step 1 completes quickly (upload)
      timers.push(setTimeout(() => setCurrentStep(1), 500))
      
      // Step 2 starts analyzing (medium delay)
      timers.push(setTimeout(() => setCurrentStep(2), 1500))
      
      // Step 3 starts checking red flags (longer delay)
      timers.push(setTimeout(() => setCurrentStep(3), 2500))
      
      // Step 4 continues until analysis completes (handled by parent)
    }
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [type])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-black mb-8">Analysing...</h2>
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          
          return (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isActive ? (
                  <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
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
