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
    // Get checks from Supabase (or localStorage fallback) if not provided
    let checksCount = checks;
    if (checksCount === null && userId) {
      try {
        // First, try to sync from Supabase users table
        const { syncUserChecksFromSupabase } = await import('./checkLimits.js');
        checksCount = await syncUserChecksFromSupabase(userId);
      } catch (e) {
        // Fallback to localStorage
        try {
          const checksKey = `scam_checker_user_checks_${userId}`;
          const storedChecks = localStorage.getItem(checksKey);
          if (storedChecks !== null) {
            checksCount = parseInt(storedChecks, 10);
          }
        } catch (fallbackError) {
          console.warn('Could not get checks from localStorage:', fallbackError);
        }
      }
    }
    
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
    
    // Small delay to let extension process
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.warn('Failed to dispatch session sync event:', error);
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
    
    // Small delay to let extension process
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.warn('Failed to dispatch session clear event:', error);
  }
}
