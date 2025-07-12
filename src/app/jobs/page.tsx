"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JobList } from "@/components/jobs/job-list"
import { JobStats } from "@/components/jobs/job-stats"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Trash2, Archive } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { Job, JobStats as JobStatsType } from "@/types/job"
import { toast } from "sonner"
import { FadeIn } from "@/components/ui/page-transition"
import { RouteGuard } from "@/components/auth/route-guard"
// import { useWebSocket } from "@/hooks/useWebSocket" // Temporarily disabled

export default function JobsPage() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<JobStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const searchParams = useSearchParams()
  const highlightJobId = searchParams.get('highlight')
  
  // Smart polling state - reasonable intervals for updates
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentIntervalRef = useRef(3000) // Start with 3 seconds for updates
  const maxIntervalRef = useRef(10000) // Max 10 seconds
  const hasActiveJobsRef = useRef(false)

  // WebSocket for real-time updates - temporarily disabled to prevent connection flood
  // const { isConnected: wsConnected } = useWebSocket(
  //   `ws://${process.env.NEXT_PUBLIC_API_URL?.replace('https://', '').replace('http://', '').replace('/api/v1', '') || 'localhost:8000'}/api/v1/ws/jobs`,
  //   {
  //     onMessage: (message) => {
  //       console.log('🔔 WebSocket job update:', message)
  //       
  //       if (message.type === 'progress_update' || message.type === 'job_completed' || message.type === 'job_failed') {
  //         // Immediately refresh jobs when we get a WebSocket update
  //         refresh()
  //       }
  //     },
  //     reconnectInterval: 2000,
  //     maxReconnectAttempts: 10
  //   }
  // )
  const wsConnected = false // Temporarily use polling only

  const fetchActiveJobs = useCallback(async () => {
    try {
      const jobsData = await apiClient.getJobs()
      console.log("Fetched active jobs data:", jobsData)
      
      // Validate job data
      const validJobs = jobsData.filter(job => {
        if (!job.id) {
          console.warn("Job missing ID:", job)
          return false
        }
        return true
      })
      
      if (validJobs.length !== jobsData.length) {
        console.warn(`Filtered out ${jobsData.length - validJobs.length} jobs without IDs`)
      }
      
      // Check if there are active jobs (queued or processing)
      const hasActive = validJobs.some(job => 
        job.status === "queued" || job.status === "processing"
      )
      hasActiveJobsRef.current = hasActive
      
      setActiveJobs(validJobs)
      return hasActive
    } catch (error) {
      console.error("Failed to fetch active jobs:", error)
      // During content generation, the server might be temporarily unresponsive
      // Don't clear the jobs list, just log the error and retry later
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log("Server temporarily unavailable (likely during content generation), will retry...")
      }
      return hasActiveJobsRef.current // Return previous state to avoid clearing jobs
    }
  }, [])

  const fetchArchivedJobs = useCallback(async () => {
    try {
      const archivedData = await apiClient.getArchivedJobs()
      console.log("Fetched archived jobs data:", archivedData)
      setArchivedJobs(archivedData)
    } catch (error) {
      console.error("Failed to fetch archived jobs:", error)
      // During content generation, server might be unresponsive - don't clear existing data
      if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
        setArchivedJobs([])
      }
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await apiClient.getJobStats()
      setStats(statsData)
    } catch (error) {
      console.error("Failed to fetch job stats:", error)
      // During content generation, server might be unresponsive - keep existing stats
      if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
        // Only clear stats for non-connection errors
        setStats(null)
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const hasActive = await fetchActiveJobs()
      await Promise.all([fetchArchivedJobs(), fetchStats()])
      return hasActive
    } finally {
      setRefreshing(false)
    }
  }, [fetchActiveJobs, fetchArchivedJobs, fetchStats])


  // Smart polling function with exponential backoff
  const startSmartPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current)
    }

    const poll = async () => {
      if (!autoRefresh) return

      const hasActive = await refresh()
      
      // Adjust interval based on activity
      if (hasActive) {
        // Reset to 3-second polling when there are active jobs
        currentIntervalRef.current = 3000 // 3 seconds for active jobs
      } else {
        // Exponential backoff when no active jobs
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * 1.5,
          maxIntervalRef.current
        )
      }

      // Schedule next poll
      pollingIntervalRef.current = setTimeout(poll, currentIntervalRef.current)
    }

    // Start polling
    poll()
  }, [autoRefresh, refresh])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    }
    
    initialFetch()
  }, [refresh])

  useEffect(() => {
    if (autoRefresh) {
      startSmartPolling()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [autoRefresh, startSmartPolling, stopPolling])

  const handleJobAction = async (action: string, jobId: string) => {
    try {
      if (action === "cancel") {
        await apiClient.cancelJob(jobId)
        toast.success("Job cancelled successfully")
      } else if (action === "retry") {
        await apiClient.retryJob(jobId)
        toast.success("Job queued for retry")
      }
      // Reset polling interval and refresh immediately after action
      currentIntervalRef.current = 3000
      await refresh()
      
      // Restart smart polling if auto-refresh is enabled
      if (autoRefresh) {
        startSmartPolling()
      }
    } catch (error) {
      console.error(`Failed to ${action} job:`, error)
      toast.error(`Failed to ${action} job`)
    }
  }

  const handleCleanupCancelled = async () => {
    setCleaningUp(true)
    try {
      const result = await apiClient.cleanupCancelledJobs()
      toast.success(result.message)
      // Refresh the job list after cleanup
      await refresh()
    } catch (error) {
      console.error("Failed to cleanup cancelled jobs:", error)
      toast.error("Failed to cleanup cancelled jobs")
    } finally {
      setCleaningUp(false)
    }
  }

  const handleArchiveCompleted = async () => {
    setArchiving(true)
    try {
      const result = await apiClient.archiveCompletedJobs(7) // Archive jobs older than 7 days
      toast.success(result.message)
      // Refresh the job list after archival
      await refresh()
    } catch (error) {
      console.error("Failed to archive completed jobs:", error)
      toast.error("Archive feature not available yet - please restart the server")
    } finally {
      setArchiving(false)
    }
  }

  const hasCancelledJobs = activeJobs.some(job => job.status === "cancelled")
  const hasCompletedJobs = activeJobs.some(job => job.status === "completed")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage content generation jobs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-sm text-muted-foreground">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="cursor-pointer rounded"
            />
            {autoRefresh && (
              <span className="text-xs text-muted-foreground">
                ({hasActiveJobsRef.current ? "3s" : `${Math.round(currentIntervalRef.current / 1000)}s`})
              </span>
            )}
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {wsConnected ? 'Live' : 'Polling'}
              </span>
            </div>
          </div>
          {hasCancelledJobs && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupCancelled}
              disabled={cleaningUp}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className={`h-4 w-4 mr-2 ${cleaningUp ? 'animate-pulse' : ''}`} />
              Clean Cancelled
            </Button>
          )}
          {hasCompletedJobs && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveCompleted}
              disabled={archiving}
              className="text-blue-600 hover:text-blue-700"
            >
              <Archive className={`h-4 w-4 mr-2 ${archiving ? 'animate-pulse' : ''}`} />
              Archive Completed
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {stats && (
        <FadeIn delay={0.1}>
          <JobStats stats={stats} />
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Jobs ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived Jobs ({archivedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>
                View and manage currently active generation jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobList 
                jobs={activeJobs} 
                onAction={handleJobAction}
                highlightJobId={highlightJobId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle>Archived Jobs</CardTitle>
              <CardDescription>
                View completed jobs that have been archived
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobList 
                jobs={archivedJobs} 
                onAction={handleJobAction}
                highlightJobId={highlightJobId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </FadeIn>
      </div>
    </RouteGuard>
  )
}