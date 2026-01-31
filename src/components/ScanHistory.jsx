import { useState, useEffect, useRef } from 'react'
import { getScanHistory, getSignedImageUrl } from '../utils/scanHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, CheckCircle, AlertTriangle, AlertCircle, Image as ImageIcon, Link as LinkIcon, FileText, Clock, X, Search, Calendar, Filter, Download, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { downloadCSV, downloadJSON } from '@/utils/exportUtils'
import { normalizeScamType } from '../utils/insightsCalculator'

// Cache key for storing signed URLs in localStorage
const SIGNED_URL_CACHE_KEY = 'scam_checker_signed_urls_cache'
// Signed URLs expire after 50 minutes (slightly less than 1 hour expiry from Supabase)
const URL_CACHE_EXPIRY_MS = 50 * 60 * 1000

// Helper function to blur part of URL for security (never blur extension)
const blurUrlPart = (url) => {
  if (!url || url.length < 10) return url
  
  // Extract extension (everything after the last dot, including the dot)
  let extension = ''
  let urlWithoutExtension = url
  const lastDotIndex = url.lastIndexOf('.')
  const lastSlashIndex = Math.max(url.lastIndexOf('/'), url.lastIndexOf('?'))
  
  // Only consider it an extension if the dot comes after the last slash (not in path/query)
  if (lastDotIndex > lastSlashIndex && lastDotIndex > 0) {
    extension = url.substring(lastDotIndex)
    urlWithoutExtension = url.substring(0, lastDotIndex)
  }
  
  // Keep more characters visible at start, blur only the middle part, keep extension visible
  // Show at least 10 characters or 30% of the URL before blurring (extended blur by 10%)
  const startVisible = Math.max(10, Math.floor(urlWithoutExtension.length * 0.3))
  const middleStart = Math.min(startVisible, urlWithoutExtension.length - 3) // Leave at least 3 chars before extension
  const middleEnd = urlWithoutExtension.length
  
  if (middleEnd <= middleStart) {
    // URL too short, blur middle but keep extension
    return (
      <>
        {urlWithoutExtension.substring(0, 1)}
        <span style={{ filter: 'blur(3px)' }}>{urlWithoutExtension.substring(1)}</span>
        {extension}
      </>
    )
  }
  
  return (
    <>
      {urlWithoutExtension.substring(0, middleStart)}
      <span style={{ filter: 'blur(3px)' }}>{urlWithoutExtension.substring(middleStart)}</span>
      {extension}
    </>
  )
}

// Helper to load cached URLs from localStorage
function loadCachedUrls() {
  try {
    const cached = localStorage.getItem(SIGNED_URL_CACHE_KEY)
    if (!cached) return {}
    
    const parsed = JSON.parse(cached)
    const now = Date.now()
    const valid = {}
    
    // Only keep URLs that haven't expired
    for (const [key, value] of Object.entries(parsed)) {
      if (value && value.url && value.expiresAt && value.expiresAt > now) {
        valid[key] = value.url
      }
    }
    
    // Update cache if we removed expired entries
    if (Object.keys(valid).length !== Object.keys(parsed).length) {
      const updated = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (value && value.url && value.expiresAt && value.expiresAt > now) {
          updated[key] = value
        }
      }
      localStorage.setItem(SIGNED_URL_CACHE_KEY, JSON.stringify(updated))
    }
    
    return valid
  } catch (error) {
    console.warn('Error loading cached URLs:', error)
    return {}
  }
}

// Helper to save URLs to localStorage cache
function saveCachedUrls(urlMap) {
  try {
    const existing = loadCachedUrls()
    const now = Date.now()
    const cache = {}
    
    // Load existing valid entries
    try {
      const cached = localStorage.getItem(SIGNED_URL_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        for (const [key, value] of Object.entries(parsed)) {
          if (value && value.expiresAt && value.expiresAt > now) {
            cache[key] = value
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Add new URLs with expiry time
    for (const [key, url] of Object.entries(urlMap)) {
      if (url) {
        cache[key] = {
          url: url,
          expiresAt: now + URL_CACHE_EXPIRY_MS
        }
      }
    }
    
    localStorage.setItem(SIGNED_URL_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn('Error saving cached URLs:', error)
  }
}

function ScanHistory({ userId, onScanClick, onRefresh, initialFilter = 'all', onFilterChange, initialScamTypeFilter = 'all', onScamTypeFilterChange, scans: externalScans, initialDateRange, onDateRangeChange, savedScrollPosition, onScrollRestored }) {
  // Initialize with externalScans if provided to prevent empty flash
  const [scans, setScans] = useState(externalScans || [])
  const [loading, setLoading] = useState(externalScans && externalScans.length > 0 ? false : true)
  const [imageUrls, setImageUrls] = useState(() => loadCachedUrls()) // Load from cache on mount
  const [filterClassification, setFilterClassification] = useState(initialFilter) // 'all', 'safe', 'suspicious', 'scam'
  const [previewImage, setPreviewImage] = useState(null) // For image preview modal
  const [previewText, setPreviewText] = useState(null) // For text preview modal: {content: string, scanId: string} | null
  const [searchQuery, setSearchQuery] = useState('') // Search query
  const [dateRange, setDateRange] = useState(initialDateRange || '30') // '0' (today), '7' (last 7 days), '30' (last 30 days)
  const [scamTypeFilter, setScamTypeFilter] = useState(initialScamTypeFilter) // Filter by scam type (lifted so "Back to history" restores it)
  const [isScamTypeDropdownOpen, setIsScamTypeDropdownOpen] = useState(false) // State for custom dropdown
  const scrollContainerRef = useRef(null) // Ref for the scrollable container
  const isRestoringScroll = useRef(false) // Flag to prevent scroll reset during restoration
  const scamTypeDropdownRef = useRef(null) // Ref for the custom dropdown container

  // Update filter when initialFilter prop changes (from parent clicks)
  useEffect(() => {
    if (initialFilter !== filterClassification) {
      setFilterClassification(initialFilter)
    }
  }, [initialFilter])

  // Sync scam type filter when initialScamTypeFilter changes (e.g. restored after "Back to history")
  useEffect(() => {
    if (initialScamTypeFilter !== undefined && initialScamTypeFilter !== scamTypeFilter) {
      setScamTypeFilter(initialScamTypeFilter)
    }
  }, [initialScamTypeFilter])

  // Track the last applied initialDateRange to prevent resetting on refresh
  const lastAppliedInitialDateRange = useRef(null)
  
  // Restore scroll position when component mounts or when savedScrollPosition prop changes
  useEffect(() => {
    if (savedScrollPosition !== undefined && savedScrollPosition > 0) {
      isRestoringScroll.current = true
      // Wait for the component to fully render and the scroll container to be available
      const restoreScroll = () => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollPosition
          } else {
          console.warn('⚠️ Scroll container ref not available yet')
        }
      }
      
      // Use requestAnimationFrame to ensure DOM is ready, then try multiple times
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreScroll()
          // Try again after delays to catch any competing scrolls
          const timeout1 = setTimeout(restoreScroll, 50)
          const timeout2 = setTimeout(() => {
            restoreScroll()
            // Final restoration attempt
            setTimeout(() => {
              restoreScroll()
              isRestoringScroll.current = false
              if (onScrollRestored) {
                onScrollRestored()
              }
            }, 200)
          }, 150)
          
          return () => {
            clearTimeout(timeout1)
            clearTimeout(timeout2)
          }
        })
      })
    }
  }, [savedScrollPosition, onScrollRestored])
  
  // Prevent scroll reset when scans update during restoration
  useEffect(() => {
    if (isRestoringScroll.current && scrollContainerRef.current && savedScrollPosition !== undefined && savedScrollPosition > 0) {
      // If we're restoring scroll, maintain the position even if scans update
      const currentScroll = scrollContainerRef.current.scrollTop
      if (Math.abs(currentScroll - savedScrollPosition) > 10) {
        // Only restore if scroll has drifted significantly
        scrollContainerRef.current.scrollTop = savedScrollPosition
      }
    }
  }, [scans, savedScrollPosition])

  // Update dateRange when initialDateRange prop changes (from stat card clicks)
  // Only apply if it's a new value that's different from what we last applied
  useEffect(() => {
    if (initialDateRange !== undefined && initialDateRange !== null) {
      // Only apply if it's a new value (different from what we last applied)
      const prevApplied = lastAppliedInitialDateRange.current
      if (initialDateRange !== prevApplied) {
        setDateRange(initialDateRange)
        lastAppliedInitialDateRange.current = initialDateRange
        onDateRangeChange?.(initialDateRange)
        // Only reset scam type when date range was explicitly changed (e.g. stat card click), not on first mount (e.g. "Back to history")
        if (prevApplied !== null) {
          setScamTypeFilter('all')
          onScamTypeFilterChange?.('all')
        }
      }
    } else {
      // If initialDateRange becomes null/undefined, reset the ref so it can be applied again
      lastAppliedInitialDateRange.current = null
    }
  }, [initialDateRange, onDateRangeChange])

  // Reset scam type filter when selected type is not in current date range (e.g. switched from 30 days to Today)
  useEffect(() => {
    if (scamTypeFilter === 'all') return
    const now = new Date()
    const daysAgo = parseInt(dateRange, 10)
    const isTodayFilter = daysAgo === 0
    const todayLocalDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const inRange = scans.filter(scan => {
      if (!scan.created_at) return false
      const scanDate = new Date(scan.created_at)
      if (isNaN(scanDate.getTime())) return false
      if (isTodayFilter) {
        const scanLocalDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`
        return scanLocalDateStr === todayLocalDateStr
      }
      const cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - daysAgo)
      cutoffDate.setHours(0, 0, 0, 0)
      const scanDateStart = new Date(scanDate)
      scanDateStart.setHours(0, 0, 0, 0)
      return scanDateStart >= cutoffDate
    })
    const typesInRange = [...new Set(
      inRange
        .filter(scan => scan.classification === 'scam' && scan.analysis_result?.scam_type)
        .map(scan => normalizeScamType(scan.analysis_result.scam_type))
    )]
    if (!typesInRange.includes(scamTypeFilter)) {
      setScamTypeFilter('all')
      onScamTypeFilterChange?.('all')
    }
  }, [dateRange, scans, scamTypeFilter])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (scamTypeDropdownRef.current && !scamTypeDropdownRef.current.contains(event.target)) {
        setIsScamTypeDropdownOpen(false)
      }
    }

    if (isScamTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isScamTypeDropdownOpen])

  useEffect(() => {
    if (externalScans && externalScans.length >= 0) {
      // Always update when externalScans changes (even if empty array)
      setScans(externalScans)
      // Only set loading to false if we have scans, or if it's explicitly an empty array (not undefined)
      if (externalScans.length > 0 || (externalScans.length === 0 && externalScans !== undefined)) {
        setLoading(false)
      }
    } else if (userId) {
      loadHistory()
    } else {
      setScans([])
      setLoading(false)
    }
  }, [userId, externalScans])

  // Generate signed URLs for images - regenerate expired URLs
  useEffect(() => {
    const generateSignedUrls = async () => {
      // Load cached URLs and check expiry
      const cachedUrls = loadCachedUrls()
      const urlMap = { ...cachedUrls }
      let hasNewUrls = false
      const failedScans = new Set() // Track scans that failed to load
      
      // Check cache expiry times
      const now = Date.now()
      let cachedData = {}
      try {
        const cached = localStorage.getItem(SIGNED_URL_CACHE_KEY)
        if (cached) {
          cachedData = JSON.parse(cached)
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      for (const scan of scans) {
        if (scan.scan_type === 'image' && scan.image_url) {
          // Check if cached URL exists and is still valid (not expired)
          const cachedEntry = cachedData[scan.id]
          const isExpired = cachedEntry && cachedEntry.expiresAt && cachedEntry.expiresAt <= now
          
          // If no cached URL or expired, regenerate
          if (!urlMap[scan.id] || isExpired) {
            hasNewUrls = true
            
            // Check if it's already a full URL or just a path
            if (scan.image_url.startsWith('http')) {
              // Already a URL (might be from old data)
              urlMap[scan.id] = scan.image_url
            } else {
              // It's a path, generate signed URL
              try {
                const signedUrl = await getSignedImageUrl(scan.image_url)
                if (signedUrl) {
                  urlMap[scan.id] = signedUrl
                } else {
                  console.warn(`⚠️ Failed to generate signed URL for scan ${scan.id} with path: ${scan.image_url}`)
                  failedScans.add(scan.id)
                  // Set to null so we know it failed (will show fallback icon)
                  urlMap[scan.id] = null
                }
              } catch (error) {
                console.error(`❌ Error generating signed URL for scan ${scan.id}:`, error)
                failedScans.add(scan.id)
                urlMap[scan.id] = null
              }
            }
          }
        }
      }
      
      // Always update state (even if no new URLs, to refresh expired ones)
      setImageUrls(urlMap)
      // Only cache successful URLs
      const successfulUrls = {}
      for (const [key, value] of Object.entries(urlMap)) {
        if (value !== null) {
          successfulUrls[key] = value
        }
      }
      saveCachedUrls(successfulUrls) // Persist to localStorage
    }

    if (scans.length > 0) {
      generateSignedUrls()
    }
  }, [scans]) // imageUrls removed from dependencies to prevent infinite loop

  const loadHistory = async () => {
    setLoading(true)
    try {
      const history = await getScanHistory(userId)
      setScans(history)
      // Also refresh dashboard stats after loading history
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error loading scan history:', error)
      setScans([])
    } finally {
      setLoading(false)
    }
  }

  const getClassificationIcon = (classification) => {
    switch (classification) {
      case 'scam':
        return <AlertTriangle className="h-4 w-4 text-red-300" />
      case 'suspicious':
        return <AlertCircle className="h-4 w-4 text-yellow-300" />
      case 'safe':
        return <CheckCircle className="h-4 w-4 text-green-300" />
      default:
        return <Shield className="h-4 w-4 text-gray-300" />
    }
  }

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'scam':
        return 'border-red-500/20 bg-gradient-to-br from-red-500/10 via-card to-card'
      case 'suspicious':
        return 'border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-card to-card'
      case 'safe':
        return 'border-green-500/20 bg-gradient-to-br from-green-500/10 via-card to-card'
      default:
        return 'border-gray-500/20 bg-gradient-to-br from-gray-500/10 via-card to-card'
    }
  }

  /** Left accent bar color by classification for card separation */
  const getClassificationBar = (classification) => {
    switch (classification) {
      case 'scam': return 'bg-red-500'
      case 'suspicious': return 'bg-amber-500'
      case 'safe': return 'bg-emerald-500'
      default: return 'bg-zinc-500'
    }
  }

  const getScanTypeIcon = (scanType) => {
    switch (scanType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'url':
        return <LinkIcon className="h-4 w-4" />
      case 'text':
        return <FileText className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>Sign in to view your scan history</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground">
          No scans yet. Start analyzing content to see your history!
        </p>
      </div>
    )
  }

  // Filter scans based on selected classification, date range, search, and scam type
  const now = new Date()
  const daysAgo = parseInt(dateRange, 10)
  const isTodayFilter = daysAgo === 0
  const todayLocalDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Scans in current date range only (used for scam type dropdown so it matches the date filter)
  const scansInDateRange = scans.filter(scan => {
    if (!scan.created_at) return false
    const scanDate = new Date(scan.created_at)
    if (isNaN(scanDate.getTime())) return false
    if (isTodayFilter) {
      const scanLocalDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`
      if (scanLocalDateStr !== todayLocalDateStr) return false
    } else {
      const cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - daysAgo)
      cutoffDate.setHours(0, 0, 0, 0)
      const scanDateStart = new Date(scanDate)
      scanDateStart.setHours(0, 0, 0, 0)
      if (scanDateStart < cutoffDate) return false
    }
    return true
  })

  // Get unique scam types for filter dropdown from scans IN CURRENT DATE RANGE (not all scans)
  const uniqueScamTypes = [...new Set(
    scansInDateRange
      .filter(scan => scan.classification === 'scam' && scan.analysis_result?.scam_type)
      .map(scan => normalizeScamType(scan.analysis_result.scam_type))
  )].sort()

  let filteredScans = scans.filter(scan => {
    // Classification filter
    if (filterClassification !== 'all' && scan.classification !== filterClassification) {
      return false
    }

    // Date range filter - require valid created_at
    if (!scan.created_at) return false
    const scanDate = new Date(scan.created_at)
    if (isNaN(scanDate.getTime())) return false

    if (isTodayFilter) {
      // Today: same calendar day in user's local timezone
      const scanLocalDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`
      if (scanLocalDateStr !== todayLocalDateStr) return false
    } else {
      // Last N days: scan on or after (now - N days) at start of day
      const cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - daysAgo)
      cutoffDate.setHours(0, 0, 0, 0)
      const scanDateStart = new Date(scanDate)
      scanDateStart.setHours(0, 0, 0, 0)
      if (scanDateStart < cutoffDate) return false
    }

    // Scam type filter (only applies to scam classification) - use normalized types
    if (scamTypeFilter !== 'all' && scan.classification === 'scam') {
      const normalizedScanType = normalizeScamType(scan.analysis_result?.scam_type)
      if (normalizedScanType !== scamTypeFilter) {
        return false
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesContent = scan.content_preview?.toLowerCase().includes(query)
      const matchesUrl = scan.scan_type === 'url' && scan.content_preview?.toLowerCase().includes(query)
      const matchesClassification = scan.classification?.toLowerCase().includes(query)
      const matchesScanType = scan.scan_type?.toLowerCase().includes(query)
      const normalizedScamType = normalizeScamType(scan.analysis_result?.scam_type)
      const matchesScamType = normalizedScamType?.toLowerCase().includes(query)
      
      if (!matchesContent && !matchesUrl && !matchesClassification && !matchesScanType && !matchesScamType) {
        return false
      }
    }

    return true
  })

  return (
    <div>
      {/* Enhanced Filters */}
      <div className="space-y-4 mb-4">
        {/* Search and Date Range Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search scans (content, URL, type...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-sm px-3 rounded-lg border-border bg-input/80 focus:ring-2 focus:ring-primary/30"
              style={{
                backgroundColor: 'hsl(var(--input))',
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--border))'
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <select
              value={dateRange}
              onChange={(e) => {
                const value = e.target.value
                setDateRange(value)
                onDateRangeChange?.(value)
                setScamTypeFilter('all')
                onScamTypeFilterChange?.('all')
              }}
              className="px-3 py-2 h-9 rounded-lg text-sm font-medium border border-border bg-input/80 cursor-pointer hover:border-primary/40 transition-colors"
              style={{
                backgroundColor: 'hsl(var(--input))',
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--border))'
              }}
            >
              <option value="0">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Classification and Scam Type Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-1">Filter by status</span>
          <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setFilterClassification('all')
            if (onFilterChange) onFilterChange('all')
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-1.5 ${
            filterClassification === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
              : 'bg-muted/50 text-zinc-400 border-border hover:bg-muted hover:text-foreground hover:border-primary/40'
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            setFilterClassification('safe')
            if (onFilterChange) onFilterChange('safe')
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-1.5 ${
            filterClassification === 'safe'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-background'
              : 'bg-muted/50 text-zinc-400 border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/40'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          Safe
        </button>
        <button
          onClick={() => {
            setFilterClassification('suspicious')
            if (onFilterChange) onFilterChange('suspicious')
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-1.5 ${
            filterClassification === 'suspicious'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background'
              : 'bg-muted/50 text-zinc-400 border-border hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/40'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          Suspicious
        </button>
        <button
          onClick={() => {
            setFilterClassification('scam')
            if (onFilterChange) onFilterChange('scam')
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center gap-1.5 ${
            filterClassification === 'scam'
              ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-md shadow-red-500/10 ring-2 ring-red-500/30 ring-offset-2 ring-offset-background'
              : 'bg-muted/50 text-zinc-400 border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Scam
        </button>
          </div>
          </div>

          {/* Scam Type Filter (only show when 'Scam' classification is selected) */}
          {uniqueScamTypes.length > 0 && filterClassification === 'scam' && (
            <div className="flex items-center gap-2 relative" ref={scamTypeDropdownRef}>
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsScamTypeDropdownOpen(!isScamTypeDropdownOpen)}
                  className="px-3 py-1.5 rounded-md text-sm min-w-[320px] text-left flex items-center justify-between"
                  style={{
                    backgroundColor: 'hsl(var(--input))',
                    color: 'hsl(var(--foreground))',
                    borderColor: 'hsl(var(--input))',
                    border: '1px solid hsl(var(--input))'
                  }}
                >
                  <span>
                    {scamTypeFilter === 'all' 
                      ? 'All Scam Types' 
                      : scamTypeFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${isScamTypeDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isScamTypeDropdownOpen && (
                  <div
                    className="absolute z-50 mt-1 w-full rounded-md border shadow-lg scam-type-dropdown"
                    style={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      maxHeight: uniqueScamTypes.length + 1 >= 7 ? '210px' : 'auto',
                      overflowY: uniqueScamTypes.length + 1 >= 7 ? 'auto' : 'visible',
                      overflowX: 'hidden',
                      minWidth: '320px'
                    }}
                  >
                    <style>{`
                      .scam-type-dropdown::-webkit-scrollbar {
                        width: 8px;
                      }
                      .scam-type-dropdown::-webkit-scrollbar-track {
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 4px;
                      }
                      .scam-type-dropdown::-webkit-scrollbar-thumb {
                        background: rgba(168, 85, 247, 0.6);
                        border-radius: 4px;
                      }
                      .scam-type-dropdown::-webkit-scrollbar-thumb:hover {
                        background: rgba(168, 85, 247, 0.8);
                      }
                    `}</style>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScamTypeFilter('all')
                          onScamTypeFilterChange?.('all')
                          setIsScamTypeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                          scamTypeFilter === 'all' ? 'bg-primary/10 text-primary' : ''
                        }`}
                        style={{
                          color: scamTypeFilter === 'all' ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'
                        }}
                      >
                        <span className="flex-shrink-0">-</span>
                        <span>All Scam Types</span>
                      </button>
                      {uniqueScamTypes.map((type) => {
                        const displayName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        const isSelected = scamTypeFilter === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setScamTypeFilter(type)
                              onScamTypeFilterChange?.(type)
                              setIsScamTypeDropdownOpen(false)
                              // Automatically switch to 'scam' classification when a specific scam type is selected
                              if (filterClassification !== 'scam') {
                                setFilterClassification('scam')
                                if (onFilterChange) onFilterChange('scam')
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-start gap-2 ${
                              isSelected ? 'bg-primary/10 text-primary' : ''
                            }`}
                            style={{
                              color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'
                            }}
                          >
                            <span className="flex-shrink-0 mt-0.5">-</span>
                            <span className="break-words">{displayName}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="grid gap-4 max-h-[520px] overflow-y-auto pr-2 dark-scrollbar"
      >
        {filteredScans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || dateRange !== '30' || filterClassification !== 'all' || scamTypeFilter !== 'all'
              ? 'No scans match your filters. Try adjusting your search criteria.'
              : `No ${filterClassification !== 'all' ? filterClassification : ''} scans found.`}
          </div>
        ) : (
          filteredScans.map((scan) => (
          <Card
            key={scan.id}
            className={`cursor-pointer transition-all hover:shadow-xl border rounded-xl overflow-hidden relative group ${getClassificationColor(scan.classification)} ${
              scan.classification === 'scam' ? 'hover:border-red-500/40 hover:shadow-red-500/15' :
              scan.classification === 'suspicious' ? 'hover:border-amber-500/40 hover:shadow-amber-500/15' :
              scan.classification === 'safe' ? 'hover:border-emerald-500/40 hover:shadow-emerald-500/15' :
              'hover:border-zinc-500/40'
            }`}
            onClick={() => {
              const scrollPos = scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0
              onScanClick && onScanClick(scan, scrollPos)
            }}
          >
            <div className="flex items-stretch gap-0 min-h-0">
              {/* Left accent bar by classification */}
              <div className={`w-1.5 flex-shrink-0 ${getClassificationBar(scan.classification)} opacity-90`} />
            <CardContent className="p-4 flex-1 min-w-0">
              <div className="flex items-center gap-4 relative">
                {/* Image, Text, or URL Preview */}
                <div className="flex-shrink-0 relative">
                  {scan.scan_type === 'image' && scan.image_url ? (
                    // Check if we have a URL and it's not null (null means it failed to load)
                    imageUrls[scan.id] && imageUrls[scan.id] !== null ? (
                      <>
                        <div
                          className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:from-purple-500/40 hover:to-pink-500/40 hover:border-purple-500/60 hover:scale-105 transition-all cursor-pointer overflow-hidden"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(imageUrls[scan.id])
                          }}
                        >
                          <img
                            src={imageUrls[scan.id]}
                            alt="Scan preview"
                            className="w-full h-full object-cover"
                            onError={async (e) => {
                              // Image failed to load - try regenerating signed URL (might have expired)
                              console.warn(`⚠️ Image failed to load for scan ${scan.id}, attempting to regenerate signed URL...`)
                              
                              // Only retry if we have an image_url path (not a full URL)
                              if (scan.image_url && !scan.image_url.startsWith('http')) {
                                try {
                                  const newSignedUrl = await getSignedImageUrl(scan.image_url)
                                  if (newSignedUrl) {
                                    // Update the URL and retry loading
                                    setImageUrls(prev => ({
                                      ...prev,
                                      [scan.id]: newSignedUrl
                                    }))
                                    // Save to cache
                                    saveCachedUrls({ [scan.id]: newSignedUrl })
                                    // Update the img src to retry
                                    e.target.src = newSignedUrl
                                    return // Don't show fallback yet, let it retry
                                  }
                                } catch (error) {
                                  console.error(`❌ Failed to regenerate signed URL for scan ${scan.id}:`, error)
                                }
                              }
                              
                              // If retry failed or not applicable, show fallback
                              e.target.style.display = 'none'
                              const fallback = e.target.parentElement.nextElementSibling
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                        </div>
                        {/* Fallback icon (hidden by default, shown on image error) */}
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border hidden">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </>
                    ) : imageUrls[scan.id] === null ? (
                      // Explicitly failed to generate signed URL - show fallback immediately
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : (
                      // Still loading - show spinner
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                      </div>
                    )
                  ) : scan.scan_type === 'url' ? (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex flex-col items-center justify-center border border-blue-500/30">
                      <LinkIcon className="h-6 w-6 text-blue-400 mb-1" />
                      <span className="text-[10px] text-blue-300 font-medium">URL</span>
                    </div>
                  ) : scan.scan_type === 'text' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (scan.content_preview) {
                          setPreviewText({
                            content: scan.content_preview,
                            scanId: scan.id
                          })
                        }
                      }}
                      className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex flex-col items-center justify-center border border-purple-500/30 hover:from-purple-500/40 hover:to-pink-500/40 hover:border-purple-500/60 hover:scale-105 transition-all cursor-pointer"
                    >
                      <FileText className="h-6 w-6 text-purple-400 mb-1" />
                      <span className="text-[10px] text-purple-300 font-medium">TEXT</span>
                    </button>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
                      {getScanTypeIcon(scan.scan_type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Badges row: classification (accent) + scan type (muted) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      scan.classification === 'scam' 
                        ? 'bg-red-500/15 text-red-400 border-red-500/40' 
                        : scan.classification === 'suspicious'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                        : scan.classification === 'safe'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/40'
                    }`}>
                      {getClassificationIcon(scan.classification)}
                      <span>{scan.classification}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                      {getScanTypeIcon(scan.scan_type)}
                      <span className="uppercase">{scan.scan_type}</span>
                    </div>
                    {scan.classification === 'scam' && scan.analysis_result?.scam_type && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/30">
                        {(typeof scan.analysis_result.scam_type === 'string'
                          ? scan.analysis_result.scam_type
                          : normalizeScamType(scan.analysis_result.scam_type)
                        ).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>

                  {/* Content preview: muted, separated */}
                  {scan.content_preview && (() => {
                    const isScamTypeDescription = (scan.classification === 'safe' || scan.classification === 'suspicious') &&
                      (scan.content_preview.toLowerCase().includes('scam') || 
                       scan.content_preview.toLowerCase().includes('phishing') ||
                       scan.content_preview.toLowerCase().includes('credential'));
                    if (isScamTypeDescription || scan.scan_type === 'text') return null;
                    return (
                      <div className="border-l-2 border-zinc-600/50 pl-3">
                        {scan.scan_type === 'url' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm text-zinc-400 line-clamp-1 break-all select-none cursor-default" onClick={(e) => e.preventDefault()}>
                                  {blurUrlPart(scan.content_preview)}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">URL partially hidden for security</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <p className="text-sm text-zinc-400 line-clamp-2 break-words leading-relaxed">
                            {scan.content_preview}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Meta row: time + CTA */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(scan.created_at)}
                    </p>
                    <span className="text-xs font-medium text-zinc-500">
                      {scan.classification === 'safe' && 'View verification steps'}
                      {scan.classification === 'suspicious' && 'View indicators and verification steps'}
                      {scan.classification === 'scam' && 'View details and how to stay safe'}
                    </span>
                  </div>
                </div>
                
                {/* Arrow / action hint */}
                <div className="flex-shrink-0 flex items-center justify-center rounded-lg border border-border bg-muted/30 p-2 group-hover:bg-primary/10 group-hover:border-primary/40 transition-colors">
                  <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </CardContent>
            </div>
          </Card>
          ))
        )}
      </div>

      {/* Export Button */}
      {filteredScans.length > 0 && (
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(filteredScans)}
            className="rounded-xl border border-border bg-muted/30 px-4 py-2 h-9 text-sm font-semibold text-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Text Preview Modal */}
      {previewText && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewText(null)}
        >
          <div 
            className="relative bg-card rounded-lg border-2 border-purple-500/50 shadow-2xl flex flex-col cursor-default"
            style={{
              maxWidth: '500px',
              maxHeight: '400px',
              width: '85%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold">Text Preview</h3>
              </div>
              <button
                onClick={() => setPreviewText(null)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div 
              className="p-6 overflow-y-scroll flex-1 text-preview-scroll"
              style={{
                maxHeight: '350px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(168, 85, 247, 0.6) rgba(0, 0, 0, 0.2)'
              }}
            >
              <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                {previewText.content}
              </p>
            </div>
            <style>{`
              .text-preview-scroll::-webkit-scrollbar {
                width: 10px;
              }
              .text-preview-scroll::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 5px;
              }
              .text-preview-scroll::-webkit-scrollbar-thumb {
                background: rgba(168, 85, 247, 0.6);
                border-radius: 5px;
              }
              .text-preview-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(168, 85, 247, 0.8);
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-card rounded-lg overflow-hidden border-2 border-purple-500/50 shadow-2xl cursor-default"
            style={{
              maxWidth: '600px',
              maxHeight: '600px',
              width: 'auto',
              height: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Full size preview"
              className="w-auto h-auto object-contain rounded"
              style={{
                maxWidth: '600px',
                maxHeight: '600px',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanHistory
