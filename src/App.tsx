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
    const handleOAuthCallback = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Supabase handles the OAuth callback automatically via hash fragments
        // We just need to get the session after the redirect
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          navigate('/');
          return;
        }

        if (session?.user) {
          // Initialize user checks (give 5 checks on signup)
          // Only initialize if this is a new signup (check if user already has checks)
          const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
          const existingChecks = getRemainingUserChecks(session.user.id);
          if (existingChecks === 0) {
            // New user - give them 5 checks
            initializeUserChecks(session.user.id);
          }
          
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          // No session - redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        navigate('/');
      }
    };

    // Small delay to ensure Supabase has processed the hash
    const timer = setTimeout(() => {
      handleOAuthCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
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
