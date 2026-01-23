import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getScanHistory } from '@/utils/scanHistory'

interface Alert {
  id: string
  type: string
  message: string
  severity: 'info' | 'warning' | 'error'
  scamType?: string
  isRiskAlert?: boolean
  actionButton?: {
    label: string
    onClick: () => void
  }
}

interface AlertsContextType {
  alerts: Alert[]
  dismissAlert: (alertId: string) => void
  currentRiskLevel: string | null
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get user session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
        setAlerts([])
        setCurrentRiskLevel(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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

  const saveDismissedAlerts = (userId: string, dismissed: Record<string, boolean>) => {
    try {
      const key = `scam_checker_dismissed_alerts_${userId}`
      localStorage.setItem(key, JSON.stringify(dismissed))
    } catch (error) {
      console.warn('Error saving dismissed alerts:', error)
    }
  }

  // Function to generate smart alerts based on scan history
  const generateAlerts = useCallback(async (history: any[]) => {
    if (!userId) {
      setAlerts([])
      setCurrentRiskLevel(null)
      return
    }

    // Show welcome alert for new users with 0 scans
    if (!history || history.length === 0) {
      const dismissedAlerts = getDismissedAlerts(userId)
      const welcomeAlertId = 'welcome-new-user'
      
      if (!dismissedAlerts[welcomeAlertId]) {
        setAlerts([{
          id: welcomeAlertId,
          type: 'welcome',
          message: '👋 Welcome to ScamGuard! Download our browser extension for automatic protection while browsing. Stay safe from scams with real-time detection!',
          severity: 'info',
          actionButton: {
            label: 'Download Extension',
            onClick: () => {
              // Open extension download page or Chrome Web Store
              window.open('https://chrome.google.com/webstore', '_blank')
            }
          }
        }])
      } else {
        setAlerts([])
      }
      setCurrentRiskLevel(null)
      return
    }

    try {
      const { calculateWeeklyComparison, calculateRiskLevel, calculateScamTypeBreakdown } = await import('@/utils/insightsCalculator')
      const weeklyComparison = calculateWeeklyComparison(history)
      const riskLevel = calculateRiskLevel(history)
      const scamTypes = calculateScamTypeBreakdown(history)
      
      const dismissedAlerts = getDismissedAlerts(userId)
      const newAlerts: Alert[] = []

      // Handle risk level alerts - always show for current risk level, only hide when level changes
      const riskLevelChanged = currentRiskLevel !== null && currentRiskLevel !== riskLevel
      
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
      
      // Update current risk level
      setCurrentRiskLevel(riskLevel)
      
      // Alert for unusual spike in scams (relaxed condition: >1 scam and >30% increase)
      if (weeklyComparison.thisWeek.scams > 1 && weeklyComparison.percentageChanges.scams > 30) {
        if (!dismissedAlerts['scam-spike']) {
          newAlerts.push({
            id: 'scam-spike',
            type: 'spike',
            message: `🚨 Scam spike detected: ${weeklyComparison.thisWeek.scams} scams this week (${weeklyComparison.percentageChanges.scams > 0 ? '+' : ''}${weeklyComparison.percentageChanges.scams}% from last week)`,
            severity: 'error'
          })
        }
      }

      // Alert for high activity (more than 10 scans this week)
      if (weeklyComparison.thisWeek.total > 10) {
        if (!dismissedAlerts['high-activity']) {
          newAlerts.push({
            id: 'high-activity',
            type: 'high-activity',
            message: `📊 High activity: You've scanned ${weeklyComparison.thisWeek.total} items this week. Great job staying vigilant!`,
            severity: 'info'
          })
        }
      }

      // Alert for new scam types detected
      const uniqueScamTypes = Object.keys(scamTypes)
      if (uniqueScamTypes.length > 0) {
        // Get previously seen scam types
        const seenScamTypesKey = `scam_checker_seen_scam_types_${userId}`
        const seenScamTypes: string[] = JSON.parse(localStorage.getItem(seenScamTypesKey) || '[]')
        
        // Find new scam types (not seen before)
        const newScamTypes = uniqueScamTypes.filter(type => !seenScamTypes.includes(type))
        
        // Show one alert per new scam type (not grouped)
        newScamTypes.forEach(scamType => {
          const alertId = `new-scam-type-${scamType}`
          if (!dismissedAlerts[alertId]) {
            const scamTypeFormatted = scamType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            newAlerts.push({
              id: alertId,
              type: 'new-scam-type',
              message: `🆕 New scam type detected: ${scamTypeFormatted}. Be aware of this threat!`,
              severity: 'warning',
              scamType: scamType
            })
          }
        })
        
        // Update seen scam types
        if (newScamTypes.length > 0) {
          localStorage.setItem(seenScamTypesKey, JSON.stringify([...seenScamTypes, ...newScamTypes]))
        }
      }

      // Alert for first scam detection
      if (history.filter(s => s.classification === 'scam').length === 1 && !dismissedAlerts['first-scam']) {
        newAlerts.push({
          id: 'first-scam',
          type: 'first-scam',
          message: '⚠️ First scam detected! This helps us learn your risk patterns. Stay cautious!',
          severity: 'warning'
        })
      }

      // Sort alerts: risk alerts first, then others
      const sortedAlerts = newAlerts.sort((a, b) => {
        if (a.isRiskAlert && !b.isRiskAlert) return -1
        if (!a.isRiskAlert && b.isRiskAlert) return 1
        return 0
      })

      setAlerts(sortedAlerts)
    } catch (error) {
      console.error('Error generating alerts:', error)
    }
  }, [userId, currentRiskLevel])

  // Load scan history and generate alerts
  useEffect(() => {
    if (!userId) {
      setAlerts([])
      setCurrentRiskLevel(null)
      return
    }

    const loadHistoryAndGenerateAlerts = async () => {
      try {
        const history = await getScanHistory(userId)
        await generateAlerts(history)
      } catch (error) {
        console.error('Error loading scan history for alerts:', error)
      }
    }

    loadHistoryAndGenerateAlerts()

    // Set up real-time subscription for scan history changes
    const channel = supabase
      .channel('scan_history_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scan_history',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('🔄 Alerts: Scan history changed:', payload.eventType)
          try {
            const history = await getScanHistory(userId)
            await generateAlerts(history)
          } catch (error) {
            console.error('Error refreshing alerts:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, generateAlerts])

  // Dismiss alert handler
  const dismissAlert = useCallback((alertId: string) => {
    if (!userId) return

    const alert = alerts.find(a => a.id === alertId)
    if (alert?.isRiskAlert) return // Don't allow dismissing risk alerts

    // Save dismissed alert
    const dismissedAlerts = getDismissedAlerts(userId)
    dismissedAlerts[alertId] = true
    saveDismissedAlerts(userId, dismissedAlerts)

    // Remove from alerts
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [userId, alerts])

  return (
    <AlertsContext.Provider value={{ alerts, dismissAlert, currentRiskLevel }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const context = useContext(AlertsContext)
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider')
  }
  return context
}
