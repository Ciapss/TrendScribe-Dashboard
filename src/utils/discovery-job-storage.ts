interface DiscoveryJob {
  jobId: string
  industry: string
  startedAt: number
  status: 'active' | 'completed' | 'failed' | 'cancelled'
}

const STORAGE_KEY = 'trendscribe_discovery_jobs'
const MAX_AGE_HOURS = 2 // 2 hours - appropriate for discovery jobs

// Utility functions consistent with main job age management
function calculateAgeInHours(startedAt: number): number {
  const now = Date.now()
  const diffTime = Math.abs(now - startedAt)
  return Math.floor(diffTime / (1000 * 60 * 60))
}

function calculateAgeInDays(startedAt: number): number {
  const now = Date.now()
  const diffTime = Math.abs(now - startedAt)
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export class DiscoveryJobStorage {
  static getActiveJobs(): DiscoveryJob[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const jobs: DiscoveryJob[] = JSON.parse(stored)
      
      // Filter out old jobs using consistent age calculation
      const activeJobs = jobs.filter(job => {
        if (job.status !== 'active') return false
        const ageInHours = calculateAgeInHours(job.startedAt)
        return ageInHours < MAX_AGE_HOURS
      })
      
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

  static getJobAge(job: DiscoveryJob): { hours: number; days: number } {
    return {
      hours: calculateAgeInHours(job.startedAt),
      days: calculateAgeInDays(job.startedAt)
    }
  }

  static isJobExpired(job: DiscoveryJob): boolean {
    const ageInHours = calculateAgeInHours(job.startedAt)
    return ageInHours >= MAX_AGE_HOURS
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
    const jobsWithAge = jobs.map(job => ({
      ...job,
      age: this.getJobAge(job),
      isExpired: this.isJobExpired(job)
    }))
    
    console.log('📋 Discovery Job Storage Debug:', {
      totalJobs: jobs.length,
      maxAgeHours: MAX_AGE_HOURS,
      jobs: jobsWithAge,
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