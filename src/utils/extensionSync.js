/**
 * Utility to sync Supabase session with browser extension
 * This allows the extension to access the user's session after login on web
 */

/**
 * Check if extension is installed
 */
export function isExtensionInstalled() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

/**
 * Sync session to extension
 * @param {Object} session - Supabase session object
 * @param {string} userId - User ID
 */
export async function syncSessionToExtension(session, userId) {
  if (!isExtensionInstalled()) {
    console.log('🔌 Extension not installed, skipping session sync');
    return;
  }

  try {
    await chrome.storage.local.set({
      supabaseSession: session,
      userId: userId,
      lastSyncTime: Date.now()
    });
    console.log('✅ Session synced to extension:', { userId, syncTime: new Date().toLocaleTimeString() });
  } catch (error) {
    console.warn('⚠️ Failed to sync session to extension:', error);
    // Don't throw error - extension sync is optional
  }
}

/**
 * Clear session from extension
 */
export async function clearExtensionSession() {
  if (!isExtensionInstalled()) {
    return;
  }

  try {
    await chrome.storage.local.remove(['supabaseSession', 'userId', 'lastSyncTime']);
    console.log('🧹 Extension session cleared');
  } catch (error) {
    console.warn('⚠️ Failed to clear extension session:', error);
  }
}

/**
 * Get session from extension storage (for debugging)
 */
export async function getExtensionSession() {
  if (!isExtensionInstalled()) {
    return null;
  }

  try {
    const result = await chrome.storage.local.get(['supabaseSession', 'userId', 'lastSyncTime']);
    return result;
  } catch (error) {
    console.error('Error getting extension session:', error);
    return null;
  }
}
