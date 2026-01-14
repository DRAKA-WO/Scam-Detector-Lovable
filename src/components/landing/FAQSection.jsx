import { useState } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import FloatingDiamond from "../ui/FloatingDiamond"

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation()
  const { ref: faqRef, isVisible: faqVisible } = useScrollAnimation()

  const faqs = [
    {
      question: 'How accurate is the scam detection?',
      answer: 'Our AI achieves over 99% accuracy on known scam patterns. We continuously train our models on the latest fraud techniques to ensure the highest detection rates.',
    },
    {
      question: 'Is my data safe and private?',
      answer: 'Absolutely. All content is processed securely and never stored on our servers. Your privacy is our top priority, and we never share or sell your data.',
    },
    {
      question: 'What types of scams can you detect?',
      answer: 'We detect phishing emails, fake e-commerce sites, romance scams, investment fraud, tech support scams, lottery/prize scams, and many other common fraud schemes.',
    },
    {
      question: 'Is the service free to use?',
      answer: 'Yes! Basic scam detection is completely free. We offer this as a public service to help keep everyone safe online.',
    },
    {
      question: 'How do I report a confirmed scam?',
      answer: 'After receiving your analysis, you can click the "Report Scam" button to submit the content to our database. This helps protect others from the same threat.',
    },
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 relative overflow-hidden">
      {/* Floating Diamonds */}
      <FloatingDiamond className="top-20 left-[10%]" delay={0.2} size="md" />
      <FloatingDiamond className="top-32 right-[8%]" delay={0.7} size="lg" />
      <FloatingDiamond className="bottom-24 left-[12%]" delay={1.2} size="sm" />
      <FloatingDiamond className="top-1/2 right-[6%]" delay={1.7} size="md" />
      <FloatingDiamond className="bottom-16 right-[15%]" delay={0.5} size="sm" />
      <FloatingDiamond className="top-40 left-[5%]" delay={1} size="lg" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center mb-16 max-w-2xl mx-auto transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about our scam detection service
          </p>
        </div>

        {/* FAQ List */}
        <div 
          ref={faqRef}
          className="max-w-3xl mx-auto space-y-4"
        >
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-card/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/30 ${
                faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: faqVisible ? `${index * 100}ms` : '0ms' }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-medium text-foreground pr-4">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQSection
