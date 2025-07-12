"use client"

import { AnalyticsOverview } from "@/components/analytics/analytics-overview"
import { PostsByIndustryChart } from "@/components/analytics/posts-by-industry-chart"
import { QualityDistributionChart } from "@/components/analytics/quality-distribution-chart"
import { TopPerformingPosts } from "@/components/analytics/top-performing-posts"
import { CostAnalytics } from "@/components/analytics/cost-analytics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RouteGuard } from "@/components/auth/route-guard"
import { useAuth } from "@/components/auth/auth-provider"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Insights and performance metrics for your generated content{isAdmin ? ' and API usage' : ''}.
          </p>
        </div>
        
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Content Analytics</TabsTrigger>
            {isAdmin && <TabsTrigger value="costs">API Costs</TabsTrigger>}
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <AnalyticsOverview />
            
            <div className="grid gap-6 md:grid-cols-2">
              <PostsByIndustryChart />
              <QualityDistributionChart />
            </div>
            
            <TopPerformingPosts />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="costs">
              <CostAnalytics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </RouteGuard>
  )
}