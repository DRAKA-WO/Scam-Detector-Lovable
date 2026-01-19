/**
 * Insights Calculator Utility
 * Calculates trends, patterns, risk scores, and weekly comparisons from scan history
 */

/**
 * Calculate daily trends from scan history (last 30 days)
 * @param {Array} scanHistory - Array of scan records
 * @returns {Array} Array of daily trend objects with date and counts by classification
 */
export function calculateDailyTrends(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return []
  }

  // Initialize 30 days of data
  const trends = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    trends.push({
      date: date.toISOString().split('T')[0],
      dateObj: date,
      scam: 0,
      suspicious: 0,
      safe: 0,
      total: 0
    })
  }

  // Count scans by date and classification
  scanHistory.forEach(scan => {
    const scanDate = new Date(scan.created_at)
    scanDate.setHours(0, 0, 0, 0)
    const dateStr = scanDate.toISOString().split('T')[0]

    const trendDay = trends.find(t => t.date === dateStr)
    if (trendDay) {
      trendDay[scan.classification]++
      trendDay.total++
    }
  })

  return trends
}

/**
 * Calculate scam type breakdown
 * @param {Array} scanHistory - Array of scan records
 * @returns {Object} Object with scam types as keys and counts as values
 */
export function calculateScamTypeBreakdown(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return {}
  }

  const breakdown = {}
  
  scanHistory.forEach(scan => {
    if (scan.classification === 'scam' && scan.analysis_result?.scam_type) {
      const scamType = scan.analysis_result.scam_type
      breakdown[scamType] = (breakdown[scamType] || 0) + 1
    }
  })

  return breakdown
}

/**
 * Calculate peak detection times (hour and day of week)
 * @param {Array} scanHistory - Array of scan records
 * @returns {Object} Object with peak hour and day analysis
 */
export function calculatePeakTimes(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return {
      peakHour: null,
      peakDay: null,
      hourDistribution: {},
      dayDistribution: {}
    }
  }

  const hourCounts = {}
  const dayCounts = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  scanHistory.forEach(scan => {
    const date = new Date(scan.created_at)
    const hour = date.getHours()
    const day = date.getDay()

    hourCounts[hour] = (hourCounts[hour] || 0) + 1
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })

  // Find peak hour
  const peakHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[a[0]] > hourCounts[b[0]] ? a : b)[0]

  // Find peak day
  const peakDayNum = Object.entries(dayCounts).reduce((a, b) => dayCounts[a[0]] > dayCounts[b[0]] ? a : b)[0]
  const peakDay = dayNames[parseInt(peakDayNum)]

  return {
    peakHour: parseInt(peakHour),
    peakDay,
    hourDistribution: hourCounts,
    dayDistribution: dayCounts
  }
}

/**
 * Calculate scan type distribution (image/url/text ratio)
 * @param {Array} scanHistory - Array of scan records
 * @returns {Object} Object with scan type counts and percentages
 */
export function calculateScanTypeDistribution(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return {
      image: { count: 0, percentage: 0 },
      url: { count: 0, percentage: 0 },
      text: { count: 0, percentage: 0 }
    }
  }

  const counts = {
    image: 0,
    url: 0,
    text: 0
  }

  scanHistory.forEach(scan => {
    if (counts.hasOwnProperty(scan.scan_type)) {
      counts[scan.scan_type]++
    }
  })

  const total = scanHistory.length
  return {
    image: {
      count: counts.image,
      percentage: total > 0 ? Math.round((counts.image / total) * 100) : 0
    },
    url: {
      count: counts.url,
      percentage: total > 0 ? Math.round((counts.url / total) * 100) : 0
    },
    text: {
      count: counts.text,
      percentage: total > 0 ? Math.round((counts.text / total) * 100) : 0
    }
  }
}

/**
 * Calculate weekly comparison (this week vs last week)
 * @param {Array} scanHistory - Array of scan records
 * @returns {Object} Object with weekly stats and comparisons
 */
export function calculateWeeklyComparison(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return {
      thisWeek: {
        total: 0,
        scams: 0,
        suspicious: 0,
        safe: 0
      },
      lastWeek: {
        total: 0,
        scams: 0,
        suspicious: 0,
        safe: 0
      },
      changes: {
        total: 0,
        scams: 0,
        suspicious: 0,
        safe: 0
      },
      percentageChanges: {
        total: 0,
        scams: 0,
        suspicious: 0,
        safe: 0
      }
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // This week: last 7 days
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - 7)
  
  // Last week: 7-14 days ago
  const lastWeekStart = new Date(today)
  lastWeekStart.setDate(today.getDate() - 14)
  const lastWeekEnd = new Date(today)
  lastWeekEnd.setDate(today.getDate() - 7)

  const thisWeek = {
    total: 0,
    scams: 0,
    suspicious: 0,
    safe: 0
  }

  const lastWeek = {
    total: 0,
    scams: 0,
    suspicious: 0,
    safe: 0
  }

  scanHistory.forEach(scan => {
    const scanDate = new Date(scan.created_at)
    
    if (scanDate >= thisWeekStart) {
      // This week
      thisWeek.total++
      thisWeek[scan.classification]++
    } else if (scanDate >= lastWeekStart && scanDate < lastWeekEnd) {
      // Last week
      lastWeek.total++
      lastWeek[scan.classification]++
    }
  })

  // Calculate changes and percentage changes
  const calculateChange = (thisVal, lastVal) => thisVal - lastVal
  const calculatePercentageChange = (thisVal, lastVal) => {
    if (lastVal === 0) return thisVal > 0 ? 100 : 0
    return Math.round(((thisVal - lastVal) / lastVal) * 100)
  }

  return {
    thisWeek,
    lastWeek,
    changes: {
      total: calculateChange(thisWeek.total, lastWeek.total),
      scams: calculateChange(thisWeek.scams, lastWeek.scams),
      suspicious: calculateChange(thisWeek.suspicious, lastWeek.suspicious),
      safe: calculateChange(thisWeek.safe, lastWeek.safe)
    },
    percentageChanges: {
      total: calculatePercentageChange(thisWeek.total, lastWeek.total),
      scams: calculatePercentageChange(thisWeek.scams, lastWeek.scams),
      suspicious: calculatePercentageChange(thisWeek.suspicious, lastWeek.suspicious),
      safe: calculatePercentageChange(thisWeek.safe, lastWeek.safe)
    }
  }
}

/**
 * Calculate protection score (0-100) based on detection rate, scan frequency, and risk patterns
 * @param {Array} scanHistory - Array of scan records
 * @returns {number} Protection score from 0-100
 */
export function calculateProtectionScore(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return 50 // Neutral score for no data
  }

  const total = scanHistory.length
  const scams = scanHistory.filter(s => s.classification === 'scam').length
  const safe = scanHistory.filter(s => s.classification === 'safe').length
  const suspicious = scanHistory.filter(s => s.classification === 'suspicious').length

  // Detection rate: Higher is better (more scans = better awareness)
  const detectionRate = Math.min(total / 30, 1) * 30 // Normalize to 30 days, max 30 points
  
  // Safety rate: Higher percentage of safe results = better
  const safetyRate = total > 0 ? (safe / total) * 40 : 0 // Max 40 points
  
  // Risk awareness: Detecting scams is good (being aware of threats)
  // But too many scams relative to total scans is concerning
  const scamRate = total > 0 ? scams / total : 0
  const riskAwareness = scamRate > 0.5 ? 10 : (scamRate > 0.3 ? 20 : 30) // Max 30 points
  // If user detected scams, that's actually good awareness, but too many is concerning
  
  // Bonus for scan frequency (being active)
  const scanFrequency = total >= 10 ? 10 : (total >= 5 ? 5 : 0) // Max 10 points

  const score = Math.min(
    Math.round(detectionRate + safetyRate + riskAwareness + scanFrequency),
    100
  )

  return score
}

/**
 * Calculate risk level based on scam frequency
 * @param {Array} scanHistory - Array of scan records
 * @returns {string} Risk level: 'low', 'medium', 'high'
 */
export function calculateRiskLevel(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return 'low'
  }

  const total = scanHistory.length
  const scams = scanHistory.filter(s => s.classification === 'scam').length
  const scamRate = scams / total

  if (scamRate > 0.4) return 'high'
  if (scamRate > 0.2) return 'medium'
  return 'low'
}

/**
 * Get personalized insights based on 30-day history
 * @param {Array} scanHistory - Array of scan records
 * @param {Object} weeklyComparison - Weekly comparison object
 * @param {Object} scamTypeBreakdown - Scam type breakdown object
 * @param {Object} peakTimes - Peak times analysis object
 * @returns {Array} Array of insight strings
 */
export function generatePersonalizedInsights(scanHistory, weeklyComparison, scamTypeBreakdown, peakTimes) {
  const insights = []

  if (!scanHistory || scanHistory.length === 0) {
    insights.push("Start scanning to get personalized insights and protect yourself from scams!")
    return insights
  }

  const total = scanHistory.length
  const scams = scanHistory.filter(s => s.classification === 'scam').length
  const thisWeekScams = weeklyComparison.thisWeek.scams

  // Weekly scam detection insight
  if (thisWeekScams > 0) {
    insights.push(`You detected ${thisWeekScams} scam${thisWeekScams > 1 ? 's' : ''} this week - stay vigilant!`)
    
    // Compare to last week
    if (weeklyComparison.changes.scams < 0) {
      insights.push(`Great news! You detected ${Math.abs(weeklyComparison.changes.scams)} fewer scams this week compared to last week.`)
    } else if (weeklyComparison.changes.scams > 0) {
      insights.push(`You detected ${weeklyComparison.changes.scams} more scam${weeklyComparison.changes.scams > 1 ? 's' : ''} this week. Be extra careful!`)
    }
  }

  // Peak day insight
  if (peakTimes.peakDay && peakTimes.dayDistribution[peakTimes.peakDay] > 2) {
    insights.push(`Most scams detected on ${peakTimes.peakDay} - be extra careful on this day!`)
  }

  // Most common scam type
  if (Object.keys(scamTypeBreakdown).length > 0) {
    const mostCommon = Object.entries(scamTypeBreakdown)
      .sort(([, a], [, b]) => b - a)[0]
    if (mostCommon) {
      const scamType = mostCommon[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      insights.push(`Your most common threat: ${scamType} - Learn how to identify and avoid it.`)
    }
  }

  // Overall protection insight
  const protectionScore = calculateProtectionScore(scanHistory)
  if (protectionScore >= 80) {
    insights.push("Excellent protection score! You're doing a great job staying safe.")
  } else if (protectionScore >= 60) {
    insights.push("Good protection score! Keep scanning to maintain your safety.")
  } else if (protectionScore < 40) {
    insights.push("Consider scanning more frequently to improve your protection.")
  }

  return insights
}
