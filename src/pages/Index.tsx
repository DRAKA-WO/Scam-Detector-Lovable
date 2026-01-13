import { useEffect } from 'react'
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
