import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncSessionToExtension, initializeExtensionSync } from "./utils/extensionSync";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Business from "./pages/Business";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize extension sync on app load
if (typeof window !== 'undefined') {
  initializeExtensionSync();
}

// Component to handle OAuth callback
const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let subscription = null;
    
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Check if user cancelled OAuth (error in URL params or hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error === 'access_denied' || errorDescription?.toLowerCase().includes('user denied') || errorDescription?.toLowerCase().includes('cancelled')) {
          console.log('⚠️ User cancelled OAuth sign-in');
          if (mounted) {
            // Use window.location.href to force full page reload and clear the black screen
            window.location.href = '/';
          }
          return;
        }
        
        // Manual session setting from hash tokens
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (data?.session && !error) {
              console.log('✅ Session set successfully!');
              
              // Sync session to extension
              await syncSessionToExtension(data.session, data.session.user.id);
              
              // Don't redirect yet - need to process pending scan and initialize checks first
              // Continue to proceedWithRedirect() below
            } else if (error) {
              console.error('❌ Session setup error:', error.message);
              // On error, still redirect to dashboard
              window.location.href = '/dashboard';
              return;
            }
          } catch (err: any) {
            console.error('❌ Session setup failed:', err?.message);
          }
        }
        
        let sessionReceived = false;
        
        // Set up auth state change listener
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔐 Auth state change event:', event, session ? 'Session received' : 'No session');
          
            if (event === 'SIGNED_IN' && session?.user && mounted) {
            sessionReceived = true;
            
            // Wait for Supabase to write session to localStorage
            const waitForLocalStorage = (attempt = 0) => {
              const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'));
              if (supabaseKeys.length > 0) {
                try {
                  const sessionStr = localStorage.getItem(supabaseKeys[0]);
                  if (sessionStr) {
                    const storedSession = JSON.parse(sessionStr);
                    if (storedSession?.currentSession?.user || storedSession?.user) {
                      console.log('✅ OAuthCallback: Session confirmed in localStorage');
                      proceedWithRedirect();
                      return;
                    }
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
              
              if (attempt < 10 && mounted) {
                setTimeout(() => waitForLocalStorage(attempt + 1), 200);
              } else {
                console.log('⚠️ OAuthCallback: Proceeding without localStorage confirmation');
                proceedWithRedirect();
              }
            };
            
            const proceedWithRedirect = async () => {
              console.log('🚀 [OAuthCallback] Starting proceedWithRedirect...');
              
              // Sync session to extension
              await syncSessionToExtension(session, session.user.id);
              
              try {
                // Initialize/sync user checks - will check database first to determine if new or existing user
                console.log('📦 [OAuthCallback] Initializing/syncing user checks...');
                const { initializeUserChecks } = await import('./utils/checkLimits');
                await initializeUserChecks(session.user.id, false);
                console.log('✅ [OAuthCallback] User checks initialized/synced');
              } catch (error) {
                console.error('❌ [OAuthCallback] Error initializing checks:', error);
              }
              
              // 🎯 HANDLE PENDING SCAN AFTER SIGNUP
              console.log('🔍 [OAuthCallback] Checking for pending scan...');
              const PENDING_SCAN_KEY = 'scam_checker_pending_scan';
              
              try {
                const pendingScanData = localStorage.getItem(PENDING_SCAN_KEY);
                console.log('📦 [OAuthCallback] Pending scan in localStorage:', pendingScanData ? 'FOUND' : 'NOT FOUND');
                
                if (pendingScanData) {
                  const scan = JSON.parse(pendingScanData);
                  console.log('📋 [OAuthCallback] Parsed pending scan:', scan);
                  console.log('🔎 [OAuthCallback] Scan details:', {
                    scanType: scan.scanType,
                    classification: scan.classification,
                    hasImageFile: !!scan.imageFile,
                    hasContentPreview: !!scan.contentPreview
                  });
                  
                  // Import scan history utilities
                  const { saveScanToHistory, uploadScanImage } = await import('./utils/scanHistory');
                  
                  let imageUrl = scan.imageUrl;
                  
                  // If it's an image scan, upload the image
                  if (scan.scanType === 'image' && scan.imageData) {
                    console.log('📤 [OAuthCallback] Uploading pending image from base64...');
                    try {
                      console.log('🔗 [OAuthCallback] Converting base64 to blob...');
                      // Convert base64 to blob
                      const response = await fetch(scan.imageData);
                      const blob = await response.blob();
                      console.log('✅ [OAuthCallback] Blob created, size:', blob.size, 'type:', blob.type);
                      
                      const fileName = scan.imageName || 'scan-image.png';
                      const file = new File([blob], fileName, { type: blob.type });
                      console.log('📁 [OAuthCallback] File created, uploading to Supabase...');
                      
                      imageUrl = await uploadScanImage(file, session.user.id);
                      console.log('✅ [OAuthCallback] Successfully uploaded image:', imageUrl);
                    } catch (uploadError) {
                      console.error('❌ [OAuthCallback] Error uploading pending image:', uploadError);
                      console.error('[OAuthCallback] Upload error details:', uploadError.message);
                      // Continue anyway - save scan without image
                    }
                  }
                  
                  // Save to scan history
                  console.log('💾 [OAuthCallback] Saving pending scan to history...');
                  try {
                    const savedScan = await saveScanToHistory(
                      session.user.id,
                      scan.scanType,
                      imageUrl,
                      scan.contentPreview,
                      scan.classification,
                      scan.analysisResult
                    );
                    
                    console.log('✅ [OAuthCallback] Successfully saved pending scan to history!', savedScan);
                    console.log('✅ [OAuthCallback] Permanent stats automatically incremented');
                    
                    // Clear pending scan
                    localStorage.removeItem(PENDING_SCAN_KEY);
                    console.log('🗑️ [OAuthCallback] Cleared pending scan from localStorage');
                  } catch (saveError) {
                    console.error('❌ [OAuthCallback] CRITICAL ERROR saving pending scan:', saveError);
                    console.error('[OAuthCallback] Save error details:', saveError.message);
                    alert('Error saving your scan to history. Error: ' + saveError.message);
                  }
                } else {
                  console.log('ℹ️ [OAuthCallback] No pending scan found');
                }
              } catch (error) {
                console.error('❌ [OAuthCallback] Error handling pending scan:', error);
                console.error('[OAuthCallback] Error details:', error.message);
              }
              
              // Clear hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              // Small delay to ensure everything is settled
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Redirect to dashboard
              if (mounted) {
                console.log('✅ Redirecting to dashboard...');
                // Use window.location.href instead of navigate() to force a full page navigation
                // This ensures React Router fully commits the route change and Dashboard renders immediately
                window.location.href = '/dashboard';
              }
            };
            
            // Start waiting for localStorage
            waitForLocalStorage();
          }
        });
        
        subscription = data;
        
        // Also try to get session directly (in case it's already processed)
        const checkSession = async (attempt = 0) => {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('❌ OAuth callback error:', error);
              if (mounted && attempt >= 3) {
                // Use window.location.href to force full page reload and clear the black screen
                window.location.href = '/';
              } else if (mounted) {
                setTimeout(() => checkSession(attempt + 1), 500);
              }
              return;
            }

            if (session?.user && !sessionReceived && mounted) {
              console.log('✅ Session found directly');
              sessionReceived = true;
              
              // Wait for Supabase to write session to localStorage
              const waitForLocalStorage = (attempt = 0) => {
                const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'));
                if (supabaseKeys.length > 0) {
                  try {
                    const sessionStr = localStorage.getItem(supabaseKeys[0]);
                    if (sessionStr) {
                      const storedSession = JSON.parse(sessionStr);
                      if (storedSession?.currentSession?.user || storedSession?.user) {
                        console.log('✅ OAuthCallback: Session confirmed in localStorage');
                        proceedWithRedirect();
                        return;
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
                
                if (attempt < 10 && mounted) {
                  setTimeout(() => waitForLocalStorage(attempt + 1), 200);
                } else {
                  console.log('⚠️ OAuthCallback: Proceeding without localStorage confirmation');
                  proceedWithRedirect();
                }
              };
              
              const proceedWithRedirect = async () => {
                console.log('🚀 [OAuthCallback-v2] Starting proceedWithRedirect...');
                
                // Initialize/sync user checks - will check database first to determine if new or existing user
                console.log('📦 [OAuthCallback-v2] Initializing/syncing user checks...');
                const { initializeUserChecks } = await import('./utils/checkLimits');
                await initializeUserChecks(session.user.id, false);
                console.log('✅ [OAuthCallback-v2] User checks initialized/synced');
                
                // 🎯 HANDLE PENDING SCAN AFTER SIGNUP
                console.log('🔍 [OAuthCallback-v2] Checking for pending scan...');
                const PENDING_SCAN_KEY = 'scam_checker_pending_scan';
                
                try {
                  const pendingScanData = localStorage.getItem(PENDING_SCAN_KEY);
                  console.log('📦 [OAuthCallback-v2] Pending scan in localStorage:', pendingScanData ? 'FOUND' : 'NOT FOUND');
                  
                  if (pendingScanData) {
                    const scan = JSON.parse(pendingScanData);
                    console.log('📋 [OAuthCallback-v2] Parsed pending scan:', scan);
                    
                    // Import scan history utilities
                    const { saveScanToHistory, uploadScanImage } = await import('./utils/scanHistory');
                    
                    let imageUrl = scan.imageUrl;
                    
                    // If it's an image scan, upload the image
                    if (scan.scanType === 'image' && scan.imageData) {
                      console.log('📤 [OAuthCallback-v2] Uploading pending image...');
                      try {
                        const response = await fetch(scan.imageData);
                        const blob = await response.blob();
                        const fileName = scan.imageName || 'scan-image.png';
                        const file = new File([blob], fileName, { type: blob.type });
                        imageUrl = await uploadScanImage(file, session.user.id);
                        console.log('✅ [OAuthCallback-v2] Image uploaded:', imageUrl);
                      } catch (uploadError) {
                        console.error('❌ [OAuthCallback-v2] Error uploading image:', uploadError);
                      }
                    }
                    
                    // Save to scan history
                    console.log('💾 [OAuthCallback-v2] Saving pending scan to history...');
                    try {
                      const savedScan = await saveScanToHistory(
                        session.user.id,
                        scan.scanType,
                        imageUrl,
                        scan.contentPreview,
                        scan.classification,
                        scan.analysisResult
                      );
                      
                      console.log('✅ [OAuthCallback-v2] Successfully saved pending scan!', savedScan);
                      localStorage.removeItem(PENDING_SCAN_KEY);
                      console.log('🗑️ [OAuthCallback-v2] Cleared pending scan');
                    } catch (saveError) {
                      console.error('❌ [OAuthCallback-v2] Error saving scan:', saveError);
                    }
                  } else {
                    console.log('ℹ️ [OAuthCallback-v2] No pending scan found');
                  }
                } catch (error) {
                  console.error('❌ [OAuthCallback-v2] Error processing pending scan:', error);
                }
                
                // Wait a bit more to ensure everything is processed
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Clear hash from URL
                window.history.replaceState(null, '', window.location.pathname);
                
                // Redirect to dashboard
                if (mounted) {
                  console.log('✅ Redirecting to dashboard...');
                  window.location.href = '/dashboard';
                }
              };
              
              // Start waiting for localStorage
              waitForLocalStorage();
            } else if (!session && mounted && attempt < 5) {
              // Wait longer for Supabase to process the hash (up to 5 attempts)
              console.log(`⏳ Waiting for session... (attempt ${attempt + 1}/5)`);
              setTimeout(() => checkSession(attempt + 1), 600);
            } else if (!session && mounted) {
              console.error('❌ No session after multiple attempts - user may have cancelled');
              // Use window.location.href to force full page reload and clear the black screen
              window.location.href = '/';
            }
          } catch (err) {
            console.error('Error checking session:', err);
            if (mounted && attempt >= 3) {
              navigate('/', { replace: true });
            } else if (mounted) {
              setTimeout(() => checkSession(attempt + 1), 500);
            }
          }
        };
        
        // Check session after a longer delay to give Supabase time to process hash
        setTimeout(() => checkSession(0), 500);
        
        // Timeout fallback - redirect to home if no session after 5 seconds
        setTimeout(() => {
          if (!sessionReceived && mounted) {
            console.warn('⚠️ OAuth callback timeout, redirecting to home');
            // Use window.location.href to force full page reload and clear the black screen
            window.location.href = '/';
          }
        }, 5000);
      } catch (error) {
        console.error('❌ Error handling OAuth callback:', error);
        if (mounted) {
          // Use window.location.href to force full page reload and clear the black screen
          window.location.href = '/';
        }
      }
    };

    handleOAuthCallback();
    
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
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
          <Route path="/business" element={<Business />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
