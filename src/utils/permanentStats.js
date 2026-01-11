/**
 * PERMANENT USER STATS TRACKING (localStorage-based)
 * 
 * These stats are cumulative and NEVER decrease.
 * Stored in localStorage separate from scan history.
 */

const STATS_KEY_PREFIX = 'user_permanent_stats_';

/**
 * Get permanent user stats key
 */
function getStatsKey(userId) {
  return `${STATS_KEY_PREFIX}${userId}`;
}

/**
 * Initialize permanent stats for a user
 */
export function initializePermanentStats(userId) {
  const key = getStatsKey(userId);
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    const initialStats = {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0,
      lastUpdated: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(initialStats));
    console.log('✅ Initialized permanent stats for user:', userId);
  }
}

/**
 * Increment permanent stats when a scan is performed
 */
export function incrementPermanentStats(userId, classification) {
  const key = getStatsKey(userId);
  let stats;
  
  try {
    const existing = localStorage.getItem(key);
    stats = existing ? JSON.parse(existing) : {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    };
  } catch (e) {
    stats = {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    };
  }
  
  // Increment total
  stats.totalScans += 1;
  
  // Increment classification-specific counter
  if (classification === 'scam') {
    stats.scamsDetected = (stats.scamsDetected || 0) + 1;
  } else if (classification === 'safe') {
    stats.safeResults = (stats.safeResults || 0) + 1;
  } else if (classification === 'suspicious') {
    stats.suspiciousResults = (stats.suspiciousResults || 0) + 1;
  }
  
  stats.lastUpdated = Date.now();
  
  localStorage.setItem(key, JSON.stringify(stats));
  console.log('📊 Incremented permanent stats:', stats);
  
  return stats;
}

/**
 * Get permanent user stats
 */
export function getPermanentStats(userId) {
  const key = getStatsKey(userId);
  
  try {
    const existing = localStorage.getItem(key);
    if (existing) {
      const stats = JSON.parse(existing);
      console.log('📊 Retrieved permanent stats:', stats);
      return {
        totalScans: stats.totalScans || 0,
        scamsDetected: stats.scamsDetected || 0,
        safeResults: stats.safeResults || 0,
        suspiciousResults: stats.suspiciousResults || 0
      };
    }
  } catch (e) {
    console.error('Error reading permanent stats:', e);
  }
  
  // Return zeros if no stats exist
  return {
    totalScans: 0,
    scamsDetected: 0,
    safeResults: 0,
    suspiciousResults: 0
  };
}
