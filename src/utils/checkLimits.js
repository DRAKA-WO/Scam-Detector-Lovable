const FREE_CHECKS_KEY = 'scam_checker_free_checks'
const FREE_CHECKS_AMOUNT = 2 // Number of free checks
const LAST_RESET_KEY = 'scam_checker_last_reset'

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
 * Use a free check (decrement counter)
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
