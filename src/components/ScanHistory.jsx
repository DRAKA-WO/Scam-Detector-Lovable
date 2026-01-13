import { useState, useEffect } from 'react'
import { getScanHistory, getSignedImageUrl } from '../utils/scanHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, CheckCircle, AlertTriangle, AlertCircle, Image as ImageIcon, Link as LinkIcon, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ScanHistory({ userId, onScanClick, onRefresh }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [imageUrls, setImageUrls] = useState({}) // Cache signed URLs

  useEffect(() => {
    if (userId) {
      loadHistory()
    } else {
      setScans([])
      setLoading(false)
    }
  }, [userId])

  // Generate signed URLs for images - only if not already cached
  useEffect(() => {
    const generateSignedUrls = async () => {
      const urlMap = { ...imageUrls } // Start with existing cached URLs
      let hasNewUrls = false
      
      for (const scan of scans) {
        if (scan.scan_type === 'image' && scan.image_url) {
          // Skip if we already have a cached URL for this scan
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
            const signedUrl = await getSignedImageUrl(scan.image_url)
            if (signedUrl) {
              urlMap[scan.id] = signedUrl
            }
          }
        }
      }
      
      // Only update state if we added new URLs
      if (hasNewUrls) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recent Scans</h3>
          <p className="text-sm text-muted-foreground">Latest 3 scans</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadHistory}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {scans.map((scan) => (
          <Card
            key={scan.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${getClassificationColor(scan.classification)}`}
            onClick={() => onScanClick && onScanClick(scan)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Image, Text, or URL Preview */}
                <div className="flex-shrink-0">
                  {scan.scan_type === 'image' && scan.image_url ? (
                    imageUrls[scan.id] ? (
                      <img
                        src={imageUrls[scan.id]}
                        alt="Scan preview"
                        className="w-20 h-20 object-cover rounded-lg border border-border"
                        onError={(e) => {
                          // Fallback if signed URL fails
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : (
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
                  {/* Fallback icon (hidden by default) */}
                  {scan.scan_type === 'image' && scan.image_url && (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border hidden">
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
        ))}
      </div>
    </div>
  )
}

export default ScanHistory
