import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * LoginModal - Combined auth modal for both sign in and sign up with Google OAuth
 */
function LoginModal({ isOpen, onClose, onLogin, preventRedirect = false }) {
  const [error, setError] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError("");
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      // Cleanup: restore scroll on unmount
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      console.log('🔵 [GOOGLE OAUTH] Starting Google OAuth login...');
      
      // Store flag if we're on extension-auth page (for OAuth callback to know)
      if (preventRedirect) {
        sessionStorage.setItem('oauth_from_extension_auth', 'true');
        console.log('🔵 [GOOGLE OAUTH] Set extension-auth flag');
      }
      
      // Close modal BEFORE OAuth redirect to prevent DOM cleanup issues
      onClose();
      
      // Small delay to allow modal to cleanly unmount
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('🔵 [GOOGLE OAUTH] Initiating OAuth sign-in...');
      console.log('🔵 [GOOGLE OAUTH] Redirect URL:', redirectUrl);
      console.log('🔵 [GOOGLE OAUTH] Current origin:', window.location.origin);
      
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('❌ [GOOGLE OAUTH] OAuth error:', error);
        console.error('❌ [GOOGLE OAUTH] Redirect URL used:', redirectUrl);
        
        // Provide helpful error message for 403/redirect issues
        if (error.message?.includes('403') || error.message?.toLowerCase().includes('redirect')) {
          setError(`OAuth redirect URL not authorized. Please add this URL to Supabase:\n${redirectUrl}\n\nGo to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`);
        } else {
          setError(error.message || "Google login failed. Please try again.");
        }
        return;
      }

      // OAuth redirect will happen automatically
      console.log('✅ [GOOGLE OAUTH] OAuth redirect initiated:', data);
    } catch (err) {
      console.error('❌ [GOOGLE OAUTH] Exception during OAuth:', err);
      setError(err.message || "An error occurred. Please try again.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        margin: 0,
        padding: '1rem',
        overflow: 'auto'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-md w-full overflow-hidden relative"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transform: 'translateZ(0)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Welcome
            </h2>
          </div>
          <p className="text-gray-400 text-sm">
            Login to access your dashboard and start protecting yourself
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Google Login Button */}
          <div className="mb-4">
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 border-0 font-semibold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
