"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Inbox,
  TrendingUp,
  BarChart3
} from "lucide-react"
import type { JobStats as JobStatsType } from "@/types/job"

interface JobStatsProps {
  stats: JobStatsType
}

export function JobStats({ stats }: JobStatsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "queued":
        return <Inbox className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTime = (ms?: number) => {
    if (!ms) return "N/A"
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const statusOrder = ["completed", "processing", "queued", "failed", "cancelled"]
  const sortedStatuses = Object.entries(stats.by_status).sort(
    ([a], [b]) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_jobs}</div>
          <p className="text-xs text-muted-foreground">
            All time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.queue_size}</div>
          <p className="text-xs text-muted-foreground">
            Waiting to process
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing</CardTitle>
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.processing}</div>
          <p className="text-xs text-muted-foreground">
            Currently active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.by_status.completed && stats.by_status.failed
              ? Math.round(
                  (stats.by_status.completed.count /
                    (stats.by_status.completed.count + stats.by_status.failed.count)) *
                    100
                )
              : 0}
            %
          </div>
          <p className="text-xs text-muted-foreground">
            Completed successfully
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Jobs by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedStatuses.map(([status, data]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-sm capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{data.count}</Badge>
                  {data.avg_processing_time !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      avg: {formatTime(data.avg_processing_time)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Jobs by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}