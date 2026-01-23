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
      // FIX: Check if there's a pending check update (check was just used)
      // If so, don't sync stale data - let the extension's value take precedence
      const { pendingCheckUpdates } = await import('./checkLimits.js');
      const pendingUpdate = pendingCheckUpdates?.get?.(userId);
      
      if (pendingUpdate) {
        const timeSinceUpdate = Date.now() - (pendingUpdate.timestamp || 0);
        // If update was less than 15 seconds ago, use the pending value (more recent)
        if (timeSinceUpdate < 15000) {
          checksCount = pendingUpdate.to; // Use the decremented value
          if (import.meta.env.DEV) {
            console.log(`📤 Using pending check value: ${checksCount} (${Math.round(timeSinceUpdate/1000)}s since update)`);
          }
        }
      }
      
      // If no pending update or it's old, try localStorage first
      if (checksCount === null) {
        try {
          const checksKey = `scam_checker_user_checks_${userId}`;
          const storedChecks = localStorage.getItem(checksKey);
          if (storedChecks !== null) {
            checksCount = parseInt(storedChecks, 10);
            // Use localStorage value - it's the most up-to-date after a check is used
            // Only sync from Supabase if localStorage doesn't have a value
          } else {
            // No localStorage value, fetch from Supabase
            const { syncUserChecksFromSupabase } = await import('./checkLimits.js');
            checksCount = await syncUserChecksFromSupabase(userId);
          }
        } catch (e) {
          // Fallback: try Supabase if localStorage access failed
          try {
            const { syncUserChecksFromSupabase } = await import('./checkLimits.js');
            checksCount = await syncUserChecksFromSupabase(userId);
          } catch (supabaseError) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ No checks found for user ${userId}`);
            }
          }
        }
      }
    }
    
    // Get plan from parameter, or fetch from Supabase, or default to 'FREE'
    let userPlan = plan;
    
    // Fetch plan from Supabase if not provided (or if explicitly null/undefined)
    if ((userPlan === null || userPlan === undefined) && userId) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        // Use bracket notation to bypass TypeScript type checking in JS file
        const { data, error } = await supabase
          .from('users')
          .select('plan')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle missing rows
        
        if (!error && data?.plan) {
          userPlan = data.plan;
        } else {
          // Default to FREE if no plan found or on error
          userPlan = 'FREE';
          if (error) {
            console.warn('⚠️ ExtensionSync: Error fetching plan:', error);
          }
        }
      } catch (e) {
        // Default to FREE on any error - don't block login
        console.warn('⚠️ ExtensionSync: Exception fetching plan:', e);
        userPlan = 'FREE';
      }
    }
    
    // Ensure plan is always set
    if (!userPlan) {
      userPlan = 'FREE';
    }
    
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

// Global state to track if sync is initialized and store cleanup function
let syncCleanup = null;
let isInitialized = false;

/**
 * Initialize real-time check sync listener with throttling
 * Call this once when app starts to enable automatic extension sync
 */
export function initializeExtensionSync() {
  // Prevent multiple initializations
  if (isInitialized) {
    return;
  }
  
  // Clean up any existing sync before creating new one
  if (syncCleanup) {
    syncCleanup();
    syncCleanup = null;
  }
  
  isInitialized = true;
  let syncTimeout = null;
  let periodicSyncInterval = null;
  let lastSyncTime = 0;
  const SYNC_THROTTLE_MS = 60000; // Sync at most once every 60 seconds (optimized to reduce Supabase requests)
  
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
        await performSyncToExtension();
        lastSyncTime = Date.now();
      }, SYNC_THROTTLE_MS - timeSinceLastSync);
      
      return;
    }
    
    // Enough time has passed, sync immediately
    await performSyncToExtension();
    lastSyncTime = now;
  };
  
  // Sync FROM Supabase TO extension (when web needs to send data to extension)
  const performSyncToExtension = async () => {
    try {
      // Get current session
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return; // No session, skip
      }
      
      // Sync silently - no need to log every time
      // This will fetch from Supabase and sync to extension
      await syncSessionToExtension(session, session.user.id);
    } catch (error) {
      // Only log errors
      console.warn('⚠️ Failed to sync checks to extension:', error);
    }
  };
  
  // Sync FROM Supabase TO web (to pick up changes made by extension or admin)
  const performSyncFromSupabase = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return; // No session, skip
      }
      
      const { syncUserChecksFromSupabase } = await import('./checkLimits.js');
      await syncUserChecksFromSupabase(session.user.id);
    } catch (error) {
      // Only log errors silently
      if (import.meta.env.DEV) {
        console.warn('⚠️ Failed to sync checks from Supabase:', error);
      }
    }
  };
  
  // Add event listener for when web updates checks
  window.addEventListener('checksUpdated', handleChecksUpdate);
  
  // Periodic sync FROM Supabase every 60 seconds to pick up changes made by extension or admin
  // Increased from 30s to 60s to reduce Supabase requests (~50% reduction)
  periodicSyncInterval = setInterval(async () => {
    await performSyncFromSupabase();
  }, SYNC_THROTTLE_MS);
  
  // Perform initial syncs
  performSyncFromSupabase().then(() => {
    performSyncToExtension();
    lastSyncTime = Date.now();
  });
  
  // Only log initialization once
  if (import.meta.env.DEV) {
    console.log('🔄 Extension sync listener initialized (throttled to 60s)');
  }
  
  // Store cleanup function globally
  const cleanup = () => {
    isInitialized = false;
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    if (periodicSyncInterval) {
      clearInterval(periodicSyncInterval);
      periodicSyncInterval = null;
    }
    window.removeEventListener('checksUpdated', handleChecksUpdate);
  };
  
  syncCleanup = cleanup;
  
  return cleanup;
}
