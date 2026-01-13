/**
 * Utility to sync Supabase session with browser extension
 * Uses custom events to communicate with content script which forwards to extension
 */

/**
 * Sync session to extension via custom event
 * @param {Object} session - Supabase session object
 * @param {string} userId - User ID
 * @param {number} checks - User's remaining checks (optional)
 * @param {string} plan - User's subscription plan (optional)
 */
export async function syncSessionToExtension(session, userId, checks = null, plan = null) {
  try {
    // Get checks from Supabase (or localStorage fallback) if not provided
    let checksCount = checks;
    if (checksCount === null && userId) {
      try {
        // First, try to sync from Supabase users table
        const { syncUserChecksFromSupabase } = await import('./checkLimits.js');
        checksCount = await syncUserChecksFromSupabase(userId);
      } catch (e) {
        // Fallback to localStorage silently
        try {
          const checksKey = `scam_checker_user_checks_${userId}`;
          const storedChecks = localStorage.getItem(checksKey);
          if (storedChecks !== null) {
            checksCount = parseInt(storedChecks, 10);
          } else if (import.meta.env.DEV) {
            console.warn(`⚠️ No checks found for user ${userId}`);
          }
        } catch (fallbackError) {
          console.warn('Could not get checks from localStorage:', fallbackError);
        }
      }
    }
    
    // Get plan from parameter or default to 'FREE'
    // Note: Plan column doesn't exist in users table yet, so we default to FREE
    let userPlan = plan || 'FREE';
    
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('📤 Syncing to extension:', { userId, checks: checksCount, plan: userPlan });
    }
    
    // Dispatch custom event that content script will listen for
    const event = new CustomEvent('scamChecker:syncSession', {
      detail: {
        session: session,
        userId: userId,
        checks: checksCount,
        plan: userPlan || 'FREE',
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    
    // Small delay to let extension process
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.warn('⚠️ Failed to dispatch session sync event:', error);
    // Don't throw error - extension sync is optional
  }
}

/**
 * Clear session from extension via custom event
 */
export async function clearExtensionSession() {
  try {
    // Dispatch custom event that content script will listen for
    const event = new CustomEvent('scamChecker:clearSession', {
      detail: {
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    console.log('🧹 Extension session clear event dispatched');
    
    // Small delay to let extension process
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.warn('⚠️ Failed to dispatch session clear event:', error);
  }
}

/**
 * Initialize real-time check sync listener with throttling
 * Call this once when app starts to enable automatic extension sync
 */
export function initializeExtensionSync() {
  let syncTimeout = null;
  let lastSyncTime = 0;
  const SYNC_THROTTLE_MS = 3000; // Sync at most once every 3 seconds
  
  // Listen for checksUpdated events and sync to extension (throttled)
  const handleChecksUpdate = async () => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    
    // If we synced less than 1 second ago, schedule a delayed sync
    if (timeSinceLastSync < SYNC_THROTTLE_MS) {
      // Clear any pending sync
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      
      // Schedule sync for later
      syncTimeout = setTimeout(async () => {
        await performSync();
        lastSyncTime = Date.now();
      }, SYNC_THROTTLE_MS - timeSinceLastSync);
      
      return;
    }
    
    // Enough time has passed, sync immediately
    await performSync();
    lastSyncTime = now;
  };
  
  // Actual sync function
  const performSync = async () => {
    try {
      // Get current session
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Sync silently - no need to log every time
        await syncSessionToExtension(session, session.user.id);
      }
    } catch (error) {
      // Only log errors
      console.warn('⚠️ Failed to sync checks to extension:', error);
    }
  };
  
  // Add event listener
  window.addEventListener('checksUpdated', handleChecksUpdate);
  // Only log initialization once
  if (import.meta.env.DEV) {
    console.log('🔄 Extension sync listener initialized (throttled to 3s)');
  }
  
  // Return cleanup function
  return () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    window.removeEventListener('checksUpdated', handleChecksUpdate);
  };
}
