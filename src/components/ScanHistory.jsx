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

function ScanHistory({ userId, onScanClick, onRefresh, initialFilter = 'all', onFilterChange, scans: externalScans, initialDateRange, savedScrollPosition, onScrollRestored }) {
  // Initialize with externalScans if provided to prevent empty flash
  const [scans, setScans] = useState(externalScans || [])
  const [loading, setLoading] = useState(externalScans && externalScans.length > 0 ? false : true)
  const [imageUrls, setImageUrls] = useState(() => loadCachedUrls()) // Load from cache on mount
  const [filterClassification, setFilterClassification] = useState(initialFilter) // 'all', 'safe', 'suspicious', 'scam'
  const [previewImage, setPreviewImage] = useState(null) // For image preview modal
  const [previewText, setPreviewText] = useState(null) // For text preview modal: {content: string, scanId: string} | null
  const [searchQuery, setSearchQuery] = useState('') // Search query
  const [dateRange, setDateRange] = useState(initialDateRange || '30') // '0' (today), '7' (last 7 days), '30' (last 30 days)
  const [scamTypeFilter, setScamTypeFilter] = useState('all') // Filter by scam type
  const scrollContainerRef = useRef(null) // Ref for the scrollable container
  const isRestoringScroll = useRef(false) // Flag to prevent scroll reset during restoration

  // Update filter when initialFilter prop changes (from parent clicks)
  useEffect(() => {
    if (initialFilter !== filterClassification) {
      setFilterClassification(initialFilter)
    }
  }, [initialFilter])

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
      // This prevents resetting when component re-renders with the same prop value
      if (initialDateRange !== lastAppliedInitialDateRange.current) {
        setDateRange(initialDateRange)
        lastAppliedInitialDateRange.current = initialDateRange
      }
    } else {
      // If initialDateRange becomes null/undefined, reset the ref so it can be applied again
      lastAppliedInitialDateRange.current = null
    }
  }, [initialDateRange])

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

  // Generate signed URLs for images - only if not already cached or expired
  useEffect(() => {
    const generateSignedUrls = async () => {
      // Start with cached URLs from localStorage
      const urlMap = { ...loadCachedUrls() }
      let hasNewUrls = false
      const failedScans = new Set() // Track scans that failed to load
      
      for (const scan of scans) {
        if (scan.scan_type === 'image' && scan.image_url) {
          // Skip if we already have a valid cached URL for this scan
          if (urlMap[scan.id]) {
            continue
          }
          
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
      
      // Only update state and cache if we added new URLs
      if (hasNewUrls) {
        setImageUrls(urlMap)
        // Only cache successful URLs
        const successfulUrls = {}
        for (const [key, value] of Object.entries(urlMap)) {
          if (value !== null) {
            successfulUrls[key] = value
          }
        }
        saveCachedUrls(successfulUrls) // Persist to localStorage
      } else {
        // Even if no new URLs, update state from cache in case cache was refreshed
        setImageUrls(urlMap)
      }
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
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>Your recent scans will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No scans yet. Start analyzing content to see your history!
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get unique scam types for filter dropdown (normalized to group similar types)
  const uniqueScamTypes = [...new Set(
    scans
      .filter(scan => scan.classification === 'scam' && scan.analysis_result?.scam_type)
      .map(scan => normalizeScamType(scan.analysis_result.scam_type))
  )].sort()

  // Filter scans based on selected classification, date range, search, and scam type
  let filteredScans = scans.filter(scan => {
    // Classification filter
    if (filterClassification !== 'all' && scan.classification !== filterClassification) {
      return false
    }

    // Date range filter
    const scanDate = new Date(scan.created_at)
    const now = new Date()
    const daysAgo = parseInt(dateRange)
    
    if (daysAgo === 0) {
      // Today filter - compare local date strings
      const scanLocalYear = scanDate.getFullYear()
      const scanLocalMonth = scanDate.getMonth()
      const scanLocalDate = scanDate.getDate()
      const scanLocalDateStr = `${scanLocalYear}-${String(scanLocalMonth + 1).padStart(2, '0')}-${String(scanLocalDate).padStart(2, '0')}`
      
      const todayLocalYear = now.getFullYear()
      const todayLocalMonth = now.getMonth()
      const todayLocalDate = now.getDate()
      const todayLocalDateStr = `${todayLocalYear}-${String(todayLocalMonth + 1).padStart(2, '0')}-${String(todayLocalDate).padStart(2, '0')}`
      
      if (scanLocalDateStr !== todayLocalDateStr) {
        return false
      }
    } else {
      // Last N days filter
      // Set cutoff date to start of day (00:00:00) for accurate comparison
      const cutoffDate = new Date(now)
      cutoffDate.setDate(now.getDate() - daysAgo)
      cutoffDate.setHours(0, 0, 0, 0)
      
      // Set scan date to start of day for comparison
      const scanDateStart = new Date(scanDate)
      scanDateStart.setHours(0, 0, 0, 0)
      
      if (scanDateStart < cutoffDate) {
        return false
      }
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
          {/* Search Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search scans (content, URL, type...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-8 text-sm px-3"
              style={{
                backgroundColor: 'hsl(var(--input))',
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--input))'
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 h-8 rounded-md text-sm"
              style={{
                backgroundColor: 'hsl(var(--input))',
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--input))'
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
          {/* Classification Filter Buttons */}
          <div className="flex gap-2 flex-wrap p-1 bg-card/50 rounded-lg border border-border">
        <button
          onClick={() => {
            setFilterClassification('all')
            if (onFilterChange) onFilterChange('all')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            filterClassification === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            setFilterClassification('safe')
            if (onFilterChange) onFilterChange('safe')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
            filterClassification === 'safe'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-lg shadow-green-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
            filterClassification === 'suspicious'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-lg shadow-yellow-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
            filterClassification === 'scam'
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Scam
        </button>
          </div>

          {/* Scam Type Filter (only show when 'Scam' classification is selected) */}
          {uniqueScamTypes.length > 0 && filterClassification === 'scam' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={scamTypeFilter}
                onChange={(e) => {
                  const selectedScamType = e.target.value
                  setScamTypeFilter(selectedScamType)
                  // Automatically switch to 'scam' classification when a specific scam type is selected
                  if (selectedScamType !== 'all' && filterClassification !== 'scam') {
                    setFilterClassification('scam')
                    if (onFilterChange) onFilterChange('scam')
                  }
                }}
                size={uniqueScamTypes.length + 1 > 8 ? 8 : 1}
                className={`px-3 py-1.5 rounded-md text-sm min-w-[180px] ${uniqueScamTypes.length + 1 > 8 ? 'overflow-y-auto' : ''}`}
                style={{
                  backgroundColor: 'hsl(var(--input))',
                  color: 'hsl(var(--foreground))',
                  borderColor: 'hsl(var(--input))',
                  ...(uniqueScamTypes.length + 1 > 8 && {
                    maxHeight: '200px',
                    height: 'auto'
                  })
                }}
              >
                <option value="all">All Scam Types</option>
                {uniqueScamTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
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
            className={`cursor-pointer transition-all hover:shadow-lg border rounded-xl overflow-hidden relative group hover:shadow-lg ${getClassificationColor(scan.classification)} ${
              scan.classification === 'scam' ? 'hover:border-red-500/40 hover:shadow-red-500/10' :
              scan.classification === 'suspicious' ? 'hover:border-yellow-500/40 hover:shadow-yellow-500/10' :
              scan.classification === 'safe' ? 'hover:border-green-500/40 hover:shadow-green-500/10' :
              'hover:border-gray-500/40'
            }`}
            onClick={() => {
              // Save scroll position before navigating to scan result
              const scrollPos = scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0
              onScanClick && onScanClick(scan, scrollPos)
            }}
          >
            <CardContent className="p-4">
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
                            onError={(e) => {
                              // Fallback if signed URL fails to load
                              console.warn(`⚠️ Image failed to load for scan ${scan.id}:`, imageUrls[scan.id])
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {/* Classification Badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      scan.classification === 'scam' 
                        ? 'bg-red-900/40 text-red-300 border border-red-800/50' 
                        : scan.classification === 'suspicious'
                        ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50'
                        : scan.classification === 'safe'
                        ? 'bg-green-900/40 text-green-300 border border-green-800/50'
                        : 'bg-gray-900/40 text-gray-300 border border-gray-800/50'
                    }`}>
                      {getClassificationIcon(scan.classification)}
                      <span className="capitalize">{scan.classification}</span>
                    </div>
                    {/* Scan Type Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-900/40 text-gray-300 border border-gray-800/50">
                      {getScanTypeIcon(scan.scan_type)}
                      <span className="capitalize">{scan.scan_type}</span>
                    </div>
                  </div>

                  {/* Preview */}
                  {scan.content_preview && (() => {
                    // Don't show content preview if it looks like a scam type description for safe/suspicious results
                    const isScamTypeDescription = (scan.classification === 'safe' || scan.classification === 'suspicious') &&
                      (scan.content_preview.toLowerCase().includes('scam') || 
                       scan.content_preview.toLowerCase().includes('phishing') ||
                       scan.content_preview.toLowerCase().includes('credential'));
                    
                    if (isScamTypeDescription) {
                      return null; // Don't show scam type info for safe/suspicious results
                    }
                    
                    // For text scans, don't show content in the card (only in modal)
                    if (scan.scan_type === 'text') {
                      return null;
                    }
                    
                    return (
                      <div className="mb-2">
                        {scan.scan_type === 'url' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p 
                                  className="text-sm text-muted-foreground line-clamp-1 break-all select-none cursor-default"
                                  style={{ 
                                    userSelect: 'none'
                                  }}
                                  onClick={(e) => e.preventDefault()}
                                >
                                  {blurUrlPart(scan.content_preview)}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">URL partially hidden for security</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                            {scan.content_preview}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(scan.created_at)}
                    </div>
                    {/* Scam Type Badge - Only show for scam results */}
                    {scan.classification === 'scam' && scan.analysis_result?.scam_type && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/40 text-red-300 border border-red-800/50">
                        {scan.analysis_result.scam_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    )}
                  </div>

                  {/* Instructional Text */}
                  <div className="mt-2 text-xs text-muted-foreground/80 italic">
                    {scan.classification === 'safe' && (
                      <span>Click to see verification steps</span>
                    )}
                    {scan.classification === 'suspicious' && (
                      <span>Click to see suspicious indicators plus verification steps</span>
                    )}
                    {scan.classification === 'scam' && (
                      <span>Click to see scam indicators and what to do</span>
                    )}
                  </div>
                </div>
                
                {/* Clickable Arrow Indicator */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  <ChevronRight className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      {/* Export Button - Bottom Right */}
      {filteredScans.length > 0 && (
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(filteredScans)}
            className="flex items-center gap-1.5 h-8 hover:bg-muted hover:border-primary/50 hover:scale-[1.02] transition-all cursor-pointer"
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
