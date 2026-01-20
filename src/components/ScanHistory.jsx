import { useState, useEffect } from 'react'
import { getScanHistory, getSignedImageUrl } from '../utils/scanHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, CheckCircle, AlertTriangle, AlertCircle, Image as ImageIcon, Link as LinkIcon, FileText, Clock, X, Search, Calendar, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { downloadCSV, downloadJSON } from '@/utils/exportUtils'

// Cache key for storing signed URLs in localStorage
const SIGNED_URL_CACHE_KEY = 'scam_checker_signed_urls_cache'
// Signed URLs expire after 50 minutes (slightly less than 1 hour expiry from Supabase)
const URL_CACHE_EXPIRY_MS = 50 * 60 * 1000

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

function ScanHistory({ userId, onScanClick, onRefresh, initialFilter = 'all', onFilterChange, scans: externalScans }) {
  const [scans, setScans] = useState(externalScans || [])
  const [loading, setLoading] = useState(true)
  const [imageUrls, setImageUrls] = useState(() => loadCachedUrls()) // Load from cache on mount
  const [filterClassification, setFilterClassification] = useState(initialFilter) // 'all', 'safe', 'suspicious', 'scam'
  const [previewImage, setPreviewImage] = useState(null) // For image preview modal
  const [searchQuery, setSearchQuery] = useState('') // Search query
  const [dateRange, setDateRange] = useState('30') // '7', '30', 'all' (for last 7 days, last 30 days, all)
  const [scamTypeFilter, setScamTypeFilter] = useState('all') // Filter by scam type

  // Update filter when initialFilter prop changes (from parent clicks)
  useEffect(() => {
    if (initialFilter !== filterClassification) {
      setFilterClassification(initialFilter)
    }
  }, [initialFilter])

  useEffect(() => {
    if (externalScans) {
      setScans(externalScans)
      setLoading(false)
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
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'suspicious':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Shield className="h-5 w-5 text-gray-500" />
    }
  }

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'scam':
        return 'border-red-500/30 bg-red-500/10'
      case 'suspicious':
        return 'border-yellow-500/30 bg-yellow-500/10'
      case 'safe':
        return 'border-green-500/30 bg-green-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/10'
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

  // Get unique scam types for filter dropdown
  const uniqueScamTypes = [...new Set(
    scans
      .filter(scan => scan.classification === 'scam' && scan.analysis_result?.scam_type)
      .map(scan => scan.analysis_result.scam_type)
  )].sort()

  // Filter scans based on selected classification, date range, search, and scam type
  let filteredScans = scans.filter(scan => {
    // Classification filter
    if (filterClassification !== 'all' && scan.classification !== filterClassification) {
      return false
    }

    // Date range filter
    if (dateRange !== 'all') {
      const scanDate = new Date(scan.created_at)
      const now = new Date()
      const daysAgo = parseInt(dateRange)
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      if (scanDate < cutoffDate) {
        return false
      }
    }

    // Scam type filter (only applies to scam classification)
    if (scamTypeFilter !== 'all' && scan.classification === 'scam') {
      if (scan.analysis_result?.scam_type !== scamTypeFilter) {
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
      const matchesScamType = scan.analysis_result?.scam_type?.toLowerCase().includes(query)
      
      if (!matchesContent && !matchesUrl && !matchesClassification && !matchesScanType && !matchesScamType) {
        return false
      }
    }

    return true
  })

  return (
    <div>
      {/* Enhanced Filters */}
      <div className="space-y-4 mb-4 -mt-4">
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
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
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
                className="px-3 py-1.5 h-8 rounded-md text-sm min-w-[180px]"
                style={{
                  backgroundColor: 'hsl(var(--input))',
                  color: 'hsl(var(--foreground))',
                  borderColor: 'hsl(var(--input))'
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

      <div className="grid gap-4 max-h-[520px] overflow-y-auto pr-2 dark-scrollbar">
        {filteredScans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
{searchQuery || dateRange !== '30' || scamTypeFilter !== 'all'
              ? 'No scans match your filters. Try adjusting your search criteria.'
              : `No ${filterClassification !== 'all' ? filterClassification : ''} scans found.`}
          </div>
        ) : (
          filteredScans.map((scan) => (
          <Card
            key={scan.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${getClassificationColor(scan.classification)}`}
            onClick={() => onScanClick && onScanClick(scan)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Image, Text, or URL Preview */}
                <div className="flex-shrink-0 relative">
                  {scan.scan_type === 'image' && scan.image_url ? (
                    // Check if we have a URL and it's not null (null means it failed to load)
                    imageUrls[scan.id] && imageUrls[scan.id] !== null ? (
                      <>
                        <img
                          src={imageUrls[scan.id]}
                          alt="Scan preview"
                          className="w-20 h-20 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(imageUrls[scan.id])
                          }}
                          onError={(e) => {
                            // Fallback if signed URL fails to load
                            console.warn(`⚠️ Image failed to load for scan ${scan.id}:`, imageUrls[scan.id])
                            e.target.style.display = 'none'
                            const fallback = e.target.nextElementSibling
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
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
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex flex-col items-center justify-center border border-purple-500/30">
                      <FileText className="h-6 w-6 text-purple-400 mb-1" />
                      <span className="text-[10px] text-purple-300 font-medium">TEXT</span>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
                      {getScanTypeIcon(scan.scan_type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getClassificationIcon(scan.classification)}
                    <span className="font-semibold capitalize">{scan.classification}</span>
                    <span className="text-muted-foreground text-sm">•</span>
                    <span className="text-muted-foreground text-sm capitalize">{scan.scan_type}</span>
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
                    
                    return (
                      <div className="mb-2">
                        {scan.scan_type === 'url' ? (
                          <a
                            href={scan.content_preview}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 underline line-clamp-1 break-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {scan.content_preview}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                            {scan.content_preview}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(scan.created_at)}
                    </div>
                    {/* Only show scam_type for scam results */}
                    {scan.classification === 'scam' && scan.analysis_result?.scam_type && (
                      <span className="capitalize">
                        {scan.analysis_result.scam_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
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
            className="flex items-center gap-1.5 h-8"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Full size preview"
              className="w-full h-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanHistory
