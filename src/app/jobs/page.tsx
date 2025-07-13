"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JobList } from "@/components/jobs/job-list"
import { JobStats } from "@/components/jobs/job-stats"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [cleaningUp, setCleaningUp] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveEligibility, setArchiveEligibility] = useState<{
    valid: boolean
    eligibleJobsCount: number
    message: string
  } | null>(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const searchParams = useSearchParams()
  const highlightJobId = searchParams.get('highlight')
  

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
      
      setActiveJobs(validJobs)
    } catch (error) {
      console.error("Failed to fetch active jobs:", error)
      // During content generation, the server might be temporarily unresponsive
      // Don't clear the jobs list, just log the error and retry later
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log("Server temporarily unavailable (likely during content generation), will retry...")
      }
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

  const checkArchiveEligibility = useCallback(async () => {
    try {
      const eligibility = await apiClient.checkArchiveEligibility()
      setArchiveEligibility(eligibility)
    } catch (error) {
      console.error("Failed to check archive eligibility:", error)
      setArchiveEligibility({
        valid: false,
        eligibleJobsCount: 0,
        message: "Failed to check eligibility"
      })
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchActiveJobs()
      await Promise.all([fetchArchivedJobs(), fetchStats(), checkArchiveEligibility()])
    } finally {
      setRefreshing(false)
    }
  }, [fetchActiveJobs, fetchArchivedJobs, fetchStats, checkArchiveEligibility])



  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    }
    
    initialFetch()

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      refresh()
    }, 15000)

    return () => clearInterval(interval)
  }, [refresh])

  // Check archive eligibility when jobs change
  useEffect(() => {
    if (!loading) {
      checkArchiveEligibility()
    }
  }, [checkArchiveEligibility, loading])


  const handleJobAction = async (action: string, jobId: string) => {
    try {
      if (action === "cancel") {
        await apiClient.cancelJob(jobId)
        toast.success("Job cancelled successfully")
      } else if (action === "retry") {
        await apiClient.retryJob(jobId)
        toast.success("Job queued for retry")
      }
      await refresh()
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
      const result = await apiClient.archiveCompletedJobs()
      
      if (result.success) {
        const countMessage = result.archivedCount && result.archivedCount > 0 
          ? ` (${result.archivedCount} job${result.archivedCount === 1 ? '' : 's'} archived)`
          : ''
        toast.success(`${result.message}${countMessage}`)
        // Refresh the job list after archival
        await refresh()
      } else {
        toast.error(result.message || "Failed to archive jobs")
      }
    } catch (error) {
      console.error("Failed to archive completed jobs:", error)
      toast.error("Archive feature not available - please check server connection")
    } finally {
      setArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const handleArchiveClick = () => {
    if (archiveEligibility?.valid) {
      setShowArchiveDialog(true)
    } else {
      toast.error(archiveEligibility?.message || "No jobs eligible for archiving")
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
              onClick={handleArchiveClick}
              disabled={archiving || !archiveEligibility?.valid}
              className="text-blue-600 hover:text-blue-700 disabled:text-muted-foreground"
            >
              <Archive className={`h-4 w-4 mr-2 ${archiving ? 'animate-pulse' : ''}`} />
              Archive{archiveEligibility?.eligibleJobsCount ? ` (${archiveEligibility.eligibleJobsCount})` : ''}
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Completed Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {archiveEligibility?.eligibleJobsCount} completed job
              {archiveEligibility?.eligibleJobsCount === 1 ? '' : 's'}?
              <br />
              <br />
              Archived jobs will be moved to the archived section and can still be viewed but cannot be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchiveCompleted}
              disabled={archiving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {archiving ? 'Archiving...' : 'Archive Jobs'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RouteGuard>
  )
}