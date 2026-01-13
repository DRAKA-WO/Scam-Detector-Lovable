const FREE_CHECKS_KEY = 'scam_checker_free_checks'
const FREE_CHECKS_AMOUNT = 2 // Number of free checks for anonymous users
const LAST_RESET_KEY = 'scam_checker_last_reset'
const USER_CHECKS_KEY_PREFIX = 'scam_checker_user_checks_'
const USER_STATS_KEY_PREFIX = 'scam_checker_user_stats_'
const SIGNUP_BONUS_CHECKS = 5 // Checks given on signup

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
 * @param {string} userId - User ID from Supabase
 * @returns {number} Number of remaining checks
 */
export function getRemainingUserChecks(userId) {
  if (typeof window === 'undefined' || !userId) return 0
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const stored = localStorage.getItem(key)
  return stored ? parseInt(stored) : 0
}

/**
 * Sync user checks from Supabase to localStorage
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<number>} Number of checks
 */
export async function syncUserChecksFromSupabase(userId) {
  if (typeof window === 'undefined' || !userId) return 0
  
  try {
    const { supabase } = await import('@/integrations/supabase/client')
    
    // Fetch user data from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('checks')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching checks from Supabase:', error)
      return getRemainingUserChecks(userId) // Fallback to localStorage
    }
    
    if (data && typeof data.checks === 'number') {
      // Update localStorage with Supabase value
      const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
      localStorage.setItem(key, data.checks.toString())
      console.log(`✅ Synced ${data.checks} checks from Supabase for user ${userId}`)
      
      // Dispatch event to update UI
      window.dispatchEvent(new Event('checksUpdated'))
      
      return data.checks
    }
    
    return getRemainingUserChecks(userId)
  } catch (error) {
    console.error('Exception syncing checks from Supabase:', error)
    return getRemainingUserChecks(userId)
  }
}

/**
 * Initialize user checks (give 5 checks on signup)
 * @param {string} userId - User ID from Supabase
 * @param {boolean} forceInit - Force initialization even if checks exist (for new signups)
 */
export async function initializeUserChecks(userId, forceInit = false) {
  if (typeof window === 'undefined' || !userId) return
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const existing = localStorage.getItem(key)
  
  // Force init for new signups, or initialize if user doesn't have checks yet
  if (forceInit || !existing || parseInt(existing) === 0) {
    localStorage.setItem(key, SIGNUP_BONUS_CHECKS.toString())
    console.log(`✅ Initialized ${SIGNUP_BONUS_CHECKS} checks for user ${userId} (force: ${forceInit})`)
    
    // Also ensure Supabase has the user record
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      
      // Check if user record exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, checks')
        .eq('id', userId)
        .single()
      
      if (!existingUser) {
        // Create new user record if it doesn't exist
        const { error: insertError } = await supabase
          .from('users')
          .insert({ id: userId, checks: SIGNUP_BONUS_CHECKS })
        
        if (insertError) {
          console.error('Error creating user record in Supabase:', insertError)
        } else {
          console.log(`✅ Created user record in Supabase with ${SIGNUP_BONUS_CHECKS} checks`)
        }
      } else if (forceInit) {
        // Update existing user with signup bonus
        const { error: updateError } = await supabase
          .from('users')
          .update({ checks: SIGNUP_BONUS_CHECKS })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Error updating checks in Supabase:', updateError)
        } else {
          console.log(`✅ Reset checks to ${SIGNUP_BONUS_CHECKS} in Supabase`)
        }
      }
    } catch (error) {
      console.error('Exception initializing checks in Supabase:', error)
    }
    
    // Dispatch event to update UI
    window.dispatchEvent(new Event('checksUpdated'))
  }
}

/**
 * Use a check for logged-in users
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<boolean>} True if check was used successfully, false if no checks remaining
 */
export async function useUserCheck(userId) {
  if (typeof window === 'undefined' || !userId) return false
  
  const key = `${USER_CHECKS_KEY_PREFIX}${userId}`
  const remaining = getRemainingUserChecks(userId)
  
  if (remaining > 0) {
    const newCount = remaining - 1
    
    // Update localStorage immediately (for instant UI update)
    localStorage.setItem(key, newCount.toString())
    
    // Also update Supabase (for persistence)
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const { error } = await supabase
        .from('users')
        .update({ checks: newCount })
        .eq('id', userId)
      
      if (error) {
        console.error('Error updating checks in Supabase:', error)
        // Don't fail - localStorage is already updated
      } else {
        console.log(`✅ Decremented checks in Supabase: ${remaining} → ${newCount}`)
      }
    } catch (error) {
      console.error('Exception updating checks in Supabase:', error)
      // Don't fail - localStorage is already updated
    }
    
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
