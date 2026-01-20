import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle, Clock, TrendingUp, LogOut, User, AlertCircle, History, X, Mail, Calendar, CreditCard, Settings, Download, Puzzle, RefreshCw, Upload, Lock, Edit2, Save, XCircle, Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import chromeLogo from "@/assets/chrome-logo.svg"
import edgeLogo from "@/assets/edge-logo.svg"
import braveLogo from "@/assets/brave-logo.svg"
import operaLogo from "@/assets/opera-logo.png"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import ScanHistory from '@/components/ScanHistory'
import ResultCard from '@/components/ResultCard'
import { getRemainingUserChecks } from '@/utils/checkLimits'
import { syncSessionToExtension, clearExtensionSession } from '@/utils/extensionSync'
import { supabase } from '@/integrations/supabase/client'
import { useAlerts } from '@/contexts/AlertsContext'

function Dashboard() {
  const navigate = useNavigate()
  
  // Initialize user state synchronously from localStorage if available
  const [user, setUser] = useState(() => {
    try {
      // Supabase stores session in localStorage with key: sb-<project-ref>-auth-token
      // Try to find the session key
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
      if (supabaseKeys.length > 0) {
        const sessionStr = localStorage.getItem(supabaseKeys[0])
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          if (session?.currentSession?.user) {
            return session.currentSession.user
          } else if (session?.user) {
            return session.user
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return null
  })
  
  const [remainingChecks, setRemainingChecks] = useState(() => {
    if (user?.id) {
      try {
        const checks = getRemainingUserChecks(user.id)
        return checks
      } catch (e) {
        return 0
      }
    }
    return 0
  })
  const [stats, setStats] = useState({
    totalScans: 0,
    scamsDetected: 0,
    safeResults: 0,
    suspiciousResults: 0
  })
  const [monthlyScans, setMonthlyScans] = useState(0)
  const [userPlan, setUserPlan] = useState('FREE')
  // Initialize loading state - check if we already have a session
  // IMPORTANT: Use the same logic as user state to ensure consistency
  const [loading, setLoading] = useState(() => {
    // If we have a user from the state above, start with loading false
    if (user) {
      return false
    }
    // Otherwise check localStorage directly (same dynamic key lookup as user state)
    try {
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
      if (supabaseKeys.length > 0) {
        const sessionStr = localStorage.getItem(supabaseKeys[0])
        if (sessionStr) {
          const session = JSON.parse(sessionStr)
          if (session?.currentSession?.user || session?.user) {
            return false
          }
        }
      }
    } catch (e) {
      // Ignore errors, default to loading true
    }
    return true
  })
  const effectIdRef = useRef(0)
  const hasLoadedRef = useRef(!!user)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedScan, setSelectedScan] = useState(null)
  const [scanHistoryFilter, setScanHistoryFilter] = useState('all') // 'all', 'safe', 'suspicious', 'scam'
  const [scamTypeBreakdown, setScamTypeBreakdown] = useState<Record<string, number>>({})
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [statsTimeFilter, setStatsTimeFilter] = useState<'today' | 'thisWeek' | 'thisMonth'>('thisMonth')
  
  // Use alerts from context (for global notifications)
  let alertsContext
  try {
    alertsContext = useAlerts()
  } catch (e) {
    alertsContext = null
  }
  
  // Keep local alerts state for backward compatibility, but prefer context
  const [localAlerts, setLocalAlerts] = useState<Array<{ 
    id: string
    type: string
    message: string
    severity: 'info' | 'warning' | 'error'
    scamType?: string
    isRiskAlert?: boolean
  }>>([])
  const [localCurrentRiskLevel, setLocalCurrentRiskLevel] = useState<string | null>(null)
  
  // Use context values if available, otherwise use local state
  const alerts = alertsContext?.alerts || localAlerts
  const currentRiskLevel = alertsContext?.currentRiskLevel || localCurrentRiskLevel
  const [isTipExpanded, setIsTipExpanded] = useState(true) // Tip expanded by default

  // Helper functions for dismissed alerts persistence
  const getDismissedAlerts = (userId: string): Record<string, boolean> => {
    try {
      const key = `scam_checker_dismissed_alerts_${userId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Error loading dismissed alerts:', error)
      return {}
    }
  }

  const dismissAlert = (userId: string, alertId: string) => {
    try {
      const key = `scam_checker_dismissed_alerts_${userId}`
      const dismissed = getDismissedAlerts(userId)
      dismissed[alertId] = true
      localStorage.setItem(key, JSON.stringify(dismissed))
    } catch (error) {
      console.warn('Error saving dismissed alert:', error)
    }
  }

  const isAlertDismissed = (userId: string, alertId: string): boolean => {
    const dismissed = getDismissedAlerts(userId)
    return dismissed[alertId] === true
  }
  
  // Account editing state
  const [editingSection, setEditingSection] = useState<'none' | 'profile'>('none')
  const [editingUsername, setEditingUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-sync existing session to extension on Dashboard load
  useEffect(() => {
    const syncExistingSession = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && session.user && !error) {
          console.log('🔍 Dashboard: Syncing session to extension...');
          
          // Fetch plan first, then sync with plan
          let userPlan = 'FREE';
          try {
            const { data: planData, error: planError } = await (supabase as any)
              .from('users')
              .select('plan')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!planError && planData?.plan) {
              userPlan = planData.plan;
              console.log('📊 Dashboard: Fetched plan for sync:', userPlan);
            }
          } catch (planErr) {
            console.warn('⚠️ Dashboard: Error fetching plan for sync:', planErr);
          }
          
          await syncSessionToExtension(session, session.user.id, null, userPlan);
          console.log('✅ Dashboard: Session synced to extension with plan:', userPlan);
        }
      } catch (error) {
        console.error('Dashboard: Error syncing session to extension:', error);
      }
    };
    
    syncExistingSession();
  }, []); // Empty dependency array = runs once on mount

  // Listen for checks updates in real-time (sync with Header)
  useEffect(() => {
    if (!user?.id) return;
    
    const handleChecksUpdate = () => {
      const checks = getRemainingUserChecks(user.id);
      console.log('🔄 Dashboard: Checks updated in real-time', checks);
      setRemainingChecks(checks);
    };
    
    // Listen for both storage changes (cross-tab) and custom event (same-tab)
    window.addEventListener('storage', handleChecksUpdate);
    window.addEventListener('checksUpdated', handleChecksUpdate);
    
    return () => {
      window.removeEventListener('storage', handleChecksUpdate);
      window.removeEventListener('checksUpdated', handleChecksUpdate);
    };
  }, [user?.id]);


  // Function to generate smart alerts based on scan history
  const generateAlerts = useCallback(async (history: any[]) => {
    if (!history || history.length === 0) {
      setLocalAlerts([])
      setLocalCurrentRiskLevel(null)
      return
    }

    if (!user?.id) {
      setLocalAlerts([])
      return
    }

    try {
      const { calculateWeeklyComparison, calculateRiskLevel, calculateScamTypeBreakdown } = await import('@/utils/insightsCalculator')
      const weeklyComparison = calculateWeeklyComparison(history)
      const riskLevel = calculateRiskLevel(history)
      const scamTypes = calculateScamTypeBreakdown(history)
      
      console.log('🔔 Generating alerts from scan history:', {
        historyLength: history.length,
        weeklyComparison,
        riskLevel,
        currentRiskLevel: localCurrentRiskLevel,
        scamTypesCount: Object.keys(scamTypes).length
      })
      
      const newAlerts: Array<{ 
        id: string
        type: string
        message: string
        severity: 'info' | 'warning' | 'error'
        scamType?: string
        isRiskAlert?: boolean
      }> = []
      
      // Check dismissed alerts (for non-risk alerts only)
      const dismissed = getDismissedAlerts(user.id)
      
      // Handle risk level alerts - always show for current risk level, only hide when level changes
      const riskLevelChanged = localCurrentRiskLevel !== null && localCurrentRiskLevel !== riskLevel
      
      // Always show risk alert for current risk level (non-dismissible)
      if (riskLevel === 'high') {
        newAlerts.push({
          id: 'high-risk',
          type: 'high-risk',
          message: '🔴 High-risk pattern detected: You\'re encountering a high percentage of scams. Be extra cautious!',
          severity: 'error',
          isRiskAlert: true
        })
      }
      
      if (riskLevel === 'medium') {
        newAlerts.push({
          id: 'medium-risk',
          type: 'medium-risk',
          message: '⚠️ Medium-risk pattern detected: You\'re encountering some scams. Stay vigilant!',
          severity: 'warning',
          isRiskAlert: true
        })
      }
      
      // Update current risk level (local state for backward compatibility)
      setLocalCurrentRiskLevel(riskLevel)
      
      // Alert for unusual spike in scams (relaxed condition: >1 scam and >30% increase)
      // Use week-based ID so dismissal persists for the week
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0)
      const weekId = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000)) // Week number since epoch
      const spikeAlertId = `spike-week-${weekId}`
      
      if (weeklyComparison.changes.scams > 1 && weeklyComparison.percentageChanges.scams > 30) {
        if (!isAlertDismissed(user.id, spikeAlertId)) {
          newAlerts.push({
            id: spikeAlertId,
            type: 'spike',
            message: `⚠️ Unusual spike detected: ${weeklyComparison.changes.scams} more scams this week (${weeklyComparison.percentageChanges.scams}% increase)`,
            severity: 'warning'
          })
        }
      }
      
      // Alert for significant scan activity increase (new)
      // Use week-based ID so dismissal persists for the week
      const activityAlertId = `high-activity-week-${weekId}`
      if (weeklyComparison.changes.total > 5 && weeklyComparison.percentageChanges.total > 50) {
        if (!isAlertDismissed(user.id, activityAlertId)) {
          newAlerts.push({
            id: activityAlertId,
            type: 'high-activity',
            message: `📊 High scan activity: ${weeklyComparison.changes.total} more scans this week (${weeklyComparison.percentageChanges.total}% increase) - Great job staying protected!`,
            severity: 'info'
          })
        }
      }
      
      // Alert for new scam type detected - CREATE INDIVIDUAL ALERTS FOR EACH TYPE
      if (Object.keys(scamTypes).length > 0 && history.length >= 2) {
        const recentScams = history
          .filter(scan => scan.classification === 'scam' && scan.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .map(scan => scan.analysis_result?.scam_type)
          .filter(Boolean)
        
        if (recentScams.length > 0) {
          const uniqueRecentTypes = [...new Set(recentScams)]
          const oldScams = history
            .filter(scan => scan.classification === 'scam' && scan.created_at <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .map(scan => scan.analysis_result?.scam_type)
            .filter(Boolean)
          const oldTypes = [...new Set(oldScams)]
          
          const newTypes = uniqueRecentTypes.filter(type => !oldTypes.includes(type))
          
          // Create individual alert for each new scam type
          newTypes.forEach(scamType => {
            const alertId = `new-scam-type-${scamType}`
            if (!isAlertDismissed(user.id, alertId)) {
              const formattedType = scamType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              
              newAlerts.push({
                id: alertId,
                type: 'new-scam-type',
                message: `🆕 New scam type detected: ${formattedType}`,
                severity: 'info',
                scamType
              })
            }
          })
        }
      }
      
      // Alert for first scam detected (new)
      // Use week-based ID so dismissal persists for the week
      const firstScamAlertId = `first-scam-week-${weekId}`
      if (weeklyComparison.thisWeek.scams === 1 && weeklyComparison.lastWeek.scams === 0) {
        if (!isAlertDismissed(user.id, firstScamAlertId)) {
          newAlerts.push({
            id: firstScamAlertId,
            type: 'first-scam',
            message: '⚠️ Scam detected this week - Review the details and stay cautious!',
            severity: 'warning'
          })
        }
      }
      
      // Sort alerts: risk alerts first, then others
      const sortedAlerts = newAlerts.sort((a, b) => {
        if (a.isRiskAlert && !b.isRiskAlert) return -1
        if (!a.isRiskAlert && b.isRiskAlert) return 1
        return 0
      })
      
      console.log('🔔 Generated alerts:', sortedAlerts)
      setLocalAlerts(sortedAlerts)
    } catch (error) {
      console.error('Error generating alerts:', error)
      setLocalAlerts([])
    }
  }, [user?.id, localCurrentRiskLevel])

  // Regenerate alerts whenever scan history changes
  useEffect(() => {
    generateAlerts(scanHistory)
  }, [scanHistory, generateAlerts])

  // Calculate filtered stats based on time filter
  const filteredStats = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return {
        totalScans: 0,
        scamsDetected: 0,
        safeResults: 0,
        suspiciousResults: 0
      }
    }

    const now = new Date()
    let startDate: Date
    let endDate: Date

    // Helper to get start of day in local timezone
    const getStartOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }

    // Helper to get end of day in local timezone
    const getEndOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(23, 59, 59, 999)
      return d
    }

    switch (statsTimeFilter) {
      case 'today':
        // Start and end of today in local timezone
        startDate = getStartOfDay(now)
        endDate = getEndOfDay(now)
        break
      case 'thisWeek':
        // Start of week (Sunday 00:00:00) in local timezone
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        startDate = getStartOfDay(startDate)
        // End of today
        endDate = getEndOfDay(now)
        break
      case 'thisMonth':
        // Start of month (1st day 00:00:00) in local timezone
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = getStartOfDay(startDate)
        // End of today
        endDate = getEndOfDay(now)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = getStartOfDay(startDate)
        endDate = getEndOfDay(now)
    }

    console.log('🔍 Filtering stats:', {
      filter: statsTimeFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      totalScans: scanHistory.length,
      now: now.toISOString()
    })

    const filtered = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      
      // Parse the scan date - scan.created_at is in UTC/ISO format
      const scanDate = new Date(scan.created_at)
      
      // Check if date is valid
      if (isNaN(scanDate.getTime())) {
        console.warn('⚠️ Invalid date for scan:', scan.id, scan.created_at)
        return false
      }
      
      // Convert scan date to local date components for comparison
      // This ensures we're comparing "today" in the user's local timezone
      const scanLocalYear = scanDate.getFullYear()
      const scanLocalMonth = scanDate.getMonth()
      const scanLocalDate = scanDate.getDate()
      
      // Get local date components for start/end boundaries
      const startLocalYear = startDate.getFullYear()
      const startLocalMonth = startDate.getMonth()
      const startLocalDate = startDate.getDate()
      const startLocalHours = startDate.getHours()
      const startLocalMinutes = startDate.getMinutes()
      const startLocalSeconds = startDate.getSeconds()
      
      const endLocalYear = endDate.getFullYear()
      const endLocalMonth = endDate.getMonth()
      const endLocalDate = endDate.getDate()
      const endLocalHours = endDate.getHours()
      const endLocalMinutes = endDate.getMinutes()
      const endLocalSeconds = endDate.getSeconds()
      
      // Compare using timestamps (this handles timezone correctly)
      // getTime() returns UTC milliseconds since epoch, so comparison is timezone-agnostic
      const scanTime = scanDate.getTime()
      const startTime = startDate.getTime()
      const endTime = endDate.getTime()
      
      // Double-check: also compare local date strings to ensure we're filtering correctly
      const scanLocalDateStr = `${scanLocalYear}-${String(scanLocalMonth + 1).padStart(2, '0')}-${String(scanLocalDate).padStart(2, '0')}`
      const startLocalDateStr = `${startLocalYear}-${String(startLocalMonth + 1).padStart(2, '0')}-${String(startLocalDate).padStart(2, '0')}`
      const endLocalDateStr = `${endLocalYear}-${String(endLocalMonth + 1).padStart(2, '0')}-${String(endLocalDate).padStart(2, '0')}`
      
      // Use timestamp comparison (most reliable)
      const isInRange = scanTime >= startTime && scanTime <= endTime
      
      // For "today" filter, use local date string comparison to avoid timezone edge cases
      let finalInRange = isInRange
      if (statsTimeFilter === 'today') {
        // For today, the scan's local date must match today's local date exactly
        // This ensures we only get scans from today, not yesterday or tomorrow
        finalInRange = scanLocalDateStr === startLocalDateStr
      } else {
        // For week/month filters, use timestamp comparison
        finalInRange = isInRange
      }
      
      // Log all scans for debugging (limited to avoid spam)
      if (scanHistory.length <= 25) {
        console.log(`🔍 Scan ${scanHistory.indexOf(scan) + 1}/${scanHistory.length}:`, {
          scanId: scan.id?.substring(0, 8),
          scanDateISO: scanDate.toISOString(),
          scanLocalDate: scanLocalDateStr,
          startLocalDate: startLocalDateStr,
          endLocalDate: endLocalDateStr,
          scanTime,
          startTime,
          endTime,
          isInRange: isInRange ? '✅' : '❌',
          finalInRange: finalInRange ? '✅' : '❌',
          filter: statsTimeFilter
        })
      }
      
      return finalInRange
    })

    const result = {
      totalScans: filtered.length,
      scamsDetected: filtered.filter(s => s.classification === 'scam').length,
      safeResults: filtered.filter(s => s.classification === 'safe').length,
      suspiciousResults: filtered.filter(s => s.classification === 'suspicious').length
    }

    // Log date distribution to understand why filters might show same results
    const dateDistribution = scanHistory.reduce((acc, scan) => {
      const scanDate = new Date(scan.created_at)
      const dateKey = scanDate.toISOString().split('T')[0] // YYYY-MM-DD
      acc[dateKey] = (acc[dateKey] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('📊 Filtered stats result:', {
      filter: statsTimeFilter,
      ...result,
      filteredCount: filtered.length,
      totalScansInHistory: scanHistory.length,
      dateDistribution,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    })

    return result
  }, [scanHistory, statsTimeFilter])

  // Calculate filtered scam type breakdown based on time filter
  const filteredScamTypeBreakdown = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return {}
    }

    const now = new Date()
    let startDate: Date
    let endDate: Date

    // Helper to get start of day in local timezone
    const getStartOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }

    // Helper to get end of day in local timezone
    const getEndOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(23, 59, 59, 999)
      return d
    }

    switch (statsTimeFilter) {
      case 'today':
        startDate = getStartOfDay(now)
        endDate = getEndOfDay(now)
        break
      case 'thisWeek':
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        startDate = getStartOfDay(startDate)
        endDate = getEndOfDay(now)
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = getStartOfDay(startDate)
        endDate = getEndOfDay(now)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = getStartOfDay(startDate)
        endDate = getEndOfDay(now)
    }

    const filtered = scanHistory.filter(scan => {
      if (!scan.created_at || scan.classification !== 'scam') return false
      
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      
      const scanTime = scanDate.getTime()
      const startTime = startDate.getTime()
      const endTime = endDate.getTime()
      
      // Use same filtering logic as filteredStats
      if (statsTimeFilter === 'today') {
        const scanLocalYear = scanDate.getFullYear()
        const scanLocalMonth = scanDate.getMonth()
        const scanLocalDate = scanDate.getDate()
        const scanLocalDateStr = `${scanLocalYear}-${String(scanLocalMonth + 1).padStart(2, '0')}-${String(scanLocalDate).padStart(2, '0')}`
        const startLocalYear = startDate.getFullYear()
        const startLocalMonth = startDate.getMonth()
        const startLocalDate = startDate.getDate()
        const startLocalDateStr = `${startLocalYear}-${String(startLocalMonth + 1).padStart(2, '0')}-${String(startLocalDate).padStart(2, '0')}`
        return scanLocalDateStr === startLocalDateStr
      } else {
        return scanTime >= startTime && scanTime <= endTime
      }
    })

    // Calculate breakdown from filtered scans
    const breakdown: Record<string, number> = {}
    filtered.forEach(scan => {
      if (scan.classification === 'scam' && scan.analysis_result?.scam_type) {
        const scamType = scan.analysis_result.scam_type
        breakdown[scamType] = (breakdown[scamType] || 0) + 1
      }
    })

    return breakdown
  }, [scanHistory, statsTimeFilter])

  // Real-time subscription to scan_history table for automatic updates
  useEffect(() => {
    if (!user?.id) return

    console.log('📡 Dashboard: Setting up real-time subscription to scan_history for user:', user.id)
    
    // Subscribe to changes in scan_history table
    const channel = supabase
      .channel(`scan_history_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'scan_history',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 Dashboard: Scan history changed:', payload.eventType, payload.new || payload.old)
          // Refresh scan history when any change occurs
          try {
            const { getScanHistory } = await import('@/utils/scanHistory')
            const history = await getScanHistory(user.id)
            setScanHistory(history)
            console.log('✅ Dashboard: Scan history refreshed via real-time subscription, new length:', history.length)
          } catch (error) {
            console.error('❌ Dashboard: Error refreshing scan history:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Dashboard: Subscription status:', status)
      })

    return () => {
      console.log('📡 Dashboard: Unsubscribing from scan_history changes')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Function to refresh stats from database
  const refreshStats = async () => {
    if (!user?.id) return
    
    try {
      const { getUserPermanentStats, getScanHistory } = await import('@/utils/scanHistory')
      const userStats = await getUserPermanentStats(user.id)
      console.log('🔄 Dashboard: Refreshed permanent stats', userStats)
      setStats(userStats)
      
      // Calculate scam type breakdown and monthly scans
      try {
        const history = await getScanHistory(user.id)
        setScanHistory(history)
        
        // Calculate monthly scans (last 30 days)
        setMonthlyScans(history.length)
        
        // Calculate scam type breakdown if there are scams detected
        if (userStats.scamsDetected > 0) {
          const breakdown: Record<string, number> = {}
          
          history.forEach(scan => {
            if (scan.classification === 'scam') {
              // Count all scams, even if they don't have a scam_type
              const scamType = scan.analysis_result?.scam_type || 'Unknown Scam Type'
              breakdown[scamType] = (breakdown[scamType] || 0) + 1
            }
          })
          
          setScamTypeBreakdown(breakdown)
        } else {
          setScamTypeBreakdown({})
        }

        // Alerts will be generated automatically via useEffect when scanHistory changes
      } catch (error) {
        console.error('Error calculating scam type breakdown:', error)
        setMonthlyScans(0)
        setScanHistory([])
      }
      
      // Also refresh plan with retry logic
      const refreshPlanWithRetry = async (maxRetries = 2) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const { supabase } = await import('@/integrations/supabase/client')
            const { data, error } = await (supabase as any)
              .from('users')
              .select('plan')
              .eq('id', user.id)
              .maybeSingle()
            
            if (!error && data?.plan) {
              setUserPlan(data.plan)
              // Sync plan to extension
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await syncSessionToExtension(session, user.id, null, data.plan)
              }
              return // Success
            }
            return // Not found or no error
          } catch (planError: any) {
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)))
              continue
            } else {
              console.warn('⚠️ Dashboard: Error refreshing plan after retries:', planError)
            }
          }
        }
      }
      await refreshPlanWithRetry()
    } catch (error) {
      console.error('❌ Dashboard: Error refreshing stats:', error)
    }
  }

  useEffect(() => {
    const currentEffectId = ++effectIdRef.current
    let subscription: { unsubscribe?: () => void } | null = null
    
    // Helper to update user data
    const updateUserData = async (session) => {
      if (!session?.user) {
        return false
      }
      
      // Check if this effect is still active (not cleaned up)
      if (currentEffectId !== effectIdRef.current) {
        return false
      }
      
      console.log('📊 Dashboard: Updating user data', session.user.email)
      setUser(session.user)
      
      // Get user's remaining checks
      const checks = getRemainingUserChecks(session.user.id)
      console.log('📊 Dashboard: User checks', checks)
      setRemainingChecks(checks)
      
      // Get user stats from permanent stats table (cumulative, never decrease)
      try {
        const { getUserPermanentStats, getScanHistory } = await import('@/utils/scanHistory')
        const userStats = await getUserPermanentStats(session.user.id)
        console.log('📊 Dashboard: User permanent stats', userStats)
        setStats(userStats)
        
        // Calculate scam type breakdown and monthly scans
        try {
          const history = await getScanHistory(session.user.id)
          setScanHistory(history)
          
          // Calculate monthly scans (last 30 days)
          setMonthlyScans(history.length)
          
          // Calculate scam type breakdown if there are scams detected
          if (userStats.scamsDetected > 0) {
            const breakdown: Record<string, number> = {}
            
            history.forEach(scan => {
              if (scan.classification === 'scam' && scan.analysis_result?.scam_type) {
                const scamType = scan.analysis_result.scam_type
                breakdown[scamType] = (breakdown[scamType] || 0) + 1
              }
            })
            
            setScamTypeBreakdown(breakdown)
          } else {
            setScamTypeBreakdown({})
          }
        } catch (error) {
          console.error('Error calculating scam type breakdown:', error)
          setMonthlyScans(0)
          setScanHistory([])
        }
      } catch (error) {
        console.error('❌ Dashboard: Error fetching stats:', error)
        setStats({
          totalScans: 0,
          scamsDetected: 0,
          safeResults: 0,
          suspiciousResults: 0
        })
      }
      
      // Fetch user plan from users table with retry logic
      const fetchPlanWithRetry = async (maxRetries = 3) => {
        const { supabase } = await import('@/integrations/supabase/client')
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const { data, error } = await (supabase as any)
              .from('users')
              .select('plan')
              .eq('id', session.user.id)
              .maybeSingle()
            
            if (!error && data?.plan) {
              console.log('📊 Dashboard: User plan', data.plan)
              setUserPlan(data.plan)
              // Sync plan to extension
              await syncSessionToExtension(session, session.user.id, null, data.plan)
              return // Success
            } else {
              // Default to FREE if no plan found
              setUserPlan('FREE')
              return
            }
          } catch (error: any) {
            if (attempt < maxRetries - 1) {
              // Exponential backoff before retry
              const delay = 200 * Math.pow(2, attempt)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            } else {
              console.warn('⚠️ Dashboard: Error fetching plan after retries:', error)
              setUserPlan('FREE')
            }
          }
        }
      }
      
      // Delay plan fetch slightly to avoid concurrent requests after login
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchPlanWithRetry()
      
      // Double-check effect is still active before setLoading
      if (currentEffectId !== effectIdRef.current) {
        return false
      }
      setLoading(false)
      hasLoadedRef.current = true
      
      // Clear hash if it exists
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      
      return true
    }
    
    // Check session immediately and synchronously
    const checkSessionImmediately = async () => {
      try {
        console.log('📊 Dashboard: Checking session immediately...')
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Dashboard: Session error', error)
          return false
        }
        
        if (session?.user) {
          console.log('📊 Dashboard: Session found immediately')
          return updateUserData(session)
        }
        
        return false
      } catch (error) {
        console.error('❌ Dashboard: Error checking session', error)
        return false
      }
    }
    
    // Set up auth listener
    const setupAuthListener = async () => {
      try {
        console.log('📊 Dashboard: Setting up auth listener...')
        const { supabase } = await import('@/integrations/supabase/client')
        
        // Check session immediately first
        const hasSession = await checkSessionImmediately()
        if (hasSession && currentEffectId === effectIdRef.current) {
          // We already have a session, we're done
          return
        }
        
        // Set up listener for future changes
        const authResponse = supabase.auth.onAuthStateChange(async (_event, session) => {
          // Check if this effect is still active before processing
          if (currentEffectId !== effectIdRef.current) {
            return
          }
          console.log('📊 Dashboard: Auth state changed', _event, session ? 'Session received' : 'No session')
          
          if (!session) {
            if (_event === 'SIGNED_OUT') {
              console.log('📊 Dashboard: User signed out, redirecting')
              navigate('/')
            } else if (loading) {
              // If we're loading and have no session, redirect
              navigate('/')
            }
          } else {
            // We have a session - update user data
            updateUserData(session)
          }
        })
        // Handle both old and new Supabase client API formats
        subscription = (authResponse as any)?.data?.subscription || (authResponse as any)?.data || authResponse || null
        
        // If we still don't have a session, check again after a short delay
        // This handles the case where Supabase is still processing
        if (!hasSession) {
          setTimeout(async () => {
            // Check if this effect is still active
            if (currentEffectId !== effectIdRef.current) {
              return
            }
            const hasSessionNow = await checkSessionImmediately()
            if (!hasSessionNow && currentEffectId === effectIdRef.current) {
              console.log('📊 Dashboard: No session found after delay, redirecting')
              navigate('/')
            }
          }, 1000)
        }
        
      } catch (error) {
        console.error('❌ Dashboard: Error setting up auth listener:', error)
        // On error, try one more time after a delay
        setTimeout(async () => {
          if (currentEffectId !== effectIdRef.current) return
          const hasSession = await checkSessionImmediately()
          if (!hasSession && currentEffectId === effectIdRef.current) {
            setLoading(false)
            navigate('/')
          }
        }, 1500)
      }
    }

    setupAuthListener()
    
    return () => {
      // Increment effect ID to invalidate any pending async operations
      effectIdRef.current++
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [navigate])


  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      
      // Clear user state immediately
      setUser(null)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
      }
      
      // Clear all Supabase-related localStorage keys
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key.includes('auth-token')
      )
      
      supabaseKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn('Failed to remove localStorage key:', key, e)
        }
      })
      
      // Clear extension session
      await clearExtensionSession()
      
      // Clear any user-specific localStorage items
      if (user?.id) {
        const hasSeenKey = `has_seen_latest_scan_${user.id}`
        try {
          localStorage.removeItem(hasSeenKey)
        } catch (e) {
          // Ignore
        }
      }
      
      // Small delay to ensure localStorage is cleared
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate to home page with page reload to ensure clean state
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
      // Still try to navigate and clear localStorage even on error
      try {
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || 
          key.includes('supabase') ||
          key.includes('auth-token')
        )
        supabaseKeys.forEach(key => localStorage.removeItem(key))
        await clearExtensionSession()
        window.location.href = '/'
      } catch (e) {
        navigate('/')
      }
    }
  }


  const startEditingProfile = () => {
    setEditingUsername(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '')
    setAvatarFile(null)
    setAvatarPreview(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null)
    setShouldRemoveAvatar(false)
    setAccountError('')
    setAccountSuccess('')
    setEditingSection('profile')
  }


  const cancelEditing = () => {
    setEditingSection('none')
    setEditingUsername('')
    setAvatarFile(null)
    setAvatarPreview(null)
    setShouldRemoveAvatar(false)
    setAccountError('')
    setAccountSuccess('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAccountError('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setAccountError('Image size must be less than 5MB')
        return
      }
      setAvatarFile(file)
      setShouldRemoveAvatar(false) // Clear removal flag when new file selected
      setAccountError('')
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    // Only clear local state - actual removal will happen on Save
    setAvatarFile(null)
    setAvatarPreview(null)
    setShouldRemoveAvatar(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        if (file.size < 500 * 1024) {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
        } else {
          throw new Error('Avatar upload failed. Please ensure the storage bucket "avatars" exists in Supabase.')
        }
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return urlData?.publicUrl || null
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      return null
    }
  }


  const saveProfileChanges = async () => {
    if (!user) {
      setAccountError('User not found. Please log in again.')
      return
    }

    setAccountLoading(true)
    setAccountError('')
    setAccountSuccess('')

    try {
      // Verify session is still valid
      const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession()
      if (sessionCheckError || !session) {
        throw new Error('Session expired. Please log in again.')
      }

      // Start with existing user metadata as base
      const baseMetadata = user.user_metadata || {}
      const updates: { user_metadata?: any } = {}

      // Handle avatar removal or upload
      // Priority: New file upload takes precedence over removal
      if (avatarFile) {
        // Upload new avatar if file selected (this overrides any removal flag)
        try {
          const uploadedUrl = await uploadAvatar(avatarFile, user.id)
          if (uploadedUrl) {
            updates.user_metadata = {
              ...baseMetadata,
              avatar_url: uploadedUrl,
              picture: uploadedUrl
            }
            // Clear removal flag since we're uploading a new avatar
            setShouldRemoveAvatar(false)
          } else {
            throw new Error('Failed to upload avatar. Please try again or use a smaller image.')
          }
        } catch (avatarError: any) {
          setAccountError(avatarError.message || 'Failed to upload avatar')
          setAccountLoading(false)
          return
        }
      } else if (shouldRemoveAvatar) {
        // Remove avatar from user metadata (only if no new file is being uploaded)
        // Only update if avatar actually exists (don't send unnecessary nulls)
        const hasExistingAvatar = baseMetadata.avatar_url || baseMetadata.picture
        if (hasExistingAvatar) {
          updates.user_metadata = {
            ...baseMetadata,
            avatar_url: null,
            picture: null
          }
        }
      }

      // Update username if changed
      const currentUsername = baseMetadata.full_name || baseMetadata.name || user.email?.split('@')[0] || ''
      if (editingUsername && editingUsername.trim() !== currentUsername) {
        // Merge with existing updates if any, otherwise use base metadata
        updates.user_metadata = {
          ...(updates.user_metadata || baseMetadata),
          full_name: editingUsername.trim(),
          name: editingUsername.trim()
        }
      }

      // Apply updates - check if we have actual metadata changes
      const hasMetadataChanges = updates.user_metadata && Object.keys(updates.user_metadata).length > 0
      
      if (hasMetadataChanges) {
        console.log('Updating profile with:', updates.user_metadata)
        
        try {
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: updates.user_metadata
          })

          if (updateError) {
            console.error('Supabase updateUser error:', updateError)
            // Handle specific error types
            if (updateError.message?.includes('fetch') || updateError.message?.includes('network')) {
              throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.')
            }
            throw new Error(updateError.message || 'Failed to update profile')
          }

          if (!updateData?.user) {
            throw new Error('No user data returned from update')
          }

          // Step 2: Also update public.users table to keep it in sync
          const usersTableUpdates: { full_name?: string | null; avatar_url?: string | null } = {}
          
          // Sync full_name if it was updated
          if (updates.user_metadata.hasOwnProperty('full_name')) {
            usersTableUpdates.full_name = updates.user_metadata.full_name || null
          }
          
          // Sync avatar_url if it was updated
          if (updates.user_metadata.hasOwnProperty('avatar_url')) {
            usersTableUpdates.avatar_url = updates.user_metadata.avatar_url || null
          }

          // Update public.users table if we have changes
          if (Object.keys(usersTableUpdates).length > 0) {
            const { error: dbUpdateError } = await (supabase as any)
              .from('users')
              .update(usersTableUpdates)
              .eq('id', user.id)

            if (dbUpdateError) {
              console.error('Error updating users table:', dbUpdateError)
              // Don't throw here - auth update succeeded, just log the DB sync error
              // The user will see success, but the DB might be slightly out of sync
              // This is better than failing the entire operation
            }
          }

        } catch (fetchError: any) {
          // Catch network/fetch errors specifically
          console.error('Fetch error during update:', fetchError)
          if (fetchError.name === 'TypeError' && fetchError.message?.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.')
          }
          throw fetchError
        }

        setAccountSuccess('Profile updated successfully!')
        
        // Reset avatar removal flag
        setShouldRemoveAvatar(false)
        
        // Refresh user data
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Error getting session after update:', sessionError)
        }
        if (session?.user) {
          setUser(session.user)
          await syncSessionToExtension(session, session.user.id)
        }
        
        // Close editing mode after delay
        setTimeout(() => {
          cancelEditing()
        }, 1500)
      } else {
        setAccountSuccess('No changes to save')
        setTimeout(() => {
          cancelEditing()
        }, 1000)
      }
    } catch (err: any) {
      console.error('Error updating profile:', err)
      const errorMessage = err?.message || 'Failed to update profile. Please check your connection and try again.'
      setAccountError(errorMessage)
    } finally {
      setAccountLoading(false)
    }
  }

  // If we've already loaded the user, don't show loading screen even if loading is true
  // This prevents React Strict Mode from resetting the UI
  if (loading && !hasLoadedRef.current) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              animation: 'spin 1s linear infinite',
              width: '48px',
              height: '48px',
              border: '2px solid #9333ea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: '#a1a1aa' }}>Loading dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Fallback if user is not set but loading is false
  // BUT: Always check localStorage first before showing fallback (OAuth might still be processing)
  const [showFallback, setShowFallback] = useState(false)
  const oauthCheckRef = useRef(false)
  
  useEffect(() => {
    // Always check localStorage when we don't have a user, regardless of loading state
    // This handles the case where OAuthCallback redirected before localStorage was written
    if (!user && !oauthCheckRef.current) {
      oauthCheckRef.current = true
      
      // Wait a bit to see if session appears in localStorage (OAuth callback might still be processing)
      const checkForSession = (attempt = 0) => {
        // Check if user was set (might have been set by another effect)
        if (user) {
          return
        }
        
        const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'))
        if (supabaseKeys.length > 0) {
          try {
            const sessionStr = localStorage.getItem(supabaseKeys[0])
            if (sessionStr) {
              const storedSession = JSON.parse(sessionStr)
              const sessionUser = storedSession?.currentSession?.user || storedSession?.user
              if (sessionUser) {
                setUser(sessionUser)
                const checks = getRemainingUserChecks(sessionUser.id)
                setRemainingChecks(checks)
                
                // Fetch permanent stats asynchronously
                import('@/utils/scanHistory').then(({ getUserPermanentStats }) => {
                  getUserPermanentStats(sessionUser.id).then(userStats => {
                    setStats(userStats)
                  }).catch(err => {
                    console.error('Error fetching permanent stats:', err)
                  })
                })
                
                setLoading(false)
                hasLoadedRef.current = true
                return
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Retry up to 20 times (4 seconds total) - increased for OAuth processing time
        if (attempt < 20) {
          setTimeout(() => checkForSession(attempt + 1), 200)
        } else {
          // Only show fallback if loading is also false
          if (!loading) {
            setShowFallback(true)
          }
        }
      }
      
      // Start checking immediately
      checkForSession()
    } else if (!loading && !user && oauthCheckRef.current) {
      // We've already checked, and still no user - show fallback
      setShowFallback(true)
    }
  }, [loading, user]) // Removed getRemainingUserChecks from dependencies - it's a stable function
  
  if (!loading && !user && showFallback) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Unable to load dashboard</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }
  
  // If we're waiting for OAuth session, show loading
  if (!loading && !user && !showFallback) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              animation: 'spin 1s linear infinite',
              width: '48px',
              height: '48px',
              border: '2px solid #9333ea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: '#a1a1aa' }}>Loading dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }
  

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Header 
        alerts={alerts} 
        onDismissAlert={(alertId) => {
          // Don't allow dismissing risk alerts
          const alert = alerts.find(a => a.id === alertId)
          if (alert?.isRiskAlert) return
          
          // Use context dismiss if available, otherwise handle locally
          if (alertsContext?.dismissAlert) {
            alertsContext.dismissAlert(alertId)
          } else {
            // Local dismissal logic (for backward compatibility)
            if (user?.id && alertId) {
              dismissAlert(user.id, alertId)
            }
            setLocalAlerts(prev => prev.filter(a => a.id !== alertId))
          }
        }}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 text-foreground">
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}! 👋
              </h1>
              <p className="text-muted-foreground">
                Manage your scam detection activity and track your protection stats
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2 border-border hover:bg-muted/50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          {/* Time Filter Buttons */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            <div className="flex gap-2 p-1 bg-card/50 rounded-lg border border-border">
              <button
                onClick={() => {
                  console.log('🔄 Setting filter to: today')
                  setStatsTimeFilter('today')
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  statsTimeFilter === 'today'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Setting filter to: thisWeek')
                  setStatsTimeFilter('thisWeek')
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  statsTimeFilter === 'thisWeek'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Setting filter to: thisMonth')
                  setStatsTimeFilter('thisMonth')
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  statsTimeFilter === 'thisMonth'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                This Month
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards - Beautiful gradient-accented cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {/* Remaining Checks Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-500/20 p-5 group hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/10">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Remaining Checks</span>
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{remainingChecks}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {remainingChecks > 0 ? 'Ready to scan' : 'Upgrade for more'}
              </p>
              <a
                href="/pricing"
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-medium transition-all hover:scale-105 shadow-md"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Get more
              </a>
            </div>
          </div>

          {/* Scans This Month Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-card to-card border border-blue-500/20 p-5 group hover:border-blue-500/40 transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                {statsTimeFilter === 'today' ? 'Scans Today' : 
                 statsTimeFilter === 'thisWeek' ? 'Scans This Week' : 
                 'Scans This Month'}
              </span>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{filteredStats.totalScans}</div>
            <p className="text-xs text-muted-foreground">
              {statsTimeFilter === 'today' ? 'Today' : 
               statsTimeFilter === 'thisWeek' ? 'This week' : 
               'This month'}
            </p>
          </div>

          {/* Scams Detected Card */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 via-card to-card border border-red-500/20 p-5 cursor-pointer group hover:border-red-500/40 transition-all hover:shadow-lg hover:shadow-red-500/10"
                  onClick={() => {
                    setScanHistoryFilter('scam')
                    setShowHistory(true)
                    setTimeout(() => {
                      document.getElementById('scan-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Scams Detected</span>
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{filteredStats.scamsDetected}</div>
                  <p className="text-xs text-muted-foreground">
                    Threats identified
                  </p>
                </div>
              </TooltipTrigger>
              {Object.keys(filteredScamTypeBreakdown).length > 0 && (
                <TooltipContent side="top" className="max-w-xs bg-popover border border-border">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm mb-2">Scam Types Detected:</p>
                    {Object.entries(filteredScamTypeBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([scamType, count]) => (
                        <div key={scamType} className="flex justify-between items-center text-xs">
                          <span className="capitalize">{scamType.replace(/_/g, ' ')}</span>
                          <span className="font-semibold ml-4">{count}</span>
                        </div>
                      ))}
                    {Object.keys(filteredScamTypeBreakdown).length > 5 && (
                      <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                        +{Object.keys(filteredScamTypeBreakdown).length - 5} more type{Object.keys(filteredScamTypeBreakdown).length - 5 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Suspicious Results Card */}
          <div 
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 via-card to-card border border-yellow-500/20 p-5 cursor-pointer group hover:border-yellow-500/40 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
            onClick={() => {
              setScanHistoryFilter('suspicious')
              setShowHistory(true)
              setTimeout(() => {
                document.getElementById('scan-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Suspicious Results</span>
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{filteredStats.suspiciousResults}</div>
            <p className="text-xs text-muted-foreground">
              Potentially risky content
            </p>
          </div>

          {/* Safe Results Card */}
          <div 
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 via-card to-card border border-green-500/20 p-5 cursor-pointer group hover:border-green-500/40 transition-all hover:shadow-lg hover:shadow-green-500/10"
            onClick={() => {
              setScanHistoryFilter('safe')
              setShowHistory(true)
              setTimeout(() => {
                document.getElementById('scan-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Safe Results</span>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{filteredStats.safeResults}</div>
            <p className="text-xs text-muted-foreground">
              Verified safe content
            </p>
          </div>
        </div>

        {/* Quick Actions & Account Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Start scanning or manage your activity</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk Pattern Level Metric */}
              {currentRiskLevel && (
                <div className={`relative overflow-hidden rounded-lg border p-4 ${
                  currentRiskLevel === 'high' 
                    ? 'bg-gradient-to-br from-red-500/15 via-red-500/10 to-red-500/5 border-red-500/30 shadow-lg shadow-red-500/10' 
                    : currentRiskLevel === 'medium'
                    ? 'bg-gradient-to-br from-yellow-500/15 via-yellow-500/10 to-yellow-500/5 border-yellow-500/30 shadow-lg shadow-yellow-500/10'
                    : 'bg-gradient-to-br from-green-500/15 via-green-500/10 to-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10'
                }`}>
                  {/* Decorative background pattern */}
                  <div className={`absolute inset-0 opacity-5 ${
                    currentRiskLevel === 'high' 
                      ? 'bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-red-400 to-transparent' 
                      : currentRiskLevel === 'medium'
                      ? 'bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-yellow-400 to-transparent'
                      : 'bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-green-400 to-transparent'
                  }`}></div>
                  
                  <div className="relative space-y-3">
                    {/* Risk Level Header - Clickable to toggle tip */}
                    <button
                      onClick={() => setIsTipExpanded(!isTipExpanded)}
                      className="flex items-center justify-between w-full gap-2.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className={`p-1.5 rounded-lg ${
                          currentRiskLevel === 'high' 
                            ? 'bg-red-500/20' 
                            : currentRiskLevel === 'medium'
                            ? 'bg-yellow-500/20'
                            : 'bg-green-500/20'
                        }`}>
                          {currentRiskLevel === 'high' ? (
                            <AlertTriangle className={`w-4 h-4 ${
                              currentRiskLevel === 'high' ? 'text-red-400' : ''
                            }`} />
                          ) : currentRiskLevel === 'medium' ? (
                            <AlertCircle className={`w-4 h-4 ${
                              currentRiskLevel === 'medium' ? 'text-yellow-400' : ''
                            }`} />
                          ) : (
                            <Shield className={`w-4 h-4 ${
                              currentRiskLevel === 'low' ? 'text-green-400' : ''
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className={`text-sm font-semibold capitalize ${
                            currentRiskLevel === 'high' 
                              ? 'text-red-400' 
                              : currentRiskLevel === 'medium'
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}>
                            {currentRiskLevel === 'high' ? 'High' : currentRiskLevel === 'medium' ? 'Medium' : 'Low'} Risk Pattern Detected
                          </h4>
                        </div>
                      </div>
                      {isTipExpanded ? (
                        <ChevronUp className={`w-4 h-4 ${
                          currentRiskLevel === 'high' 
                            ? 'text-red-400' 
                            : currentRiskLevel === 'medium'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 ${
                          currentRiskLevel === 'high' 
                            ? 'text-red-400' 
                            : currentRiskLevel === 'medium'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`} />
                      )}
                    </button>
                    
                    {/* Risk Level Tip - Collapsible */}
                    {isTipExpanded && (
                      <div className={`flex items-start gap-2.5 pt-2 border-t animate-in slide-in-from-top-2 duration-200 ${
                        currentRiskLevel === 'high' 
                          ? 'border-red-500/20' 
                          : currentRiskLevel === 'medium'
                          ? 'border-yellow-500/20'
                          : 'border-green-500/20'
                      }`}>
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          currentRiskLevel === 'high' 
                            ? 'bg-red-500/20 text-red-300' 
                            : currentRiskLevel === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          💡
                        </div>
                        <p className={`text-xs leading-relaxed ${
                          currentRiskLevel === 'high' 
                            ? 'text-red-300/90' 
                            : currentRiskLevel === 'medium'
                            ? 'text-yellow-300/90'
                            : 'text-green-300/90'
                        }`}>
                          {currentRiskLevel === 'high' 
                            ? 'You\'re encountering many scams. Be extra cautious with links, emails, and requests for personal information. Verify sources before clicking or sharing data.'
                            : currentRiskLevel === 'medium'
                            ? 'You\'ve detected some suspicious content. Stay vigilant and always verify the source before taking action. When in doubt, don\'t click or share information.'
                            : 'Great job staying safe! Continue scanning content before clicking links or sharing information to maintain your protection.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                onClick={() => {
                  // Navigate to home page with hash, then scroll smoothly
                  if (window.location.pathname === '/') {
                    // Already on home page, just scroll
                    const detectorSection = document.getElementById('detector')
                    if (detectorSection) {
                      detectorSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  } else {
                    // Navigate to home page with hash
                    window.location.href = '/#detector'
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-base h-14 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] border-0"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Start New Scan
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                size="lg"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'Hide' : 'View'} Scan History
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Manage your account settings and subscription</CardDescription>
                </div>
                {editingSection === 'none' && (
                  <button
                    type="button"
                    onClick={startEditingProfile}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Edit Account"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Profile Section */}
              <div className={`flex items-start gap-4 ${editingSection === 'none' ? 'pb-6 border-b border-border' : 'pb-4'}`}>
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="relative">
                    {editingSection === 'profile' && avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20"
                      />
                    ) : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && editingSection === 'profile' && !shouldRemoveAvatar ? (
                      <img
                        src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && editingSection !== 'profile' ? (
                      <img
                        src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* Avatar fallback - shown when no avatar image */}
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-purple-500/20 ${((user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && editingSection !== 'profile' && !shouldRemoveAvatar) || (editingSection === 'profile' && avatarPreview) ? 'hidden' : ''}`}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                    {/* X button - shown only when editing and avatar exists */}
                    {editingSection === 'profile' && ((avatarPreview) || ((user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && !shouldRemoveAvatar)) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer"
                        title="Remove avatar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {editingSection === 'profile' && (
                    <div className="mt-1 w-full">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full text-[10px] h-6 px-2"
                      >
                        <Upload className="w-2.5 h-2.5 mr-0.5" />
                        {avatarPreview ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {editingSection === 'profile' ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="username" className="text-xs mb-1.5 block">Username</Label>
                        <div className="relative max-w-[280px]">
                          <Input
                            id="username"
                            type="text"
                            value={editingUsername}
                            onChange={(e) => setEditingUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="h-8 pr-9 text-sm px-3 py-1.5 w-full"
                            style={{
                              backgroundColor: 'hsl(var(--input))',
                              color: 'hsl(var(--foreground))',
                              borderColor: 'hsl(var(--input))'
                            }}
                          />
                          {editingUsername && (
                            <button
                              type="button"
                              onClick={() => setEditingUsername('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              title="Clear"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Member since {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Recently'}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-lg mb-1">
                        {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Member since {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Recently'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>


              {/* Error/Success Messages */}
              {(accountError || accountSuccess) && (
                <div className={`p-3 rounded-md border text-sm ${
                  accountError 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  {accountError || accountSuccess}
                </div>
              )}

              {/* Save/Cancel Buttons when editing profile */}
              {editingSection === 'profile' && (
                <div className="flex gap-2 pt-3">
                  <Button
                    type="button"
                    onClick={saveProfileChanges}
                    disabled={accountLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {accountLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {!accountLoading && <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={accountLoading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}


              {/* Subscription Plan Section - Hidden when editing */}
              {editingSection === 'none' && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      Subscription Plan
                    </h4>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-md border ${
                          userPlan.toUpperCase() === 'PRO' 
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
                            : userPlan.toUpperCase() === 'PREMIUM'
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40'
                            : userPlan.toUpperCase() === 'ENTERPRISE'
                            ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/40'
                            : 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 border-purple-500/30'
                        }`}>
                          <span className={`text-sm font-bold ${
                            userPlan.toUpperCase() === 'PRO'
                              ? 'text-yellow-200'
                              : userPlan.toUpperCase() === 'PREMIUM'
                              ? 'text-purple-300'
                              : userPlan.toUpperCase() === 'ENTERPRISE'
                              ? 'text-blue-300'
                              : 'text-purple-300'
                          }`}>
                            {userPlan.toUpperCase()} PLAN
                          </span>
                        </div>
                        {userPlan.toUpperCase() === 'FREE' && (
                          <span className="text-xs text-muted-foreground">Free tier with limited features</span>
                        )}
                      </div>
                      <a
                        href="/pricing"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold transition-all hover:scale-105 shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {userPlan.toUpperCase() === 'FREE' ? 'Upgrade' : 'Change Plan'}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scan History Section */}
        <Card id="scan-history-section" className={`mb-10 border-border bg-card/50 backdrop-blur-sm ${!showHistory ? 'hidden' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>View your scan history (last 30 days)</CardDescription>
              </div>
              {/* Refresh button - only show when viewing list, not single result */}
              {!selectedScan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative z-10"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (user?.id) {
                      try {
                        const { getScanHistory } = await import('@/utils/scanHistory')
                        const history = await getScanHistory(user.id)
                        setScanHistory(history)
                        await refreshStats()
                      } catch (error) {
                        console.error('Error refreshing scan history:', error)
                      }
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedScan ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedScan(null)}
                  className="mb-4"
                >
                  ← Back to History
                </Button>
                <ResultCard
                  result={selectedScan.analysis_result}
                  onNewAnalysis={() => setSelectedScan(null)}
                  onReportScam={() => {}}
                />
              </div>
            ) : (
              <ScanHistory
                userId={user?.id}
                onScanClick={(scan) => setSelectedScan(scan)}
                onRefresh={refreshStats}
                initialFilter={scanHistoryFilter}
                onFilterChange={setScanHistoryFilter}
                scans={scanHistory}
              />
            )}
          </CardContent>
        </Card>

        {/* Browser Extension Section */}
        <Card className="mb-10 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Browser Extension</CardTitle>
            <CardDescription>Download our extension to browse securely and scan content on the go</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download our extension to browse securely and scan content on the go
            </p>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-4 w-full px-6 py-4 rounded-xl bg-gradient-to-r from-card to-muted/30 border border-border hover:border-primary/50 shadow-lg hover:shadow-primary/20 transition-all duration-300 group hover:scale-[1.02]"
            >
              <span className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                Download our extension and browse securely
              </span>
              
              {/* Browser Logos */}
              <div className="flex items-center gap-2">
                <img src={chromeLogo} alt="Chrome" className="w-7 h-7 opacity-80 group-hover:opacity-100 transition-opacity" />
                <img src={edgeLogo} alt="Edge" className="w-7 h-7 opacity-80 group-hover:opacity-100 transition-opacity" />
                <img src={braveLogo} alt="Brave" className="w-7 h-7 opacity-80 group-hover:opacity-100 transition-opacity" />
                <img src={operaLogo} alt="Opera" className="w-7 h-7 opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Features Section */}
        <Card className="mb-10 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Dashboard Features</CardTitle>
            <CardDescription>What you can do with your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 hover:border-green-500/30 transition-all group">
                <div className="p-2.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-foreground">Unlimited Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Get 5 free checks on signup, then upgrade for unlimited scans
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10 hover:border-purple-500/30 transition-all group">
                <div className="p-2.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-foreground">Full Detailed Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    Access comprehensive analysis reports for every scan
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10 hover:border-blue-500/30 transition-all group">
                <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-foreground">Priority Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Faster analysis times for logged-in users
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/10 hover:border-orange-500/30 transition-all group">
                <div className="p-2.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-foreground">Analysis History</h4>
                  <p className="text-sm text-muted-foreground">
                    Track all your scans and results
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default Dashboard
