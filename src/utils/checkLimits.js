const FREE_CHECKS_KEY = 'scam_checker_free_checks'
const FREE_CHECKS_AMOUNT = 2 // Number of free checks for anonymous users
const LAST_RESET_KEY = 'scam_checker_last_reset'
const USER_CHECKS_KEY_PREFIX = 'scam_checker_user_checks_'
const USER_STATS_KEY_PREFIX = 'scam_checker_user_stats_'
const SIGNUP_BONUS_CHECKS = 5 // Checks given on signup

// Global throttle to prevent too many concurrent requests to Supabase
// This prevents ERR_HTTP2_PROTOCOL_ERROR from too many simultaneous connections
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 150; // Minimum 150ms between any Supabase fetches

/**
 * Get remaining free checks for anonymous users
 * @returns {number} Number of remaining free checks
 */
export function getRemainingFreeChecks() {
  if (typeof window === 'undefined') return FREE_CHECKS_AMOUNT
  
  const stored = localStorage.getItem(FREE_CHECKS_KEY)
  const lastReset = localStorage.getItem(LAST_RESET_KEY)
  const now = new Date().getTime()
  
  // Reset monthly (30 days)
  if (lastReset && (now - parseInt(lastReset)) > 30 * 24 * 60 * 60 * 1000) {
    resetFreeChecks()
    return FREE_CHECKS_AMOUNT
  }
  
  return stored ? parseInt(stored) : FREE_CHECKS_AMOUNT
}

/**
 * Get remaining checks for logged-in users
 * Always syncs from Supabase if localStorage is empty (e.g., after clearing localStorage)
 * @param {string} userId - User ID from Supabase
 * @returns {number} Number of remaining checks
 */
export function getRemainingUserChecks(userId) {
  if (typeof window === 'undefined' || !userId) return 0
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const stored = localStorage.getItem(key)
  
  // If localStorage is empty, sync from Supabase (async, but return 0 for immediate response)
  if (!stored) {
    // Trigger async sync (don't await - return 0 immediately)
    syncUserChecksFromSupabase(userId).catch(err => {
      console.warn('Background sync of checks failed:', err);
    });
    return 0
  }
  
  return parseInt(stored)
}

/**
 * Sync user checks from Supabase to localStorage
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<number>} Number of checks
 */
export async function syncUserChecksFromSupabase(userId, retryCount = 0, maxRetries = 2) {
  if (typeof window === 'undefined' || !userId) return 0
  
  try {
    const { supabase } = await import('@/integrations/supabase/client')
    
    // CRITICAL FIX: Throttle requests to prevent HTTP/2 connection resets
    // Too many concurrent requests after email login cause ERR_HTTP2_PROTOCOL_ERROR
    // OAuth works because redirects naturally space out requests
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL - timeSinceLastFetch));
    }
    lastFetchTime = Date.now();
    
    // Get session - should already be in localStorage from signInWithPassword
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no valid session, skip fetch and return localStorage value
    if (sessionError || !session || !session.access_token) {
      return getRemainingUserChecks(userId);
    }
    
    // CRITICAL FIX: Wait significantly longer after email login to avoid HTTP/2 connection resets
    // OAuth redirects naturally provide 1-2 seconds of delay, email login needs explicit delay
    // The HTTP/2 connection needs time to stabilize before we can make API requests
    if (retryCount === 0) {
      // Wait longer to match OAuth's natural delay from redirect flow
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay like OAuth redirect
    }
    
    // Debug logging removed to prevent console errors
    
    // CRITICAL: Try to manually verify the Supabase client has the session
    // Check if we need to re-import the client to get a fresh instance
    const { data: { session: verifySession } } = await supabase.auth.getSession();
    
    // Use Supabase client directly (same as Dashboard.tsx)
    // The Chrome extension frame_ant.js intercepts both fetch and XHR, so we use Supabase client
    // which may have different behavior/timing that the extension allows
    
    let data = null;
    let error = null;
    
    // Use Supabase client directly (same approach as Dashboard.tsx uses for OAuth)
    try {
      const fetchResult = await supabase
      .from('users')
      .select('checks')
      .eq('id', userId)
        .maybeSingle();
      data = fetchResult.data;
      error = fetchResult.error;
    } catch (supabaseException) {
      error = supabaseException;
    }
    
    // Debug logging removed to prevent console errors
    
    if (error) {
      // Retry on network errors ("Failed to fetch")
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                             error.message?.includes('ERR_CONNECTION') ||
                             error.message?.includes('NetworkError');
      
      if (isNetworkError && retryCount < maxRetries) {
        // Exponential backoff
        const delay = 200 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry the fetch
        return await syncUserChecksFromSupabase(userId, retryCount + 1, maxRetries);
      }
      
      // Silent error handling - only log in DEV mode
      if (import.meta.env.DEV) {
        console.warn('⚠️ Error fetching checks from Supabase after all retries:', error)
      }
      return getRemainingUserChecks(userId) // Fallback to localStorage
    }
    
    if (data && typeof data.checks === 'number') {
      const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
      const currentLocalStorage = getRemainingUserChecks(userId)
      const supabaseChecks = data.checks
      
      // Check if there's a pending update for this user
      const pendingUpdate = pendingCheckUpdates.get(userId)
      if (pendingUpdate) {
        // There's a pending update - don't overwrite localStorage
        // The pending update will complete soon and sync will happen then
        return currentLocalStorage
      }
      
      // FIX: Don't overwrite localStorage if it's exactly 1 less than Supabase
      // This prevents race condition where check was just used (localStorage = 2)
      // but Supabase hasn't updated yet (Supabase = 3), causing sync to overwrite correct value
      if (supabaseChecks === currentLocalStorage + 1) {
        // Race condition: check was just used, Supabase not updated yet
        // Keep localStorage value (more recent)
        return currentLocalStorage
      } else {
        // Normal case: update localStorage with Supabase value
        // This handles: Supabase = localStorage (synced), Supabase < localStorage (admin decrement),
        // or Supabase > localStorage + 1 (checks added externally)
        localStorage.setItem(key, supabaseChecks.toString())
        // Dispatch event to update UI
        window.dispatchEvent(new Event('checksUpdated'))
        return supabaseChecks
      }
    }
    
    return getRemainingUserChecks(userId)
  } catch (error) {
    // CRITICAL FIX: Retry on network errors in catch block too
    const isNetworkError = error?.message?.includes('Failed to fetch') || 
                           error?.message?.includes('ERR_CONNECTION') ||
                           error?.message?.includes('NetworkError');
    
    if (isNetworkError && retryCount < maxRetries) {
      // Wait before retry (exponential backoff: 200ms, 400ms)
      await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retryCount)));
      // Retry the fetch
      return await syncUserChecksFromSupabase(userId, retryCount + 1, maxRetries);
    }
    
    // Silent error handling - only log in DEV mode to match OAuth sync behavior
    if (import.meta.env.DEV) {
      console.warn('⚠️ Exception syncing checks from Supabase:', error)
    }
    return getRemainingUserChecks(userId)
  }
}

/**
 * Initialize user checks (give 5 checks on signup ONLY for new users)
 * @param {string} userId - User ID from Supabase
 * @param {boolean} forceInit - Force initialization even if checks exist (for new signups)
 */
export async function initializeUserChecks(userId, forceInit = false) {
  if (typeof window === 'undefined' || !userId) return
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  
  try {
    const { supabase } = await import('@/integrations/supabase/client')
    
    // ALWAYS check Supabase first - this is the source of truth
    // Check if user record exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, checks')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle to handle missing rows gracefully
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "no rows" - log and use fallback
      console.error('Error checking user in Supabase:', fetchError)
    }
    
    if (existingUser) {
      // User EXISTS in database - sync their existing check count
      const dbChecks = typeof existingUser.checks === 'number' ? existingUser.checks : 0
      const currentLocal = getRemainingUserChecks(userId)
      
      // Check if there's a pending update - don't overwrite if check was just used
      const pendingUpdate = pendingCheckUpdates.get(userId)
      if (pendingUpdate) {
        // There's a pending update - keep local value
        return
      }
      
      // Don't overwrite if local is 1 less than DB (check was just used)
      if (dbChecks === currentLocal + 1) {
        // Race condition: check was just used, DB not updated yet
        return
      }
      
      localStorage.setItem(key, dbChecks.toString())
      
      // Dispatch event to update UI
      window.dispatchEvent(new Event('checksUpdated'))
      return
    }
    
    // User DOES NOT exist in database - this is a NEW user
    // Give them 5 signup bonus checks
    console.log(`🆕 New user detected - giving ${SIGNUP_BONUS_CHECKS} signup bonus checks`)
    
    // Create new user record in Supabase with signup bonus
    const { error: insertError } = await supabase
      .from('users')
      .insert({ id: userId, checks: SIGNUP_BONUS_CHECKS })
    
    if (insertError) {
      console.error('❌ Error creating user record in Supabase:', insertError)
      // Still update localStorage as fallback
      localStorage.setItem(key, SIGNUP_BONUS_CHECKS.toString())
    } else {
      console.log(`✅ Created new user record in Supabase with ${SIGNUP_BONUS_CHECKS} checks`)
      // Update localStorage to match database
      localStorage.setItem(key, SIGNUP_BONUS_CHECKS.toString())
    }
    
    // Dispatch event to update UI
    window.dispatchEvent(new Event('checksUpdated'))
    
  } catch (error) {
    console.error('❌ Exception initializing checks in Supabase:', error)
    // Fallback: only set localStorage if forceInit is true (shouldn't happen often)
    if (forceInit) {
      const existing = localStorage.getItem(key)
      if (!existing || parseInt(existing) === 0) {
        localStorage.setItem(key, SIGNUP_BONUS_CHECKS.toString())
        window.dispatchEvent(new Event('checksUpdated'))
      }
    }
  }
}

/**
 * Use a check for logged-in users
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<boolean>} True if check was used successfully, false if no checks remaining
 */
// Track pending check updates to prevent race conditions
export const pendingCheckUpdates = new Map()

export async function useUserCheck(userId) {
  if (typeof window === 'undefined' || !userId) return false
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const remaining = getRemainingUserChecks(userId)
  
  if (remaining > 0) {
    const newCount = remaining - 1
    
    // Update localStorage immediately (for instant UI update)
    localStorage.setItem(key, newCount.toString())
    
    // Mark that we have a pending update for this user
    pendingCheckUpdates.set(userId, { from: remaining, to: newCount, timestamp: Date.now() })
    
    // Dispatch event immediately to update UI
    window.dispatchEvent(new Event('checksUpdated'))
    
    // FIX: Update Supabase and clear pending flag when done
    // Update Supabase in background (fire and forget) so it doesn't block the UI
    ;(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client')
        const { error } = await supabase
          .from('users')
          .update({ checks: newCount })
          .eq('id', userId)
        
        if (error) {
          console.error('Error updating checks in Supabase:', error)
          // On error, keep pending flag longer to prevent overwrite
          setTimeout(() => {
            pendingCheckUpdates.delete(userId)
          }, 5000) // Clear after 5 seconds
        } else {
          console.log(`✅ Decremented checks in Supabase: ${remaining} → ${newCount}`)
          // Clear pending flag after a short delay to ensure database has committed
          setTimeout(() => {
            pendingCheckUpdates.delete(userId)
          }, 1000) // Clear after 1 second
        }
      } catch (error) {
        console.error('Exception updating checks in Supabase:', error)
        // On error, keep pending flag longer
        setTimeout(() => {
          pendingCheckUpdates.delete(userId)
        }, 5000)
      }
    })()
    
    return true
  }
  
  return false
}

/**
 * Use a free check (decrement counter) for anonymous users
 * @returns {boolean} True if check was used successfully, false if no checks remaining
 */
export function useFreeCheck() {
  if (typeof window === 'undefined') return false
  
  const remaining = getRemainingFreeChecks()
  
  if (remaining > 0) {
    localStorage.setItem(FREE_CHECKS_KEY, (remaining - 1).toString())
    
    // Set last reset time if not set
    if (!localStorage.getItem(LAST_RESET_KEY)) {
      localStorage.setItem(LAST_RESET_KEY, new Date().getTime().toString())
    }
    
    return true
  }
  
  return false
}

/**
 * Refund a free check (increment counter) for anonymous users
 * @returns {boolean} True if check was refunded successfully
 */
export function refundFreeCheck() {
  if (typeof window === 'undefined') return false
  
  const remaining = getRemainingFreeChecks()
  localStorage.setItem(FREE_CHECKS_KEY, (remaining + 1).toString())
  
  // Dispatch event to update UI
  window.dispatchEvent(new Event('checksUpdated'))
  
  return true
}

/**
 * Refund a check for logged-in users
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<boolean>} True if check was refunded successfully
 */
export async function refundUserCheck(userId) {
  if (typeof window === 'undefined' || !userId) return false
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const remaining = getRemainingUserChecks(userId)
  const newCount = remaining + 1
  
  // Update localStorage immediately (for instant UI update)
  localStorage.setItem(key, newCount.toString())
  
  // Dispatch event immediately to update UI
  window.dispatchEvent(new Event('checksUpdated'))
  
  // Update Supabase in background (fire and forget) so it doesn't block the UI
  ;(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const { error } = await supabase
        .from('users')
        .update({ checks: newCount })
        .eq('id', userId)
      
      if (error) {
        console.error('Error refunding check in Supabase:', error)
      } else {
        console.log(`✅ Refunded check in Supabase: ${remaining} → ${newCount}`)
      }
    } catch (error) {
      console.error('Exception refunding check in Supabase:', error)
    }
  })()
  
  return true
}

/**
 * Reset free checks (for testing or monthly reset)
 */
export function resetFreeChecks() {
  if (typeof window === 'undefined') return
  localStorage.setItem(FREE_CHECKS_KEY, FREE_CHECKS_AMOUNT.toString())
  localStorage.setItem(LAST_RESET_KEY, new Date().getTime().toString())
}

/**
 * Get user statistics
 * @param {string} userId - User ID from Supabase
 * @returns {Object} User stats
 */
export function getUserStats(userId) {
  if (typeof window === 'undefined' || !userId) {
    return {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    }
  }
  
  const key = `${USER_STATS_KEY_PREFIX}${userId}`
  const stored = localStorage.getItem(key)
  
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing user stats:', e)
    }
  }
  
  return {
    totalScans: 0,
    scamsDetected: 0,
    safeResults: 0,
    suspiciousResults: 0
  }
}

/**
 * Update user statistics
 * @param {string} userId - User ID from Supabase
 * @param {string} resultType - 'scam', 'safe', or 'suspicious'
 */
export function updateUserStats(userId, resultType) {
  if (typeof window === 'undefined' || !userId) return
  
  const stats = getUserStats(userId)
  stats.totalScans += 1
  
  if (resultType === 'scam') {
    stats.scamsDetected += 1
  } else if (resultType === 'safe') {
    stats.safeResults += 1
  } else if (resultType === 'suspicious') {
    stats.suspiciousResults += 1
  }
  
  const key = `${USER_STATS_KEY_PREFIX}${userId}`
  localStorage.setItem(key, JSON.stringify(stats))
}

/**
 * Check if user is logged in via Supabase
 * @returns {Promise<boolean>} True if user is authenticated
 */
export async function isUserLoggedIn() {
  if (typeof window === 'undefined') return false
  
  try {
    // Import Supabase client dynamically to avoid issues
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Error checking auth status:', error)
    return false
  }
}

/**
 * Get user's check count from backend (for logged-in users)
 * TODO: Implement API call to backend
 * @returns {Promise<number|null>} Number of checks or null if not logged in
 */
export async function getUserCheckCount() {
  const loggedIn = await isUserLoggedIn()
  if (!loggedIn) return null
  
  // TODO: Fetch from backend API
  // For now, return null - will be implemented when backend is ready
  return null
}
