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
      <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full overflow-hidden">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.username || 'User'}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome to your TrendScribe AI dashboard. Here&apos;s what&apos;s happening with your content.
          </p>
        </div>
        
        <OverviewCards />
        
        {isAdmin && (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight">API Usage & Costs</h3>
            <CostOverview />
          </div>
        )}
        
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
          <ActivityChart className="col-span-1 lg:col-span-4" />
          <RecentPosts className="col-span-1 lg:col-span-3" />
        </div>
      </div>
    </RouteGuard>
  )
}