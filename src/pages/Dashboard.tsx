import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle, Clock, TrendingUp, LogOut, User, AlertCircle, History, X, Mail, Calendar, CreditCard, Settings, Download, Puzzle, RefreshCw, Upload, Lock, Edit2, Save, XCircle, Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
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
import { normalizeScamType } from '@/utils/insightsCalculator'
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
  const [userPlan, setUserPlan] = useState<string | null>(null) // Start with null to prevent flash
  const [planLoaded, setPlanLoaded] = useState(false) // Track if plan has been loaded
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
  const [scanHistoryDateRange, setScanHistoryDateRange] = useState<string | null>(null) // Date range to apply when navigating from stat cards
  const [scamTypeBreakdown, setScamTypeBreakdown] = useState<Record<string, number>>({})
  const [scanHistory, setScanHistory] = useState<any[]>([])
  // Initialize filter to 'thisMonth' to prevent flash (will be adjusted by useEffect if needed)
  const [statsTimeFilter, setStatsTimeFilter] = useState<'today' | 'thisWeek' | 'thisMonth'>(() => {
    // Try to get from localStorage first
    try {
      const saved = localStorage.getItem('scam_checker_stats_time_filter')
      if (saved && (saved === 'today' || saved === 'thisWeek' || saved === 'thisMonth')) {
        return saved as 'today' | 'thisWeek' | 'thisMonth'
      }
    } catch {
      // Ignore localStorage errors
    }
    // Default to 'thisMonth' since that's usually what gets selected
    return 'thisMonth'
  })
  const hasSetInitialFilter = useRef(false) // Track if we've set the initial filter based on scan counts
  const [isScanHistoryLoaded, setIsScanHistoryLoaded] = useState(false) // Track if scan history has been loaded
  const hasSetInitialScanHistoryDateRange = useRef(false) // Track if we've set the initial scan history date range
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false)
  const [scanHistoryKey, setScanHistoryKey] = useState(0) // Key to force re-render
  
  // Cache for stats to reduce Supabase requests
  const statsCache = useRef<{ data: any; timestamp: number } | null>(null)
  const STATS_CACHE_DURATION = 30000 // 30 seconds cache
  const scanHistoryCache = useRef<{ data: any[]; timestamp: number } | null>(null)
  const SCAN_HISTORY_CACHE_DURATION = 30000 // 30 seconds cache
  const scanHistoryScrollPosition = useRef<number>(0) // Store scroll position of scan history container when viewing a scan
  const pageScrollPosition = useRef<number>(0) // Store page scroll position when viewing a scan
  const isRestoringScroll = useRef<boolean>(false) // Flag to prevent multiple restorations
  
  // Prevent browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])
  
  // Restore page scroll position when returning to scan history (keep page position unchanged)
  useEffect(() => {
    if (!selectedScan && isRestoringScroll.current && pageScrollPosition.current > 0) {
      // Restore page scroll to where it was when the scan was clicked
      const savedPagePosition = pageScrollPosition.current
      console.log('📍 Restoring page scroll position:', savedPagePosition)
      
      // Restore page scroll immediately and maintain it
      window.scrollTo({
        top: savedPagePosition,
        left: 0,
        behavior: 'auto'
      })
      
      // Try a few more times to ensure it sticks
      setTimeout(() => {
        window.scrollTo(0, savedPagePosition)
      }, 50)
      setTimeout(() => {
        window.scrollTo(0, savedPagePosition)
        isRestoringScroll.current = false
      }, 150)
    }
  }, [selectedScan])
  
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
  // Load risk pattern tip expanded state from localStorage (default: true)
  // Risk patterns tip: Always expanded on first visit, then respects user preference
  const [isTipExpanded, setIsTipExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('scam_checker_risk_pattern_tip_expanded')
      // If no saved preference exists, default to expanded (true)
      // Only use saved value if user has explicitly interacted with it
      if (saved === null) {
        return true // First time - always expanded
      }
      return JSON.parse(saved)
    } catch {
      return true // On error, default to expanded
    }
  })
  // First scan tip: Always expanded on first visit, then respects user preference
  const [isFirstScanTipExpanded, setIsFirstScanTipExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('scam_checker_first_scan_tip_expanded')
      // If no saved preference exists, default to expanded (true)
      // Only use saved value if user has explicitly interacted with it
      if (saved === null) {
        return true // First time - always expanded
      }
      return JSON.parse(saved)
    } catch {
      return true // On error, default to expanded
    }
  })

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
  const [avatarImageError, setAvatarImageError] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get avatar URL (prioritize Gmail picture, then custom avatar, then preview)
  const avatarUrl = useMemo(() => {
    if (editingSection === 'profile' && avatarPreview) {
      return avatarPreview
    }
    if (editingSection === 'profile' && shouldRemoveAvatar) {
      return null
    }
    // Gmail/Google OAuth provides picture, custom uploads use avatar_url
    return user?.user_metadata?.picture || user?.user_metadata?.avatar_url || null
  }, [editingSection, avatarPreview, shouldRemoveAvatar, user?.user_metadata?.picture, user?.user_metadata?.avatar_url])

  // Reset avatar error when URL changes
  useEffect(() => {
    setAvatarImageError(false)
  }, [avatarUrl])

  // Get user's initial for fallback (same logic as Header component)
  const userInitial = useMemo(() => {
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
    return userName.charAt(0).toUpperCase()
  }, [user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email])

  // Auto-sync existing session to extension on Dashboard load and retry failed scans
  useEffect(() => {
    const syncExistingSession = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && session.user && !error) {
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
            }
          } catch (planErr) {
            console.warn('⚠️ Dashboard: Error fetching plan for sync:', planErr);
          }
          
          await syncSessionToExtension(session, session.user.id, null, userPlan);
          
          // Retry any failed scans from localStorage
          try {
            const { retryFailedScans } = await import('@/utils/scanHistory');
            const retriedCount = await retryFailedScans(session.user.id);
            if (retriedCount > 0) {
              console.log(`✅ Successfully retried ${retriedCount} failed scans`);
              // Refresh scan history to show retried scans
              const { getScanHistory } = await import('@/utils/scanHistory');
              const history = await getScanHistory(session.user.id);
              setScanHistory(history);
              setIsScanHistoryLoaded(true);
            }
          } catch (retryError) {
            console.error('Error retrying failed scans:', retryError);
          }
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
      // The useEffect hook will handle auto-expanding when this value changes
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

  // Track previous risk level to detect changes
  const prevRiskLevelRef = useRef<string | null>(null)
  
  // Auto-expand risk pattern section when risk level changes
  useEffect(() => {
    // Only expand if risk level actually changed (not on initial load)
    if (localCurrentRiskLevel !== null && prevRiskLevelRef.current !== null && prevRiskLevelRef.current !== localCurrentRiskLevel) {
      // Risk level changed - auto-expand the section
      setIsTipExpanded(true)
      // Also update localStorage to reflect the auto-expansion
      try {
        localStorage.setItem('scam_checker_risk_pattern_tip_expanded', JSON.stringify(true))
      } catch (error) {
        console.warn('Failed to save risk pattern tip state:', error)
      }
    }
    // Update ref for next comparison
    prevRiskLevelRef.current = localCurrentRiskLevel
  }, [localCurrentRiskLevel]) // Only trigger when risk level actually changes

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
        // Last 7 days (to match scan history "Last 7 days" filter)
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
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

    const filtered = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      
      // Parse the scan date - scan.created_at is in UTC/ISO format
      const scanDate = new Date(scan.created_at)
      
      // Check if date is valid
      if (isNaN(scanDate.getTime())) {
        return false
      }
      
      // Compare using timestamps (most reliable and timezone-agnostic)
      const scanTime = scanDate.getTime()
      const startTime = startDate.getTime()
      const endTime = endDate.getTime()
      
      // For "today" filter, also check if scan is very recent (within last 5 minutes)
      // This ensures newly added scans are always included even if there's a small timezone mismatch
      if (statsTimeFilter === 'today') {
        const now = Date.now()
        const fiveMinutesAgo = now - (5 * 60 * 1000)
        // Include if: (1) within time range OR (2) very recent (within last 5 minutes)
        return (scanTime >= startTime && scanTime <= endTime) || (scanTime >= fiveMinutesAgo && scanTime <= now)
      }
      
      // For week/month filters, use timestamp comparison
      return scanTime >= startTime && scanTime <= endTime
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
        // Last 7 days (to match filteredStats and scan history "Last 7 days" filter)
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
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
      if (scan.classification === 'scam') {
        // Count all scam scans, even if they don't have a scam_type
        // Normalize scam types to group similar ones together
        const originalScamType = scan.analysis_result?.scam_type || 'Unknown Scam Type'
        const scamType = normalizeScamType(originalScamType)
        breakdown[scamType] = (breakdown[scamType] || 0) + 1
      }
    })

    return breakdown
  }, [scanHistory, statsTimeFilter])

  // Function to refresh stats from database with caching
  // Defined here before useEffects that use it to avoid "before initialization" error
  const refreshStats = useCallback(async (retryCount = 0, forceRefresh = false) => {
    if (!user?.id) return
    
    try {
      const now = Date.now()
      
      // Check cache for stats (unless forced refresh)
      if (!forceRefresh && statsCache.current) {
        const cacheAge = now - statsCache.current.timestamp
        if (cacheAge < STATS_CACHE_DURATION) {
          // Use cached stats
          setStats(statsCache.current.data)
          // Still refresh scan history if cache is stale
          if (!scanHistoryCache.current || (now - scanHistoryCache.current.timestamp) >= SCAN_HISTORY_CACHE_DURATION) {
            // Only refresh scan history, not stats
            const { getScanHistory } = await import('@/utils/scanHistory')
            const history = await getScanHistory(user.id)
            scanHistoryCache.current = { data: history, timestamp: now }
            // Merge with existing state
            setScanHistory(prev => {
              if (!prev || prev.length === 0) return history
              const existingMap = new Map(prev.map(scan => [scan.id, scan]))
              history.forEach(scan => existingMap.set(scan.id, scan))
              return Array.from(existingMap.values()).sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
            })
          }
          return // Use cached data, skip database fetch
        }
      }
      
      // Cache expired or force refresh - fetch from database
      const { getUserPermanentStats, getScanHistory } = await import('@/utils/scanHistory')
      
      // Batch both requests together (they can run in parallel)
      const [userStats, history] = await Promise.all([
        getUserPermanentStats(user.id),
        (async () => {
          // Check cache for scan history first
          if (!forceRefresh && scanHistoryCache.current) {
            const cacheAge = now - scanHistoryCache.current.timestamp
            if (cacheAge < SCAN_HISTORY_CACHE_DURATION) {
              return scanHistoryCache.current.data
            }
          }
          // Add small delay on retry to allow database to commit
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
          }
          return await getScanHistory(user.id)
        })()
      ])
      
      // Update cache and state
      statsCache.current = { data: userStats, timestamp: now }
      setStats(userStats)
      
      if (history) {
        scanHistoryCache.current = { data: history, timestamp: now }
        
        // Mark scan history as loaded
        setIsScanHistoryLoaded(true)
        
        // Merge with existing scanHistory to preserve any scans added optimistically
        // This prevents overwriting scans that were just added but might not be in DB yet
        let mergedHistory: any[] = []
        setScanHistory(prev => {
          if (!prev || prev.length === 0) {
            mergedHistory = history
            setMonthlyScans(history.length)
            return history
          }
          
          // Create a map of existing scans by ID for quick lookup
          const existingMap = new Map(prev.map(scan => [scan.id, scan]))
          
          // Add all scans from database (database is source of truth for existing scans)
          history.forEach(scan => {
            existingMap.set(scan.id, scan)
          })
          
          // Convert back to array and sort by created_at (most recent first)
          mergedHistory = Array.from(existingMap.values()).sort((a, b) => {
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return dateB - dateA
          })
          
          setMonthlyScans(mergedHistory.length)
          return mergedHistory
        })
        
        // Calculate scam type breakdown using merged history (includes optimistic updates)
        if (userStats.scamsDetected > 0) {
          const breakdown: Record<string, number> = {}
          
          // Use mergedHistory if available, otherwise use fetched history
          const scansToProcess = mergedHistory.length > 0 ? mergedHistory : history
          
          scansToProcess.forEach(scan => {
            if (scan.classification === 'scam') {
              // Count all scams, even if they don't have a scam_type
              // Normalize scam types to group similar ones together
              const originalScamType = scan.analysis_result?.scam_type || 'Unknown Scam Type'
              const scamType = normalizeScamType(originalScamType)
              breakdown[scamType] = (breakdown[scamType] || 0) + 1
            }
          })
          
          setScamTypeBreakdown(breakdown)
        } else {
          setScamTypeBreakdown({})
        }

        // Alerts will be generated automatically via useEffect when scanHistory changes
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
              const planUpper = (data.plan || '').toString().toUpperCase().trim()
              setUserPlan(planUpper)
              setPlanLoaded(true)
              // Sync plan to extension
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await syncSessionToExtension(session, user.id, null, planUpper)
              }
              return // Success
            }
            setUserPlan('FREE')
            setPlanLoaded(true)
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
      // Don't clear state on error, keep existing data
    }
  }, [user?.id])

  // Real-time subscriptions to scan_history and user_stats tables for automatic updates
  // This reduces the need for polling - only fetches when data actually changes
  useEffect(() => {
    if (!user?.id) return
    
    // Subscribe to changes in scan_history table
    const scanHistoryChannel = supabase
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
          // Real-time change detected - invalidate cache and refresh
          statsCache.current = null
          scanHistoryCache.current = null
          
          // Refresh stats (will fetch from database since cache is cleared)
          try {
            await refreshStats(0, true) // forceRefresh = true
          } catch (error) {
            console.error('❌ Dashboard: Error refreshing after real-time change:', error)
          }
        }
      )
      .subscribe()

    // Subscribe to changes in user_stats table
    const userStatsChannel = supabase
      .channel(`user_stats_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only listen to updates (stats are updated, not inserted/deleted)
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Stats updated - invalidate cache and refresh
          statsCache.current = null
          
          // Refresh stats (will fetch from database since cache is cleared)
          try {
            await refreshStats(0, true) // forceRefresh = true
          } catch (error) {
            console.error('❌ Dashboard: Error refreshing after stats update:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(scanHistoryChannel)
      supabase.removeChannel(userStatsChannel)
    }
  }, [user?.id, refreshStats]) // refreshStats is stable (useCallback), safe to include

  // Auto-refresh stats when scanHistory changes (fallback if real-time doesn't trigger)
  // filteredStats useMemo will automatically recalculate when scanHistory changes

  // Set default filter based on scan counts: default to "today", only use "this month" if it has more scans
  // Only runs if user has NO saved preference (first time or cleared localStorage)
  useEffect(() => {
    if (scanHistory.length === 0 || !user?.id || hasSetInitialFilter.current) {
      return // Don't set filter if no scans, no user, or already set
    }
    
    // Check if user has a saved preference - if yes, don't override with calculated default
    const savedFilter = localStorage.getItem('scam_checker_stats_time_filter')
    if (savedFilter && (savedFilter === 'today' || savedFilter === 'thisWeek' || savedFilter === 'thisMonth')) {
      // User has a saved preference - respect it and don't calculate default
      hasSetInitialFilter.current = true
      return
    }
    
    // No saved preference - calculate default based on scan counts

    const now = new Date()
    
    // Helper to get start/end of day
    const getStartOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const getEndOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(23, 59, 59, 999)
      return d
    }

    // Calculate "today" count
    const todayStart = getStartOfDay(now)
    const todayEnd = getEndOfDay(now)
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    const todayCount = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      const scanLocalDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`
      return scanLocalDateStr === todayDateStr
    }).length

    // Calculate "this month" count
    const monthStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    const monthEnd = getEndOfDay(now)
    const monthStartTime = monthStart.getTime()
    const monthEndTime = monthEnd.getTime()
    
    const monthCount = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      const scanTime = scanDate.getTime()
      return scanTime >= monthStartTime && scanTime <= monthEndTime
    }).length

    // Set filter: use "this month" only if it has more scans than "today"
    const newFilter = monthCount > todayCount ? 'thisMonth' : 'today'
    setStatsTimeFilter(newFilter)
    
    // Save calculated default to localStorage (only if no user preference exists)
    // This ensures the calculated default persists, but user clicks will override it
    try {
      localStorage.setItem('scam_checker_stats_time_filter', newFilter)
    } catch (error) {
      // Ignore localStorage errors
    }
    
    hasSetInitialFilter.current = true
  }, [scanHistory, user?.id])

  // Set default scan history date range based on scan counts: default to "today", only use "last 30 days" if it has more scans
  useEffect(() => {
    if (scanHistory.length === 0 || !user?.id || hasSetInitialScanHistoryDateRange.current) {
      return // Don't set date range if no scans, no user, or already set
    }

    // Don't override if scanHistoryDateRange was explicitly set (e.g., from stat card navigation)
    // Check this before calculating to avoid unnecessary work
    if (scanHistoryDateRange !== null) {
      hasSetInitialScanHistoryDateRange.current = true
      return
    }

    const now = new Date()
    
    // Helper to get start/end of day
    const getStartOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const getEndOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(23, 59, 59, 999)
      return d
    }

    // Calculate "today" count (dateRange '0')
    const todayStart = getStartOfDay(now)
    const todayEnd = getEndOfDay(now)
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    const todayCount = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      const scanLocalDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`
      return scanLocalDateStr === todayDateStr
    }).length

    // Calculate "last 30 days" count (dateRange '30')
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStart = getStartOfDay(thirtyDaysAgo)
    const todayEndTime = getEndOfDay(now).getTime()
    const thirtyDaysAgoStartTime = thirtyDaysAgoStart.getTime()
    
    const last30DaysCount = scanHistory.filter(scan => {
      if (!scan.created_at) return false
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      const scanTime = scanDate.getTime()
      return scanTime >= thirtyDaysAgoStartTime && scanTime <= todayEndTime
    }).length

    // Set date range: use "last 30 days" only if it has more scans than "today"
    if (last30DaysCount > todayCount) {
      setScanHistoryDateRange('30')
    } else {
      // Default to "today"
      setScanHistoryDateRange('0')
    }
    
    hasSetInitialScanHistoryDateRange.current = true
  }, [scanHistory, user?.id, scanHistoryDateRange]) // Include scanHistoryDateRange to read current value, but ref prevents re-running logic

  // Polling fallback: Refresh stats every 30 seconds in case real-time subscription doesn't work
  // Increased from 10s to 30s to reduce Supabase requests (~67% reduction)
  useEffect(() => {
    if (!user?.id) return

    const pollInterval = setInterval(async () => {
      try {
        // Use cached data if available (won't fetch if cache is valid)
        await refreshStats(0, false) // Don't force refresh, use cache
      } catch (error) {
        console.error('❌ Dashboard: Error in polling refresh:', error)
      }
    }, 30000) // 30 seconds (optimized for cost - reduced from 10s)

    return () => {
      clearInterval(pollInterval)
    }
  }, [user?.id, refreshStats])

  // Listen for scan saved events to refresh stats immediately
  useEffect(() => {
    const handleScanSaved = async (event: Event) => {
      const customEvent = event as CustomEvent
      const savedScan = customEvent.detail
      
      // Immediately add the new scan to scanHistory state if we have it
      if (savedScan && savedScan.id) {
        // Invalidate cache since we have new data
        statsCache.current = null
        scanHistoryCache.current = null
        
        // Ensure the scan has a proper created_at timestamp (use current time if missing)
        const scanWithTimestamp = {
          ...savedScan,
          created_at: savedScan.created_at || new Date().toISOString()
        }
        
        setScanHistory(prev => {
          // Check if scan already exists (avoid duplicates)
          const exists = prev.some(s => s.id === scanWithTimestamp.id)
          if (exists) return prev
          // Add new scan at the beginning (most recent first)
          const updated = [scanWithTimestamp, ...prev]
          // Also update monthly scans count
          setMonthlyScans(updated.length)
          return updated
        })
        
        // Force immediate UI update by triggering a re-render
        setScanHistoryKey(prev => prev + 1)
      }
      
      // Also check sessionStorage for any missed scans
      if (typeof window !== 'undefined') {
        try {
          const lastSavedScan = sessionStorage.getItem('lastSavedScan')
          if (lastSavedScan) {
            const scan = JSON.parse(lastSavedScan)
            if (scan && scan.id) {
              setScanHistory(prev => {
                const exists = prev.some(s => s.id === scan.id)
                if (exists) return prev
                const updated = [scan, ...prev]
                setMonthlyScans(updated.length)
                return updated
              })
              sessionStorage.removeItem('lastSavedScan')
            }
          }
        } catch (e) {
          // Ignore sessionStorage errors
        }
      }
      
      try {
        // Force refresh stats from database after a delay to catch database replication
        // Use forceRefresh=true to bypass cache since we just saved a new scan
        setTimeout(async () => {
          await refreshStats(0, true) // forceRefresh = true
        }, 1500)
      } catch (error) {
        console.error('❌ Dashboard: Error refreshing stats after scan save:', error)
      }
    }

    window.addEventListener('scanSaved', handleScanSaved as EventListener)
    
    // Also check for saved scans on mount (in case event was missed)
    if (typeof window !== 'undefined') {
      try {
        const lastSavedScan = sessionStorage.getItem('lastSavedScan')
        if (lastSavedScan) {
          const scan = JSON.parse(lastSavedScan)
          if (scan && scan.id) {
            setScanHistory(prev => {
              const exists = prev.some(s => s.id === scan.id)
              if (exists) return prev
              const updated = [scan, ...prev]
              setMonthlyScans(updated.length)
              return updated
            })
            sessionStorage.removeItem('lastSavedScan')
          }
        }
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }
    
    return () => {
      window.removeEventListener('scanSaved', handleScanSaved as EventListener)
    }
  }, [refreshStats])

  // 🎯 Handle showing latest scan after signup (when user completes signup from blocked result)
  useEffect(() => {
    if (!user?.id || !isScanHistoryLoaded || scanHistory.length === 0) {
      return // Wait for user, scan history to load, and have at least one scan
    }

    // Check for the flag set by OAuthCallback after signup
    const showLatestScanFlag = localStorage.getItem('show_latest_scan_after_signup')
    if (showLatestScanFlag === 'true') {
      console.log('🎯 [Dashboard] Flag detected - showing latest scan after signup')
      
      // Get the most recent scan (first in the array since they're sorted by created_at desc)
      const latestScan = scanHistory[0]
      
      if (latestScan && latestScan.analysis_result) {
        console.log('✅ [Dashboard] Found latest scan, displaying result:', {
          scanId: latestScan.id,
          classification: latestScan.classification,
          scanType: latestScan.scan_type
        })
        
        // Set the selected scan to show the result
        setSelectedScan(latestScan)
        
        // Show the scan history section so the result is visible
        setShowHistory(true)
        
        // Scroll to the scan history section after a short delay to ensure it's rendered
        setTimeout(() => {
          const scanHistorySection = document.getElementById('scan-history-section')
          if (scanHistorySection) {
            scanHistorySection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300)
        
        // Clear the flag so it doesn't trigger again
        localStorage.removeItem('show_latest_scan_after_signup')
        console.log('✅ [Dashboard] Cleared show_latest_scan_after_signup flag')
      } else {
        console.warn('⚠️ [Dashboard] Flag set but no latest scan found or missing analysis_result')
        // Clear the flag anyway to prevent infinite loops
        localStorage.removeItem('show_latest_scan_after_signup')
      }
    }
  }, [user?.id, isScanHistoryLoaded, scanHistory]) // Run when user, scan history loaded, or scan history changes

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
      
      setUser(session.user)
      
      // Get user's remaining checks
      const checks = getRemainingUserChecks(session.user.id)
      setRemainingChecks(checks)
      
      // Get user stats from permanent stats table (cumulative, never decrease)
      try {
        const { getUserPermanentStats, getScanHistory } = await import('@/utils/scanHistory')
        const userStats = await getUserPermanentStats(session.user.id)
        setStats(userStats)
        
        // Calculate scam type breakdown and monthly scans
        try {
          const history = await getScanHistory(session.user.id)
          setScanHistory(history)
          setIsScanHistoryLoaded(true)
          
          // Calculate monthly scans (last 30 days)
          setMonthlyScans(history.length)
          
          // Calculate scam type breakdown if there are scams detected
          if (userStats.scamsDetected > 0) {
            const breakdown: Record<string, number> = {}
            
            history.forEach(scan => {
              if (scan.classification === 'scam' && scan.analysis_result?.scam_type) {
                // Normalize scam types to group similar ones together
                const originalScamType = scan.analysis_result.scam_type
                const scamType = normalizeScamType(originalScamType)
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
          setIsScanHistoryLoaded(true) // Mark as loaded even if empty
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
              const planUpper = (data.plan || '').toString().toUpperCase().trim()
              console.log('📊 Dashboard: User plan', planUpper)
              setUserPlan(planUpper)
              setPlanLoaded(true)
              // Sync plan to extension
              await syncSessionToExtension(session, session.user.id, null, planUpper)
              return // Success
            } else {
              // Default to FREE if no plan found
              setUserPlan('FREE')
              setPlanLoaded(true)
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
              setPlanLoaded(true)
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
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Dashboard: Session error', error)
          return false
        }
        
        if (session?.user) {
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
          
          if (!session) {
            if (_event === 'SIGNED_OUT') {
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
      // Reset initial filter flags so they can be recalculated on next login
      hasSetInitialFilter.current = false
      hasSetInitialScanHistoryDateRange.current = false
      
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
    setAvatarImageError(false)
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
              className="flex items-center gap-2 border-border hover:bg-muted hover:border-primary/50 hover:scale-[1.02] transition-all cursor-pointer"
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
                  setStatsTimeFilter('today')
                  try {
                    localStorage.setItem('scam_checker_stats_time_filter', 'today')
                  } catch (error) {
                    // Ignore localStorage errors
                  }
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
                  setStatsTimeFilter('thisWeek')
                  try {
                    localStorage.setItem('scam_checker_stats_time_filter', 'thisWeek')
                  } catch (error) {
                    // Ignore localStorage errors
                  }
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
                  setStatsTimeFilter('thisMonth')
                  try {
                    localStorage.setItem('scam_checker_stats_time_filter', 'thisMonth')
                  } catch (error) {
                    // Ignore localStorage errors
                  }
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
                    // Map statsTimeFilter to dateRange: 'today' -> '0', 'thisWeek' -> '7', 'thisMonth' -> '30'
                    const dateRangeMap: Record<string, string> = { 'today': '0', 'thisWeek': '7', 'thisMonth': '30' }
                    const mappedDateRange = dateRangeMap[statsTimeFilter] || '30'
                    setScanHistoryDateRange(mappedDateRange)
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
                <TooltipContent side="top" className="max-w-xs bg-black border border-gray-800">
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
              // Map statsTimeFilter to dateRange: 'today' -> '0', 'thisWeek' -> '7', 'thisMonth' -> '30'
              const dateRangeMap: Record<string, string> = { 'today': '0', 'thisWeek': '7', 'thisMonth': '30' }
              const mappedDateRange = dateRangeMap[statsTimeFilter] || '30'
              setScanHistoryDateRange(mappedDateRange)
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
              // Map statsTimeFilter to dateRange: 'today' -> '0', 'thisWeek' -> '7', 'thisMonth' -> '30'
              const dateRangeMap: Record<string, string> = { 'today': '0', 'thisWeek': '7', 'thisMonth': '30' }
              const mappedDateRange = dateRangeMap[statsTimeFilter] || '30'
              setScanHistoryDateRange(mappedDateRange)
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
              {/* First Scan Encouragement Card - Show when user has 0 scans (only after scan history is loaded) */}
              {isScanHistoryLoaded && (!scanHistory || scanHistory.length === 0) && (
                <div className="relative overflow-hidden rounded-lg border p-4 bg-gradient-to-br from-purple-500/10 via-card to-card border-purple-500/20 shadow-lg shadow-purple-500/10">
                  {/* Decorative background pattern */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl"></div>
                  
                  <div className="relative space-y-3">
                    {/* First Scan Header - Clickable to toggle tip */}
                    <button
                      onClick={() => {
                        const newValue = !isFirstScanTipExpanded
                        setIsFirstScanTipExpanded(newValue)
                        // Persist to localStorage
                        try {
                          localStorage.setItem('scam_checker_first_scan_tip_expanded', JSON.stringify(newValue))
                        } catch (error) {
                          console.warn('Failed to save first scan tip state:', error)
                        }
                      }}
                      className="flex items-center justify-between w-full gap-2.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="p-1.5 rounded-lg bg-purple-500/20">
                          <Sparkles className="w-4 h-4 text-purple-300" />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-sm font-semibold text-purple-400">
                            Ready to Get Started?
                          </h4>
                        </div>
                      </div>
                      {isFirstScanTipExpanded ? (
                        <ChevronUp className="w-4 h-4 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                    
                    {/* First Scan Tip - Collapsible */}
                    {isFirstScanTipExpanded && (
                      <div className="flex items-start gap-2.5 pt-2 border-t animate-in slide-in-from-top-2 duration-200 border-purple-500/20">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-purple-500/20 text-purple-300">
                          💡
                        </div>
                        <p className="text-xs leading-relaxed text-purple-300/90">
                          Welcome to ScamGuard! Start protecting yourself by scanning your first link, image, or text. Click "Start New Scan" below to begin your security journey!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
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
                      onClick={() => {
                        const newValue = !isTipExpanded
                        setIsTipExpanded(newValue)
                        // Persist to localStorage
                        try {
                          localStorage.setItem('scam_checker_risk_pattern_tip_expanded', JSON.stringify(newValue))
                        } catch (error) {
                          console.warn('Failed to save risk pattern tip state:', error)
                        }
                      }}
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
                    <Settings className="h-5 w-5 transition-transform hover:rotate-90 hover:scale-110" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Profile Section */}
              <div className={`flex items-start gap-4 ${editingSection === 'none' ? 'pb-6 border-b border-border' : 'pb-4'}`}>
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="relative">
                    {avatarUrl && !avatarImageError ? (
                      /* Avatar image - Gmail picture or custom upload */
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-r from-purple-600 to-pink-600">
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                          onError={() => {
                            setAvatarImageError(true)
                          }}
                        />
                      </div>
                    ) : (
                      /* No avatar or image failed - show initial only */
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-r from-purple-600 to-pink-600">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                          <span>{userInitial}</span>
                        </div>
                      </div>
                    )}
                    {/* X button - shown only when editing and avatar exists */}
                    {editingSection === 'profile' && avatarUrl && (
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
                        {planLoaded && userPlan ? (
                          <>
                            <div className={`px-3 py-1.5 rounded-md border ${
                              userPlan.toUpperCase() === 'FREE'
                                ? 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-500/40'
                                : userPlan.toUpperCase() === 'PRO' 
                                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
                                : userPlan.toUpperCase() === 'PREMIUM'
                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40'
                                : userPlan.toUpperCase() === 'ULTRA'
                                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/40'
                                : 'bg-gradient-to-r from-slate-500/15 to-slate-600/15 border-slate-500/30'
                            }`}>
                              <span className={`text-sm font-bold ${
                                userPlan.toUpperCase() === 'FREE'
                                  ? 'text-slate-300'
                                  : userPlan.toUpperCase() === 'PRO'
                                  ? 'text-yellow-200'
                                  : userPlan.toUpperCase() === 'PREMIUM'
                                  ? 'text-purple-300'
                                  : userPlan.toUpperCase() === 'ULTRA'
                                  ? 'text-blue-300'
                                  : 'text-slate-300'
                              }`}>
                                {userPlan.toUpperCase()} PLAN
                              </span>
                            </div>
                        {planLoaded && userPlan && userPlan.toUpperCase() === 'FREE' && (
                          <span className="text-xs text-muted-foreground">Free tier with limited features</span>
                        )}
                          </>
                        ) : (
                          <div className="px-3 py-1.5 rounded-md border bg-muted/50 animate-pulse">
                            <span className="text-sm font-bold text-muted-foreground">Loading...</span>
                          </div>
                        )}
                      </div>
                      <a
                        href="/pricing"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold transition-all hover:scale-105 shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {planLoaded && userPlan ? (userPlan.toUpperCase() === 'FREE' ? 'Upgrade' : 'Change Plan') : 'Loading...'}
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
                  className="relative z-10 hover:bg-muted hover:border-primary/50 hover:scale-[1.02] transition-all cursor-pointer"
                  disabled={isRefreshingHistory}
                  onClick={async (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (user?.id) {
                      setIsRefreshingHistory(true)
                      try {
                        const { getScanHistory } = await import('@/utils/scanHistory')
                        const history = await getScanHistory(user.id)
                        setScanHistory([...history]) // Force re-render with new array reference
                        setScanHistoryKey(prev => prev + 1) // Force component re-render
                        await refreshStats(0, true) // Force refresh after manual refresh
                      } catch (error) {
                        console.error('❌ Error refreshing scan history:', error)
                      } finally {
                        setIsRefreshingHistory(false)
                      }
                    }
                  }}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingHistory ? 'animate-spin' : ''}`} />
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
                  onClick={() => {
                    isRestoringScroll.current = true
                    setSelectedScan(null)
                  }}
                  className="mb-4"
                >
                  ← Back to History
                </Button>
                <ResultCard
                  result={selectedScan.analysis_result}
                  onNewAnalysis={() => {
                    isRestoringScroll.current = true
                    setSelectedScan(null)
                  }}
                  onReportScam={() => {}}
                />
              </div>
            ) : (
              <ScanHistory
                key={scanHistoryKey}
                userId={user?.id}
                onScanClick={(scan, scrollPosition) => {
                  // Save scroll position of scan history container AND page scroll before showing scan result
                  if (scrollPosition !== undefined) {
                    scanHistoryScrollPosition.current = scrollPosition
                    pageScrollPosition.current = window.scrollY || window.pageYOffset || 0
                    isRestoringScroll.current = true
                    console.log('💾 Saved scan history scroll:', scrollPosition, 'page scroll:', pageScrollPosition.current)
                  }
                  setSelectedScan(scan)
                }}
                onRefresh={() => refreshStats(0, true)} // Force refresh on manual refresh
                initialFilter={scanHistoryFilter}
                onFilterChange={setScanHistoryFilter}
                scans={scanHistory}
                initialDateRange={scanHistoryDateRange || undefined}
                savedScrollPosition={isRestoringScroll.current ? scanHistoryScrollPosition.current : undefined}
                onScrollRestored={() => {
                  isRestoringScroll.current = false
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Browser Extension Section */}
        <Card className="mb-10 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div>
              <CardTitle>Browser Extension</CardTitle>
              <CardDescription>Download our extension to browse securely and scan content on the go</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
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
            <div>
              <CardTitle>Dashboard Features</CardTitle>
              <CardDescription>What you can do with your account</CardDescription>
            </div>
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
