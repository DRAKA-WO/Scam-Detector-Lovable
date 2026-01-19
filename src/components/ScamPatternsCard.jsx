import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, BarChart3, TrendingUp } from 'lucide-react'
import { 
  calculateScamTypeBreakdown, 
  calculatePeakTimes, 
  calculateScanTypeDistribution,
  calculateRiskLevel
} from '@/utils/insightsCalculator'

export default function ScamPatternsCard({ scanHistory }) {
  const patterns = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return null
    }

    const scamTypes = calculateScamTypeBreakdown(scanHistory)
    const peakTimes = calculatePeakTimes(scanHistory)
    const scanDistribution = calculateScanTypeDistribution(scanHistory)
    const riskLevel = calculateRiskLevel(scanHistory)

    return {
      scamTypes,
      peakTimes,
      scanDistribution,
      riskLevel
    }
  }, [scanHistory])

  if (!scanHistory || scanHistory.length === 0 || !patterns) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Scam Patterns</CardTitle>
          <CardDescription>Analysis of your scan patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No scan data available yet. Start scanning to see patterns!
          </div>
        </CardContent>
      </Card>
    )
  }

  const mostCommonScamType = Object.entries(patterns.scamTypes).sort(([, a], [, b]) => b - a)[0]
  const riskColor = patterns.riskLevel === 'high' ? 'text-red-500' : patterns.riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
  const riskBg = patterns.riskLevel === 'high' ? 'bg-red-500/15 border-red-500/40' : patterns.riskLevel === 'medium' ? 'bg-yellow-500/15 border-yellow-500/40' : 'bg-green-500/15 border-green-500/40'

  return (
    <Card className="mb-8 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scam Patterns</CardTitle>
        <CardDescription className="text-xs">Analysis of your scan patterns over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 pt-0">
        {/* Risk Level */}
        <div className={`p-3 rounded-lg border ${riskBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${riskColor}`} />
              <span className="font-semibold">Risk Level</span>
            </div>
            <span className={`font-bold text-lg capitalize ${riskColor}`}>
              {patterns.riskLevel}
            </span>
          </div>
        </div>

        {/* Most Common Scam Type */}
        {mostCommonScamType && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>Most Common Threat</span>
            </div>
            <div className="pl-6">
              <div className="text-lg font-semibold">
                {mostCommonScamType[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div className="text-sm text-muted-foreground">
                Detected {mostCommonScamType[1]} time{mostCommonScamType[1] !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Scan Type Distribution */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span>Scan Type Distribution</span>
          </div>
          <div className="pl-6 space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Images</span>
                <span className="font-medium">{patterns.scanDistribution.image.count} ({patterns.scanDistribution.image.percentage}%)</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-2.5 border border-border/30">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full transition-all shadow-sm"
                  style={{ width: `${patterns.scanDistribution.image.percentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>URLs</span>
                <span className="font-medium">{patterns.scanDistribution.url.count} ({patterns.scanDistribution.url.percentage}%)</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-2.5 border border-border/30">
                <div 
                  className="bg-purple-500 h-2.5 rounded-full transition-all shadow-sm"
                  style={{ width: `${patterns.scanDistribution.url.percentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Text</span>
                <span className="font-medium">{patterns.scanDistribution.text.count} ({patterns.scanDistribution.text.percentage}%)</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-2.5 border border-border/30">
                <div 
                  className="bg-orange-500 h-2.5 rounded-full transition-all shadow-sm"
                  style={{ width: `${patterns.scanDistribution.text.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
