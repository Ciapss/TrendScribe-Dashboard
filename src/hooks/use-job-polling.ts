import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import type { Job } from "@/types/job"

interface UseJobPollingProps {
  jobId: string | null
  enabled?: boolean
  pollInterval?: number
  onSuccess?: (job: Job) => void
  onError?: (error: Error) => void
}

export function useJobPolling({
  jobId,
  enabled = true,
  pollInterval = 2000,
  onSuccess,
  onError
}: UseJobPollingProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const pollJob = useCallback(async () => {
    if (!jobId || !enabled) return

    try {
      setLoading(true)
      const jobData = await apiClient.getJob(jobId)
      setJob(jobData)
      setError(null)

      // Check if job is completed
      if (jobData.status === 'completed' && onSuccess) {
        onSuccess(jobData)
      } else if (jobData.status === 'failed' && onError) {
        onError(new Error(jobData.error || 'Job failed'))
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch job')
      setError(error)
      if (onError) {
        onError(error)
      }
    } finally {
      setLoading(false)
    }
  }, [jobId, enabled, onSuccess, onError])

  useEffect(() => {
    if (!jobId || !enabled) return

    // Initial poll
    pollJob()

    // Set up interval polling for active jobs
    const shouldPoll = (status: string) => 
      status === 'queued' || status === 'processing'

    const interval = setInterval(() => {
      if (job && !shouldPoll(job.status)) {
        clearInterval(interval)
        return
      }
      pollJob()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [jobId, enabled, pollInterval, pollJob, job])

  const cancelJob = useCallback(async () => {
    if (!jobId) return
    
    try {
      await apiClient.cancelJob(jobId)
      // Trigger a refresh to get updated status
      pollJob()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel job')
      setError(error)
      if (onError) {
        onError(error)
      }
    }
  }, [jobId, pollJob, onError])

  return {
    job,
    loading,
    error,
    pollJob,
    cancelJob,
    isActive: job ? job.status === 'queued' || job.status === 'processing' : false,
    isCompleted: job ? job.status === 'completed' : false,
    isFailed: job ? job.status === 'failed' : false
  }
}