"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

interface ActivityChartProps {
  className?: string
}

export function ActivityChart({ className }: ActivityChartProps) {
  const [data, setData] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true)
        setError(null)
        const stats = await apiClient.getDashboardStats()
        setData(stats.postsOverTime)
      } catch (error) {
        console.error('Failed to fetch activity data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load activity data')
      } finally {
        setLoading(false)
      }
    }

    fetchActivityData()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const totalPosts = data.reduce((sum, item) => sum + item.count, 0)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>Loading activity data...</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>Failed to load activity data</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-destructive text-center">
              <p className="font-medium">Error loading chart</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>No activity data available</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="font-medium">No posts generated yet</p>
              <p className="text-sm mt-1">Activity will appear here once you start generating posts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
        <CardDescription>
          Posts generated over the last 30 days ({totalPosts} total)
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => `Date: ${formatDate(value as string)}`}
              formatter={(value) => [`${value} posts`, 'Generated']}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}