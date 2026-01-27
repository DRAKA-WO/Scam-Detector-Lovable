/**
 * Utility to sync Supabase session with browser extension
 * Uses custom events to communicate with content script which forwards to extension
 */

/**
 * Sync session to extension via custom event
 * Only syncs session tokens - extension fetches checks/plan from Supabase when popup opens
 * This eliminates unnecessary Supabase requests since extension always fetches fresh data anyway
 * @param {Object} session - Supabase session object
 * @param {string} userId - User ID
 * @param {number} checks - Deprecated, ignored (extension fetches from Supabase)
 * @param {string} plan - Deprecated, ignored (extension fetches from Supabase)
 * @param {boolean} updateAuthMetadata - If true, update user metadata in Supabase auth with database avatar before syncing
 */
export async function syncSessionToExtension(session, userId, checks = null, plan = null, updateAuthMetadata = false) {
  try {
    let sessionToSync = session;
    
    // If requested, update auth metadata with database avatar before syncing
    // This ensures the extension gets the correct avatar whether it reads from event or re-fetches session
    if (updateAuthMetadata && session?.user) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Fetch avatar from database (source of truth)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (!userError && userData?.avatar_url) {
          const dbAvatarUrl = userData.avatar_url;
          
          // Strip INITIAL_AVATAR marker if present (extension needs clean base64 data URL)
          const INITIAL_AVATAR_MARKER = 'INITIAL_AVATAR:';
          const cleanAvatarUrl = dbAvatarUrl.startsWith(INITIAL_AVATAR_MARKER) 
            ? dbAvatarUrl.substring(INITIAL_AVATAR_MARKER.length)
            : dbAvatarUrl;
          
          const currentAvatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
          // Compare with clean version for current avatar too
          const cleanCurrentAvatarUrl = currentAvatarUrl?.startsWith(INITIAL_AVATAR_MARKER)
            ? currentAvatarUrl.substring(INITIAL_AVATAR_MARKER.length)
            : currentAvatarUrl;
          
          // Only update if database avatar is different from current metadata
          if (cleanAvatarUrl !== cleanCurrentAvatarUrl) {
            console.log('🔄 [ExtensionSync] Updating auth metadata with database avatar before sync');
            
            // Update user metadata in Supabase auth with clean avatar URL (no marker)
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: {
                ...session.user.user_metadata,
                avatar_url: cleanAvatarUrl,
                picture: cleanAvatarUrl // Also update picture for compatibility
              }
            });
            
            if (!updateError && updateData?.user) {
              // Get fresh session with updated metadata
              const { data: { session: freshSession } } = await supabase.auth.getSession();
              if (freshSession) {
                sessionToSync = freshSession;
                console.log('✅ [ExtensionSync] Auth metadata updated with database avatar');
              }
            } else if (updateError) {
              console.warn('⚠️ [ExtensionSync] Failed to update auth metadata:', updateError);
            }
          }
        }
      } catch (fetchErr) {
        console.warn('⚠️ [ExtensionSync] Error fetching/updating avatar for sync:', fetchErr);
        // Continue with original session if update fails
      }
    }
    
    // Only sync session tokens - extension will fetch checks/plan from Supabase when popup opens
    // This eliminates unnecessary Supabase requests and simplifies the code
    
    console.log(`📤 [ExtensionSync] Syncing session to extension (checks/plan will be fetched by extension when popup opens):`, { 
      userId
    });
    
    // Dispatch custom event that content script will listen for
    const event = new CustomEvent('scamChecker:syncSession', {
      detail: {
        session: sessionToSync,
        userId: userId,
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
      
      // Sync session with auth metadata update - this ensures extension gets database avatar
      // Extension fetches checks/plan from Supabase when popup opens
      await syncSessionToExtension(session, session.user.id, null, null, true);
    } catch (error) {
      // Only log errors
      console.warn('⚠️ Failed to sync session to extension:', error);
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
