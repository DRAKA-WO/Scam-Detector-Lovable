import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Clock } from 'lucide-react'
import { calculateDailyTrends, calculatePeakTimes } from '@/utils/insightsCalculator'
import { format } from 'date-fns'

const chartConfig = {
  scam: {
    label: "Scams",
    color: "hsl(var(--chart-1))",
  },
  suspicious: {
    label: "Suspicious",
    color: "hsl(var(--chart-2))",
  },
  safe: {
    label: "Safe",
    color: "hsl(var(--chart-3))",
  },
}

export default function TrendsChart({ scanHistory }) {

  const trends = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return []
    }
    return calculateDailyTrends(scanHistory)
  }, [scanHistory])

  const peakTimes = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return { peakHour: null, peakDay: null }
    }
    return calculatePeakTimes(scanHistory)
  }, [scanHistory])

  // Format dates for display (short month/day format)
  const formattedTrends = useMemo(() => {
    return trends.map(trend => ({
      ...trend,
      dateLabel: format(new Date(trend.date), 'MMM d')
    }))
  }, [trends])

  if (trends.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Scan Trends</CardTitle>
          <CardDescription>30-day scan activity trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No scan data available yet. Start scanning to see trends!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scan Trends</CardTitle>
        <CardDescription className="text-xs">30-day scan activity trends by classification</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="flex-1 flex items-center justify-center">
          <ChartContainer config={chartConfig} className="h-[250px] w-full" style={{ height: '250px' }}>
              <LineChart data={formattedTrends} margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 40%)" opacity={0.5} />
            <XAxis 
              dataKey="dateLabel"
              className="text-xs"
              tick={{ fill: 'hsl(220, 10%, 75%)', fontSize: 12 }}
              interval="preserveStartEnd"
              stroke="hsl(220, 15%, 40%)"
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(220, 10%, 75%)', fontSize: 12 }}
              stroke="hsl(220, 15%, 40%)"
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload) {
                  return format(new Date(payload[0].payload.date), 'MMMM d, yyyy')
                }
                return label
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', color: 'hsl(220, 10%, 85%)' }}
              iconType="circle"
              formatter={(value) => {
                if (value === 'scam') return 'Scams'
                if (value === 'suspicious') return 'Suspicious'
                if (value === 'safe') return 'Safe'
                return value
              }}
              style={{ fontSize: '11px', color: 'hsl(220, 10%, 85%)' }}
            />
            <Line 
              type="monotone" 
              dataKey="scam" 
              stroke="#ef4444" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ef4444' }}
              activeDot={{ r: 6, fill: '#ef4444' }}
              name="scam"
            />
            <Line 
              type="monotone" 
              dataKey="suspicious" 
              stroke="#fbbf24" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#fbbf24' }}
              activeDot={{ r: 6, fill: '#fbbf24' }}
              name="suspicious"
            />
            <Line 
              type="monotone" 
              dataKey="safe" 
              stroke="#22c55e" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#22c55e' }}
              activeDot={{ r: 6, fill: '#22c55e' }}
              name="safe"
            />
            </LineChart>
          </ChartContainer>
        </div>
        {/* Peak Detection Times */}
        {peakTimes.peakHour !== null && (
          <div className="space-y-2 pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Peak Detection Times</span>
            </div>
            <div className="pl-6">
              <div className="text-sm flex items-center gap-4">
                <span>
                  <span className="font-semibold">Peak Hour:</span>{' '}
                  {peakTimes.peakHour}:00 - {peakTimes.peakHour + 1}:00
                </span>
                <span>
                  <span className="font-semibold">Peak Day:</span>{' '}
                  {peakTimes.peakDay}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
