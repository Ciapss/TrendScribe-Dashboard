interface DiscoveryJob {
  jobId: string
  industry: string
  startedAt: number
  status: 'active' | 'completed' | 'failed' | 'cancelled'
}

const STORAGE_KEY = 'trendscribe_discovery_jobs'
const MAX_AGE_MS = 2 * 60 * 60 * 1000 // 2 hours

export class DiscoveryJobStorage {
  static getActiveJobs(): DiscoveryJob[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const jobs: DiscoveryJob[] = JSON.parse(stored)
      const now = Date.now()
      
      // Filter out old jobs (cleanup)
      const activeJobs = jobs.filter(job => 
        job.status === 'active' && (now - job.startedAt) < MAX_AGE_MS
      )
      
      // Update storage if we filtered out old jobs
      if (activeJobs.length !== jobs.length) {
        this.setJobs(activeJobs)
      }
      
      return activeJobs
    } catch (error) {
      console.error('Failed to parse discovery jobs from localStorage:', error)
      return []
    }
  }

  static getActiveJobForIndustry(industry: string): DiscoveryJob | null {
    const activeJobs = this.getActiveJobs()
    return activeJobs.find(job => job.industry === industry && job.status === 'active') || null
  }

  static addJob(jobId: string, industry: string): void {
    if (typeof window === 'undefined') return
    
    const jobs = this.getActiveJobs()
    const newJob: DiscoveryJob = {
      jobId,
      industry,
      startedAt: Date.now(),
      status: 'active'
    }
    
    // Remove any existing job for this industry
    const filteredJobs = jobs.filter(job => job.industry !== industry)
    filteredJobs.push(newJob)
    
    this.setJobs(filteredJobs)
  }

  static updateJobStatus(jobId: string, status: DiscoveryJob['status']): void {
    if (typeof window === 'undefined') return
    
    const jobs = this.getActiveJobs()
    const jobIndex = jobs.findIndex(job => job.jobId === jobId)
    
    if (jobIndex !== -1) {
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        // Remove completed/failed/cancelled jobs
        jobs.splice(jobIndex, 1)
      } else {
        jobs[jobIndex].status = status
      }
      this.setJobs(jobs)
    }
  }

  static removeJob(jobId: string): void {
    if (typeof window === 'undefined') return
    
    const jobs = this.getActiveJobs()
    const filteredJobs = jobs.filter(job => job.jobId !== jobId)
    this.setJobs(filteredJobs)
  }

  static clearAllJobs(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  static debugInfo(): void {
    if (typeof window === 'undefined') return
    
    const jobs = this.getActiveJobs()
    console.log('📋 Discovery Job Storage Debug:', {
      totalJobs: jobs.length,
      jobs: jobs,
      rawStorage: localStorage.getItem(STORAGE_KEY)
    })
  }

  private static setJobs(jobs: DiscoveryJob[]): void {
    if (typeof window === 'undefined') return
    
    try {
      if (jobs.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
      }
    } catch (error) {
      console.error('Failed to save discovery jobs to localStorage:', error)
    }
  }
}