"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useJobs } from "@/contexts/JobContext"
import { useGlobalJobPolling } from "@/hooks/useGlobalJobPolling"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JobList } from "@/components/jobs/job-list"
import { JobStats } from "@/components/jobs/job-stats"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Trash2, Archive } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { JobStats as JobStatsType, Job } from "@/types/job"
import { toast } from "sonner"
import { FadeIn } from "@/components/ui/page-transition"
import { RouteGuard } from "@/components/auth/route-guard"
import { pollingService } from "@/lib/polling-service"

export default function JobsPage() {
  const { state: { jobs, error, loading, initialLoaded } } = useJobs()
  useGlobalJobPolling() // Start global polling
  
  // State for archived jobs (fetched separately)
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([])
  
  const [cleaningUp, setCleaningUp] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const searchParams = useSearchParams()
  const highlightJobId = searchParams.get('highlight')
  
  // Function to fetch archived jobs
  const fetchArchivedJobs = useCallback(async () => {
    try {
      const archivedJobsData = await apiClient.getArchivedJobs({ limit: 50 })
      setArchivedJobs(archivedJobsData)
    } catch (error) {
      console.error('❌ Failed to fetch archived jobs:', error)
    }
  }, [])

  // Fetch archived jobs on component mount
  useEffect(() => {
    fetchArchivedJobs()
  }, [fetchArchivedJobs])

  // Active jobs are the jobs from the polling service (backend now handles filtering)
  const activeJobs = jobs
  




  // Polling service handles all data fetching automatically


  const handleJobAction = async (action: string, jobId: string) => {
    try {
      if (action === "cancel") {
        await apiClient.cancelJob(jobId)
        toast.success("Job cancelled successfully")
      } else if (action === "retry") {
        await apiClient.retryJob(jobId)
        toast.success("Job queued for retry")
      }
      
      // Trigger immediate refresh after action
      pollingService.triggerManualRefresh()
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
      
      // Trigger immediate refresh after cleanup
      pollingService.triggerManualRefresh()
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
        const countMessage = result.archivedCount ? ` (${result.archivedCount} job${result.archivedCount === 1 ? '' : 's'} archived)` : ''
        toast.success(`${result.message}${countMessage}`)
        
        // Trigger immediate refresh
        pollingService.triggerManualRefresh()
        
        // Also refresh archived jobs to show newly archived items
        await fetchArchivedJobs()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Failed to archive completed jobs:", error)
      toast.error("Failed to archive jobs")
    } finally {
      setArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const handleArchiveClick = () => {
    if (calculatedArchiveEligibility.valid) {
      setShowArchiveDialog(true)
    } else {
      toast.error(calculatedArchiveEligibility.message)
    }
  }

  const hasCancelledJobs = activeJobs.some(job => job.status === "cancelled")
  const hasCompletedJobs = activeJobs.some(job => job.status === "completed")

  // Calculate stats directly from jobs data (no need to wait for separate API call)
  const calculatedStats: JobStatsType = {
    total_jobs: activeJobs.length,
    queue_size: activeJobs.filter(job => job.status === "queued").length,
    processing: activeJobs.filter(job => job.status === "processing").length,
    by_status: {
      queued: { count: activeJobs.filter(job => job.status === "queued").length },
      processing: { count: activeJobs.filter(job => job.status === "processing").length },
      completed: { count: activeJobs.filter(job => job.status === "completed").length },
      failed: { count: activeJobs.filter(job => job.status === "failed").length },
      cancelled: { count: activeJobs.filter(job => job.status === "cancelled").length },
    },
    by_type: activeJobs.reduce((acc, job) => {
      const type = job.job_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  }

  // Calculate archive eligibility directly from jobs data
  const completedJobs = activeJobs.filter(job => job.status === "completed")
  const calculatedArchiveEligibility = {
    valid: completedJobs.length > 0,
    eligibleJobsCount: completedJobs.length,
    message: completedJobs.length > 0 
      ? `${completedJobs.length} job${completedJobs.length === 1 ? '' : 's'} ready to archive`
      : "No completed jobs available for archiving"
  }

  // Show error message if there's an error and we're not loading
  const showError = error && !loading && activeJobs.length === 0;

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
              disabled={archiving || !calculatedArchiveEligibility.valid}
              className="text-blue-600 hover:text-blue-700 disabled:text-muted-foreground"
            >
              <Archive className={`h-4 w-4 mr-2 ${archiving ? 'animate-pulse' : ''}`} />
              Archive ({calculatedArchiveEligibility.eligibleJobsCount})
            </Button>
          )}
        </div>
      </div>

      {/* Show loading skeleton when initially loading */}
      {loading && !initialLoaded && (
        <div className="space-y-6">
          {/* Stats Loading Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Jobs Table Loading Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show error state */}
      {showError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">Failed to load jobs data</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show content when data is loaded */}
      {!loading && (
        <FadeIn delay={0.1}>
          <JobStats stats={calculatedStats} />
        </FadeIn>
      )}

      {!loading && (
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
                tabType="active"
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
                tabType="archived"
              />
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
        </FadeIn>
      )}
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Completed Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {calculatedArchiveEligibility.eligibleJobsCount} completed job
              {calculatedArchiveEligibility.eligibleJobsCount === 1 ? '' : 's'}?
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