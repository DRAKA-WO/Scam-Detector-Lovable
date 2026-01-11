import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
    let subscription = null;
    
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        console.log('🔍 DEBUG: Current URL =', window.location.href);
        console.log('🔍 DEBUG: Search params =', window.location.search);
        console.log('🔍 DEBUG: Hash =', window.location.hash);
        
        // Check if user cancelled OAuth (error in URL params or hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        console.log('🔍 DEBUG: URL error =', error);
        console.log('🔍 DEBUG: Error description =', errorDescription);
        
        if (error === 'access_denied' || errorDescription?.toLowerCase().includes('user denied') || errorDescription?.toLowerCase().includes('cancelled')) {
          console.log('⚠️ User cancelled OAuth sign-in');
          if (mounted) {
            // Use window.location.href to force full page reload and clear the black screen
            window.location.href = '/';
          }
          return;
        }
        
        console.log('🔍 DEBUG: Loading Supabase client...');
        const { supabase } = await import('@/integrations/supabase/client');
        console.log('✅ DEBUG: Supabase client loaded');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:48_supabaseLoaded',message:'Supabase client loaded',data:{hasHash:!!window.location.hash,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6,H8'})}).catch(()=>{});
        // #endregion
        
        // Supabase auto-processes hash on initialization, but in OAuth callback context
        // we need to explicitly check if it resulted in a session
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:56_beforeGetSession',message:'About to call getSession',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H9'})}).catch(()=>{});
        // #endregion
        
        const { data: { session: immediateSession }, error: immediateError } = await supabase.auth.getSession();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:64_afterGetSession',message:'After getSession',data:{hasSession:!!immediateSession,hasError:!!immediateError,errorMsg:immediateError?.message,userId:immediateSession?.user?.id,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H9'})}).catch(()=>{});
        // #endregion
        
        if (immediateSession && !sessionReceived && mounted) {
          console.log('✅ Session available immediately after OAuth!');
          sessionReceived = true;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:74_immediateSessionFound',message:'Immediate session found, proceeding',data:{userId:immediateSession.user.id,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H9'})}).catch(()=>{});
          // #endregion
          
          // Proceed with redirect immediately
          const proceedWithRedirect = async () => {
            const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
            const { initializePermanentStats } = await import('./utils/permanentStats');
            const existingChecks = getRemainingUserChecks(immediateSession.user.id);
            
            if (existingChecks === 0) {
              initializeUserChecks(immediateSession.user.id);
              initializePermanentStats(immediateSession.user.id);
              console.log('✅ Initialized checks for new user');
            }
            
            // Clear hash and redirect
            window.history.replaceState(null, '', window.location.pathname);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (mounted) {
              console.log('✅ Redirecting to dashboard...');
              window.location.href = '/dashboard';
            }
          };
          
          await proceedWithRedirect();
          return;
        }
        
        // Supabase automatically processes hash fragments when the client is initialized
        // We need to wait a bit for it to process, then check the session
        // Also listen for auth state changes as a backup
        
        let sessionReceived = false;
        
        // Set up auth state change listener
        console.log('🔍 DEBUG: Setting up auth state change listener...');
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔐 Auth state change event:', event, session ? 'Session received' : 'No session');
          console.log('🔍 DEBUG: Full session object:', session);
          console.log('🔍 DEBUG: sessionReceived flag =', sessionReceived);
          console.log('🔍 DEBUG: mounted flag =', mounted);
          
            if (event === 'SIGNED_IN' && session?.user && mounted) {
            console.log('✅ DEBUG: SIGNED_IN event received! User:', session.user.email);
            sessionReceived = true;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:64_signedIn',message:'SIGNED_IN event fired',data:{userEmail:session.user.email,userId:session.user.id,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6,H8'})}).catch(()=>{});
            // #endregion
            
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
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:82_proceedStart',message:'OAuth proceedWithRedirect START',data:{userId:session.user.id,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4,H5'})}).catch(()=>{});
              // #endregion
              
              // Initialize user checks (give 5 checks on signup)
              const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
              const { initializePermanentStats } = await import('./utils/permanentStats');
              const existingChecks = getRemainingUserChecks(session.user.id);
              console.log('📊 Existing checks:', existingChecks);
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:90_beforeInit',message:'BEFORE initializeUserChecks and initializePermanentStats',data:{existingChecks,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4,H5'})}).catch(()=>{});
              // #endregion
              
              if (existingChecks === 0) {
                // New user - give them 5 checks
                initializeUserChecks(session.user.id);
                initializePermanentStats(session.user.id);
                console.log('✅ Initialized 5 checks and permanent stats for new user');
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:100_afterInit',message:'AFTER initializePermanentStats called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
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
                    
                    // Update user stats (analytics) - both old and permanent
                    console.log('📊 [OAuthCallback] Updating user stats for analytics...');
                    const { updateUserStats } = await import('./utils/checkLimits');
                    const { incrementPermanentStats } = await import('./utils/permanentStats');
                    const resultType = scan.classification === 'scam' ? 'scam' : 
                                      scan.classification === 'safe' ? 'safe' : 'suspicious';
                    updateUserStats(session.user.id, resultType);
                    incrementPermanentStats(session.user.id, scan.classification);
                    console.log('✅ [OAuthCallback] User stats updated (permanent & temp):', resultType);
                    
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
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/3b9ffdac-951a-426c-a611-3e43b6ce3c2b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:189_beforeRedirect',message:'BEFORE window.location.href redirect',data:{mounted,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
                // #endregion
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
        console.log('🔍 DEBUG: Auth listener subscription created');
        
        // Also try to get session directly (in case it's already processed)
        console.log('🔍 DEBUG: Starting checkSession attempts...');
        const checkSession = async (attempt = 0) => {
          try {
            console.log(`🔍 DEBUG: checkSession attempt ${attempt + 1}...`);
            const { data: { session }, error } = await supabase.auth.getSession();
            
            console.log('🔍 DEBUG: getSession response - session:', !!session, 'error:', error);
            
            if (error) {
              console.error('❌ OAuth callback error:', error);
              if (mounted && attempt >= 3) {
                console.error('❌ DEBUG: Max attempts reached, redirecting to home');
                // Use window.location.href to force full page reload and clear the black screen
                window.location.href = '/';
              } else if (mounted) {
                console.log(`⏳ DEBUG: Will retry checkSession in 500ms (attempt ${attempt + 1})`);
                setTimeout(() => checkSession(attempt + 1), 500);
              }
              return;
            }

            if (session?.user && !sessionReceived && mounted) {
              console.log('✅ Session found directly - User:', session.user.email);
              console.log('🔍 DEBUG: Setting sessionReceived to true');
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
                // Initialize user checks
                const { getRemainingUserChecks, initializeUserChecks } = await import('./utils/checkLimits');
                const existingChecks = getRemainingUserChecks(session.user.id);
                
                if (existingChecks === 0) {
                  initializeUserChecks(session.user.id);
                  console.log('✅ Initialized 5 checks for new user');
                }
                
                // Wait a bit more to ensure everything is processed
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Clear hash from URL
                window.history.replaceState(null, '', window.location.pathname);
                
                // Redirect to dashboard - use window.location.href to force full page navigation
                // This ensures OAuthCallback is completely unmounted before Dashboard mounts
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
        
        // Timeout fallback - redirect to home if no session after 15 seconds
        setTimeout(() => {
          if (!sessionReceived && mounted) {
            console.warn('⚠️ OAuth callback timeout after 15 seconds, redirecting to home');
            console.error('🔍 DEBUG: sessionReceived =', sessionReceived);
            console.error('🔍 DEBUG: mounted =', mounted);
            console.error('🔍 DEBUG: URL =', window.location.href);
            // Use window.location.href to force full page reload and clear the black screen
            window.location.href = '/';
          }
        }, 15000);
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
          <Route path="/auth/callback" element={<OAuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
