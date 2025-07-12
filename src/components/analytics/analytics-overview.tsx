"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Target, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { DashboardStats } from "@/types"

export function AnalyticsOverview() {
  const [analytics, setAnalytics] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiClient.getDashboardStats()
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch analytics data')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">--</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Failed to load analytics data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No analytics data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate growth metrics - since we don't have historical data from API yet,
  // we'll display current values without growth indicators for now
  const totalPosts = analytics.totalPosts
  const postsThisMonth = analytics.postsThisMonth
  const averageQuality = analytics.averageQualityScore
  const successRate = analytics.successRate

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Posts This Month</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{postsThisMonth}</div>
          <p className="text-xs text-muted-foreground">
            {totalPosts} total posts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Quality</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageQuality.toFixed(1)}/100</div>
          <p className="text-xs text-muted-foreground">
            Quality score across all posts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Generation success rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Active Industry</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{analytics.mostActiveIndustry}</div>
          <p className="text-xs text-muted-foreground">
            Top performing industry
          </p>
        </CardContent>
      </Card>
    </div>
  )
}