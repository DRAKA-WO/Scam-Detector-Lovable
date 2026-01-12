/**
 * Utility to sync Supabase session with browser extension
 * Uses custom events to communicate with content script which forwards to extension
 */

/**
 * Sync session to extension via custom event
 * @param {Object} session - Supabase session object
 * @param {string} userId - User ID
 * @param {number} checks - User's remaining checks (optional)
 */
export async function syncSessionToExtension(session, userId, checks = null) {
  try {
    // Get checks from localStorage if not provided
    let checksCount = checks;
    if (checksCount === null && userId) {
      try {
        // Use the same key format as checkLimits.js
        const checksKey = `scam_checker_user_checks_${userId}`;
        const storedChecks = localStorage.getItem(checksKey);
        if (storedChecks !== null) {
          checksCount = parseInt(storedChecks, 10);
          console.log(`📊 Got ${checksCount} checks from localStorage for syncing to extension`);
        } else {
          console.warn(`⚠️ No checks found in localStorage with key: ${checksKey}`);
        }
      } catch (e) {
        console.warn('Could not get checks from localStorage:', e);
      }
    }
    
    // Log session structure before syncing
    console.log('📤 Syncing session to extension:', {
      userId,
      checks: checksCount,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token,
      hasUser: !!session?.user,
      sessionKeys: session ? Object.keys(session) : [],
      expiresAt: session?.expires_at
    });
    
    // Dispatch custom event that content script will listen for
    const event = new CustomEvent('scamChecker:syncSession', {
      detail: {
        session: session,
        userId: userId,
        checks: checksCount,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    console.log('✅ Session sync event dispatched:', { userId, syncTime: new Date().toLocaleTimeString() });
    
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
