import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle OAuth callback
const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Supabase automatically processes hash fragments when the client is initialized
        // We need to wait a bit for it to process, then check the session
        // Also listen for auth state changes as a backup
        
        let sessionReceived = false;
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔐 Auth state change event:', event, session ? 'Session received' : 'No session');
          
          if (event === 'SIGNED_IN' && session?.user && mounted) {
            sessionReceived = true;
            
            // Initialize user checks (give 5 checks on signup)
            const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
            const existingChecks = getRemainingUserChecks(session.user.id);
            console.log('📊 Existing checks:', existingChecks);
            
            if (existingChecks === 0) {
              // New user - give them 5 checks
              initializeUserChecks(session.user.id);
              console.log('✅ Initialized 5 checks for new user');
            }
            
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to dashboard
            console.log('✅ Redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
          }
        });
        
        // Also try to get session directly (in case it's already processed)
        const checkSession = async () => {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ OAuth callback error:', error);
            if (mounted) {
              navigate('/', { replace: true });
            }
            return;
          }

          if (session?.user && !sessionReceived && mounted) {
            console.log('✅ Session found directly');
            sessionReceived = true;
            
            // Initialize user checks
            const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
            const existingChecks = getRemainingUserChecks(session.user.id);
            
            if (existingChecks === 0) {
              initializeUserChecks(session.user.id);
              console.log('✅ Initialized 5 checks for new user');
            }
            
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to dashboard
            navigate('/dashboard', { replace: true });
          } else if (!session && mounted) {
            // Wait a bit longer for Supabase to process the hash
            console.log('⏳ Waiting for session...');
            setTimeout(checkSession, 500);
          }
        };
        
        // Check session after a short delay
        setTimeout(checkSession, 300);
        
        // Timeout fallback - redirect to home if no session after 5 seconds
        setTimeout(() => {
          if (!sessionReceived && mounted) {
            console.warn('⚠️ OAuth callback timeout, redirecting to home');
            navigate('/', { replace: true });
          }
        }, 5000);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('❌ Error handling OAuth callback:', error);
        if (mounted) {
          navigate('/', { replace: true });
        }
      }
    };

    handleOAuthCallback();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#ffffff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div 
          style={{
            animation: 'spin 1s linear infinite',
            width: '48px',
            height: '48px',
            border: '2px solid #9333ea',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 16px'
          }}
        />
        <p style={{ color: '#a1a1aa', marginBottom: '8px' }}>Completing sign in...</p>
        <p style={{ color: '#71717a', fontSize: '12px' }}>Please wait...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
