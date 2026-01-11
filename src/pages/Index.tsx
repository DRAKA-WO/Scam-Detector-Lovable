import { useEffect } from 'react'
import Header from '../components/landing/Header'
import HeroSection from '../components/landing/HeroSection'
import DetectorSection from '../components/landing/DetectorSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import FAQSection from '../components/landing/FAQSection'
import Footer from '../components/landing/Footer'
import ScrollToAnalyze from '../components/landing/ScrollToAnalyze'

const Index = () => {
  useEffect(() => {
    // Handle hash navigation - scroll to detector section if hash is present
    if (window.location.hash === '#detector') {
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        const detectorSection = document.getElementById('detector')
        if (detectorSection) {
          detectorSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <DetectorSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FAQSection />
      </main>
      <Footer />
      <ScrollToAnalyze />
      </div>
  )
}

export default Index
