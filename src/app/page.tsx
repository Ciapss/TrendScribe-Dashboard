"use client"

import { OverviewCards } from "@/components/dashboard/overview-cards"
import { RecentPosts } from "@/components/dashboard/recent-posts"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { CostOverview } from "@/components/dashboard/cost-overview"
import { RouteGuard } from "@/components/auth/route-guard"
import { useAuth } from "@/components/auth/auth-provider"

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.username || 'User'}!
          </h2>
          <p className="text-muted-foreground">
            Welcome to your TrendScribe AI dashboard. Here&apos;s what&apos;s happening with your content.
          </p>
        </div>
        
        <OverviewCards />
        
        {isAdmin && (
          <div>
            <h3 className="text-lg font-semibold tracking-tight mb-4">API Usage & Costs</h3>
            <CostOverview />
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <ActivityChart className="col-span-4" />
          <RecentPosts className="col-span-3" />
        </div>
      </div>
    </RouteGuard>
  )
}