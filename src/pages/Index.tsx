import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { syncSessionToExtension } from '@/utils/extensionSync'
import Header from '../components/landing/Header'
import HeroSection from '../components/landing/HeroSection'
import DetectorSection from '../components/landing/DetectorSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import FAQSection from '../components/landing/FAQSection'
import Footer from '../components/landing/Footer'
import ScrollToAnalyze from '../components/landing/ScrollToAnalyze'

const Index = () => {
  const location = useLocation()

  // Auto-sync existing session to extension on page load
  useEffect(() => {
    const syncExistingSession = async () => {
      try {
        // Check if there's an active session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && session.user && !error) {
          console.log('🔍 Existing session detected on Index page, syncing to extension...');
          await syncSessionToExtension(session, session.user.id);
          console.log('✅ Existing session synced to extension');
        }
      } catch (error) {
        console.error('Error syncing existing session:', error);
      }
    };
    
    // Run sync after a small delay to ensure page is loaded
    const timer = setTimeout(syncExistingSession, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle hash navigation - scroll to section if hash is present
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash || location.hash
      if (hash) {
        // Remove the # symbol to get the element ID
        const elementId = hash.substring(1)
        // Small delay to ensure page is fully rendered, especially when navigating from another route
        setTimeout(() => {
          const element = document.getElementById(elementId)
          if (element) {
            // Scroll to element with offset for fixed header
            const headerHeight = 64 // Header height in pixels
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
            const offsetPosition = elementPosition - headerHeight
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })
          }
        }, 300) // Increased delay to ensure DOM is fully rendered when navigating from other routes
      }
    }

    // Scroll on mount and when location changes
    scrollToHash()

    // Also listen for hash changes
    const handleHashChange = () => {
      scrollToHash()
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [location]) // Re-run when location changes (including hash changes)

  return (
    <div className="min-h-screen bg-background text-foreground">
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
