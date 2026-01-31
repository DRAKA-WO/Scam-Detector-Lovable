import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScanToHistory, uploadScanImage } from "@/utils/scanHistory";
import { supabase } from "@/integrations/supabase/client";
import { syncSessionToExtension } from "@/utils/extensionSync";
import EmailAuthModal from "@/components/EmailAuthModal";

const PENDING_SCAN_KEY = 'scam_checker_pending_scan';

function SignupModal({ isOpen, onClose, onSignup, remainingChecks = 0, onSwitchToLogin, preventRedirect = false, hideOutOfChecksMessage = false }) {
  const [error, setError] = useState("");
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      setError("");
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const features = [
    "Unlimited analysis",
    "Full detailed reports",
    "Priority processing",
    "Analysis history",
  ];

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handlePendingScan = async (userId) => {
    try {
      const pendingScanData = localStorage.getItem(PENDING_SCAN_KEY);
      
      if (pendingScanData) {
        const scan = JSON.parse(pendingScanData);
        console.log('📦 Found pending scan, saving to history:', scan);
        
        let imageUrl = scan.imageUrl;
        
        // If it's an image scan, we need to upload the image
        if (scan.scanType === 'image' && scan.imageFile) {
          try {
            // Convert blob URL back to file
            const response = await fetch(scan.imageFile);
            const blob = await response.blob();
            const file = new File([blob], 'scan-image.png', { type: blob.type });
            
            // Upload to Supabase Storage
            imageUrl = await uploadScanImage(file, userId);
            console.log('✅ Uploaded pending scan image:', imageUrl);
          } catch (uploadError) {
            console.error('Error uploading pending scan image:', uploadError);
            // Continue anyway - save scan without image
          }
        }
        
        // Save to scan history
        await saveScanToHistory(
          userId,
          scan.scanType,
          imageUrl,
          scan.contentPreview,
          scan.classification,
          scan.analysisResult
        );
        
        console.log('✅ Saved pending scan to history');
        
        // Set flag to show latest scan result on Dashboard (user came from signup modal)
        localStorage.setItem('show_latest_scan_after_signup', 'true');
        
        // Clear pending scan from localStorage
        localStorage.removeItem(PENDING_SCAN_KEY);
      }
    } catch (error) {
      console.error('Error handling pending scan:', error);
      // Don't throw - we don't want to block signup completion
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // Store flag if we're on extension-auth page (for OAuth callback to know)
      if (window.location.pathname === '/extension-auth') {
        sessionStorage.setItem('oauth_from_extension_auth', 'true');
      }
      
      // Close modal BEFORE OAuth redirect to prevent DOM cleanup issues
      onClose();
      
      // Small delay to allow modal to cleanly unmount
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('🔵 [GOOGLE SIGNUP] Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('❌ [GOOGLE SIGNUP] OAuth error:', error);
        console.error('❌ [GOOGLE SIGNUP] Redirect URL used:', redirectUrl);
        
        // Provide helpful error message for 403/redirect issues
        if (error.message?.includes('403') || error.message?.toLowerCase().includes('redirect')) {
          setError(`OAuth redirect URL not authorized. Please add this URL to Supabase:\n${redirectUrl}\n\nGo to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`);
        } else {
          setError(error.message || "Google signup failed. Please try again.");
        }
        return;
      }

      // Check for pending scan and handle after OAuth redirect completes
      // This will be handled in the auth callback or auth state change listener
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    }
  };

  return (
    <>
      {!showEmailAuth && (
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
              <span className="text-xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Sign up to continue
            </h2>
          </div>
          {!hideOutOfChecksMessage && (
          <p className="text-gray-400 text-sm">
            {remainingChecks === 0 
              ? "You've used your free checks!" 
              : `You have ${remainingChecks} free check${remainingChecks > 1 ? 's' : ''} remaining.`}
          </p>
          )}
        </div>

        {/* Features */}
        <div className="p-6">
          <p className="text-gray-300 text-sm mb-4 font-medium">
            Sign up to unlock:
          </p>
          <ul className="space-y-3 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-200">{feature}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Email sign-up (isolated - remove EmailAuthModal import and this block to disable) */}
          <div className="mb-4">
            <Button
              type="button"
              onClick={() => setShowEmailAuth(true)}
              variant="outline"
              className="w-full h-11 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 font-medium"
            >
              Sign up with Email
            </Button>
          </div>

          {/* Google Signup Button - unchanged */}
                <Button
                  onClick={handleGoogleSignup}
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
      )}
      {/* Email auth modal - only this is visible when open; Sign up card is hidden */}
      <EmailAuthModal
        isOpen={showEmailAuth}
        onClose={() => setShowEmailAuth(false)}
        mode="signup"
        preventRedirect={preventRedirect}
        onSuccess={(payload) => {
          if (payload?.user) handlePendingScan(payload.user.id);
          onSignup?.();
          setShowEmailAuth(false);
          onClose();
        }}
      />
    </>
  );
}

export default SignupModal;
