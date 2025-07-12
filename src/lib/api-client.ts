import type { BlogPost, GenerationJob, Webhook, APIKey, DashboardStats, WebhookLog, Industry, CustomIndustryCreate, CustomIndustryUpdate, IndustryStats, CategoryMapping, CategoryMappingTest, CustomCategoryMappingCreate } from "@/types"
import type { Job, JobStats } from "@/types/job"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class APIClient {
  private baseURL: string
  private apiKey?: string
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private pendingRequests: Map<string, Promise<unknown>> = new Map()

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL
    
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000)
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token')
    }
    return null
  }

  private cleanupCache() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  private getCacheKey(endpoint: string, options: RequestInit = {}): string {
    const method = options.method || 'GET'
    const body = options.body || ''
    return `${method}:${endpoint}:${body}`
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 30000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    })
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheOptions?: { ttl?: number; skipCache?: boolean }
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, options)
    const isReadOnlyRequest = !options.method || options.method === 'GET'
    const shouldCache = isReadOnlyRequest && !cacheOptions?.skipCache
    const ttl = cacheOptions?.ttl || 30000 // Default 30 seconds
    
    // Check cache for GET requests
    if (shouldCache) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        console.log('Cache hit for:', endpoint)
        return cached
      }
    }
    
    // Check for pending request (deduplication)
    if (shouldCache && this.pendingRequests.has(cacheKey)) {
      console.log('Deduplicating request for:', endpoint)
      return this.pendingRequests.get(cacheKey)! as Promise<T>
    }

    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    
    // Removed timeout - let browser handle natural timeouts

    // Use JWT access token for authentication (prioritize over API key)
    const accessToken = this.getAccessToken()
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    // Log the request for debugging
    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      body: options.body,
      headers,
      cached: false
    })

    const requestPromise = fetch(url, {
      ...options,
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        // Log the error response for debugging
        const errorText = await response.text()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
          // Clear auth tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            
            // Show toast notification
            toast.error('Session expired. Please log in again.', {
              description: 'You have been redirected to the login page.',
              duration: 5000,
            })
            
            // Redirect to login page
            const currentPath = window.location.pathname
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
          }
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Cache successful GET responses
      if (shouldCache) {
        this.setCache(cacheKey, data, ttl)
      }
      
      return data
    }).finally(() => {
      // Clean up pending requests
      if (shouldCache) {
        this.pendingRequests.delete(cacheKey)
      }
    })

    // Store pending request for deduplication
    if (shouldCache) {
      this.pendingRequests.set(cacheKey, requestPromise)
    }

    return requestPromise
  }

  // Method to invalidate cache for specific patterns
  invalidateCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Dashboard & Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.request<{
      total_posts: number
      average_quality_score: number
      posts_this_month: number
      most_active_industry: string
      success_rate: number
      posts_by_industry: Array<{ industry: string; count: number }>
      posts_over_time: Array<{ date: string; count: number }>
    }>('/monitoring/analytics/dashboard', {}, { ttl: 60000 }) // 1 minute cache for dashboard stats
    
    return {
      totalPosts: response.total_posts,
      averageQualityScore: response.average_quality_score,
      postsThisMonth: response.posts_this_month,
      mostActiveIndustry: response.most_active_industry,
      successRate: response.success_rate,
      postsByIndustry: response.posts_by_industry,
      postsOverTime: response.posts_over_time
    }
  }

  // Posts
  async getPosts(params?: {
    page?: number
    limit?: number
    sort?: string
    filter?: string
    search?: string
  }): Promise<{
    posts: BlogPost[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.sort) {
      // Handle both formats: "date-desc" and "date:desc"
      const separator = params.sort.includes(':') ? ':' : '-'
      const [field, order] = params.sort.split(separator)
      searchParams.set('sort_by', field)
      searchParams.set('sort_order', order || 'desc')
    }
    if (params?.filter) searchParams.set('industry', params.filter)
    if (params?.search) searchParams.set('search', params.search)
    
    const url = `/blog-posts${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await this.request<{
      success: boolean
      posts: BlogPost[]
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
      total_count: number
    }>(url)
    
    return {
      posts: response.posts,
      pagination: response.pagination
    }
  }

  async getPost(id: string): Promise<BlogPost> {
    const response = await this.request<{
      success: boolean
      post_id: string
      post: BlogPost
    }>(`/blog-posts/${id}`)
    return response.post
  }

  async deletePost(id: string): Promise<void> {
    await this.request(`/blog-posts/${id}`, { method: 'DELETE' })
  }

  // Generation
  async generatePost(params: {
    language?: string
    blogType?: string
    industry?: string
    topic?: string
    options?: Record<string, unknown>
  }): Promise<{ jobId: string } | { post: BlogPost }> {
    // Determine which endpoint to use based on parameters
    if (params.topic) {
      // Generate from custom topic
      const requestBody = {
        topic: params.topic,
        blog_type: params.blogType || 'informative',
        language: params.language || 'en',
        research_depth: params.options?.enableComprehensiveResearch ? 'deep' : 'moderate'
      }
      
      const response = await this.request('/blog-posts/generate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      
      console.log('Blog post generation response:', response)
      
      const typedResponse = response as { post_id?: string }
      if (!typedResponse.post_id) {
        throw new Error('No post_id returned from API')
      }
      
      return { jobId: typedResponse.post_id }
    } else if (params.industry) {
      // Generate from trending topics
      const requestBody = {
        industry: params.industry,
        blog_type: params.blogType || 'informative',
        language: params.language || 'en',
        research_depth: params.options?.enableComprehensiveResearch ? 'deep' : 'moderate',
        count: 1
      }
      
      const response = await this.request('/blog-posts/from-trends', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      
      console.log('Trend-based generation response:', response)
      
      const typedResponse = response as { request_id?: string }
      if (!typedResponse.request_id) {
        throw new Error('No request_id returned from API')
      }
      
      return { jobId: typedResponse.request_id }
    } else {
      throw new Error('Either topic or industry must be provided')
    }
  }

  async getGenerationStatus(jobId: string): Promise<GenerationJob> {
    return this.request<GenerationJob>(`/blog-posts/${jobId}/status`)
  }

  async cancelGeneration(jobId: string): Promise<void> {
    await this.request(`/blog-posts/${jobId}`, { method: 'DELETE' })
  }

  // Webhooks
  async getWebhooks(params?: {
    page?: number
    limit?: number
    enabled?: boolean
    industry?: string
  }): Promise<Webhook[]> {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.enabled !== undefined) searchParams.set('enabled', params.enabled.toString())
    if (params?.industry) searchParams.set('industry', params.industry)
    
    const url = `/webhooks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await this.request<{
      webhooks: Webhook[]
      total: number
      page: number
      limit: number
      total_pages: number
    }>(url)
    
    return response.webhooks
  }

  async getWebhook(id: string): Promise<Webhook> {
    const response = await this.request<Webhook>(`/webhooks/${id}`)
    return response
  }

  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Webhook> {
    const response = await this.request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook)
    })
    return response
  }

  async updateWebhook(id: string, webhook: Partial<Webhook>): Promise<Webhook> {
    const response = await this.request<Webhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(webhook)
    })
    return response
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request(`/webhooks/${id}`, { method: 'DELETE' })
  }

  async testWebhook(id: string): Promise<{
    success: boolean
    statusCode?: number
    response?: unknown
    error?: string
  }> {
    const response = await this.request<{
      webhook_id: string
      webhook_name: string
      success: boolean
      status_code?: number
      response_time_ms?: number
      error?: string
      timestamp: string
    }>(`/webhooks/${id}/test`, { method: 'POST' })
    
    return {
      success: response.success,
      statusCode: response.status_code,
      error: response.error
    }
  }

  async getWebhookLogs(id: string, params?: {
    page?: number
    limit?: number
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    
    const url = `/webhooks/${id}/logs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await this.request<{
      logs: WebhookLog[]
      total: number
      page: number
      limit: number
      total_pages: number
    }>(url)
    
    return response
  }

  // API Keys
  async getApiKeys(): Promise<APIKey[]> {
    // Return empty array until API keys endpoint is implemented
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createApiKey(_params: {
    name: string
    permissions: APIKey['permissions']
    expiresAt?: Date
  }): Promise<APIKey> {
    throw new Error('API Keys endpoint not implemented')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteApiKey(_id: string): Promise<void> {
    throw new Error('API Keys endpoint not implemented')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async revokeApiKey(_id: string): Promise<void> {
    throw new Error('API Keys endpoint not implemented')
  }

  // Jobs
  async getJobs(params?: {
    status?: string
    jobType?: string
    limit?: number
    skip?: number
  }): Promise<Job[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.jobType) queryParams.append('job_type', params.jobType)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.skip) queryParams.append('skip', params.skip.toString())
    
    const query = queryParams.toString()
    const url = `/jobs${query ? `?${query}&` : '?'}include_archived=false`
    
    // Skip cache entirely for active jobs or when fetching all jobs (which might include active ones)
    const hasActiveStatus = params?.status === 'processing' || params?.status === 'queued'
    const fetchingAllJobs = !params?.status // No status filter = fetching all jobs which might include active ones
    const shouldSkipCache = hasActiveStatus || fetchingAllJobs
    
    const cacheOptions = shouldSkipCache 
      ? { skipCache: true } 
      : { skipCache: true } // Always skip cache for real-time updates
    
    console.log(`Jobs API: ${shouldSkipCache ? 'Skipping cache' : 'Using cache'} for jobs request`, { params, shouldSkipCache })
    const response = await this.request<Job[]>(url, {}, cacheOptions)
    
    // Transform _id to id for each job
    return response.map(job => {
      const jobWithId = job as Job & { _id?: string }
      return {
      ...job,
      id: jobWithId._id || job.id,
      // Convert date strings to Date objects - handle ISO strings with timezone properly
      created_at: job.created_at ? new Date(job.created_at) : new Date(),
      updated_at: job.updated_at ? new Date(job.updated_at) : new Date(),
      queued_at: job.queued_at ? new Date(job.queued_at) : new Date(),
      started_at: job.started_at ? new Date(job.started_at) : undefined,
      completed_at: job.completed_at ? new Date(job.completed_at) : undefined,
    }})
  }

  async getJob(jobId: string): Promise<Job> {
    const job = await this.request<Job>(`/jobs/${jobId}`, {}, { skipCache: true }) // No cache for individual jobs
    
    // Transform _id to id
    const jobWithId = job as Job & { _id?: string }
    return {
      ...job,
      id: jobWithId._id || job.id,
      // Convert date strings to Date objects - handle ISO strings with timezone properly
      created_at: job.created_at ? new Date(job.created_at) : new Date(),
      updated_at: job.updated_at ? new Date(job.updated_at) : new Date(),
      queued_at: job.queued_at ? new Date(job.queued_at) : new Date(),
      started_at: job.started_at ? new Date(job.started_at) : undefined,
      completed_at: job.completed_at ? new Date(job.completed_at) : undefined,
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      throw new Error(`Invalid job ID: ${jobId}`)
    }
    await this.request(`/jobs/${jobId}/cancel`, { method: 'POST' })
    // Invalidate job-related caches
    this.invalidateCache('/jobs')
  }

  async retryJob(jobId: string): Promise<void> {
    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      throw new Error(`Invalid job ID: ${jobId}`)
    }
    await this.request(`/jobs/${jobId}/retry`, { method: 'POST' })
    // Invalidate job-related caches
    this.invalidateCache('/jobs')
  }

  async getJobStats(): Promise<JobStats> {
    return this.request<JobStats>('/jobs/stats/summary', {}, { ttl: 10000 }) // 10 second cache for stats
  }

  async cleanupCancelledJobs(): Promise<{ success: boolean; message: string }> {
    const result = await this.request<{ success: boolean; message: string }>('/jobs/cleanup/cancelled', { method: 'POST' })
    // Invalidate job-related caches
    this.invalidateCache('/jobs')
    return result
  }

  async archiveCompletedJobs(days: number = 7): Promise<{ success: boolean; message: string }> {
    const result = await this.request<{ success: boolean; message: string }>(`/jobs/archive?days=${days}`, { method: 'POST' })
    // Invalidate job-related caches
    this.invalidateCache('/jobs')
    return result
  }

  async getArchivedJobs(params?: {
    status?: string
    jobType?: string
    limit?: number
    skip?: number
  }): Promise<Job[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.jobType) queryParams.append('job_type', params.jobType)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.skip) queryParams.append('skip', params.skip.toString())
    
    const query = queryParams.toString()
    const response = await this.request<Job[]>(`/jobs/archived${query ? `?${query}` : ''}`)
    
    // Transform _id to id for each job
    return response.map(job => {
      const jobWithId = job as Job & { _id?: string }
      return {
      ...job,
      id: jobWithId._id || job.id,
      // Convert date strings to Date objects
      created_at: new Date(job.created_at),
      updated_at: new Date(job.updated_at),
      queued_at: new Date(job.queued_at),
      started_at: job.started_at ? new Date(job.started_at) : undefined,
      completed_at: job.completed_at ? new Date(job.completed_at) : undefined,
    }})
  }

  // Cost tracking
  async getCosts(): Promise<{
    total_cost: number
    daily_cost: number
    monthly_cost: number
    cost_breakdown: Record<string, number>
    request_count: number
    last_reset: string
  }> {
    return this.request('/monitoring/costs', {}, { ttl: 15000 }) // 15 second cache for costs
  }

  async getDetailedCosts(): Promise<{
    today: {
      total_usd: number
      gemini_usd: number
      linkup_eur: number
      services: Record<string, {
        cost: number
        currency: string
        currency_symbol: string
        cost_usd: number
        requests: number
        avg_cost_per_request: number
      }>
    }
    exchange_rate: {
      eur_to_usd: number
      last_updated: string
      source: string
    }
    weekly_summary: {
      total_cost_usd: number
      total_requests: number
      avg_daily_cost_usd: number
    }
  }> {
    return this.request('/monitoring/costs/detailed', {}, { ttl: 15000 }) // 15 second cache for detailed costs
  }

  async getMonthlyCosts(): Promise<{
    month: number
    year: number
    days_in_month: number
    current_day: number
    monthly_totals: {
      total_usd: number
      total_requests: number
      services: Record<string, {
        cost_usd: number
        requests: number
      }>
      avg_daily_usd: number
      projected_month_usd: number
    }
    daily_breakdown: Array<{
      date: string
      day: number
      total_usd: number
      total_requests: number
      services: Record<string, {
        cost: number
        cost_usd: number
        requests: number
      }>
      is_future: boolean
    }>
  }> {
    return this.request('/monitoring/costs/monthly', {}, { ttl: 30000 }) // 30 second cache for monthly costs
  }

  // Authentication
  async login(email: string, password: string): Promise<{
    access_token: string
    refresh_token: string
    token_type: string
    user: {
      id: string
      email: string
      username: string
      role: string
      is_active: boolean
      is_verified: boolean
    }
  }> {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    return this.request('/auth/login', {
      method: 'POST',
      body: formData,
    }, { skipCache: true })
  }

  async register(email: string, username: string, password: string): Promise<{
    user: {
      id: string
      email: string
      username: string
      role: string
      is_active: boolean
      is_verified: boolean
    }
  }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    }, { skipCache: true })
  }

  async refreshToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string
    token_type: string
  }> {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    }, { skipCache: true })
  }

  async getCurrentUser(): Promise<{
    id: string
    email: string
    username: string
    role: string
    is_active: boolean
    is_verified: boolean
    created_at: string
    updated_at: string
  }> {
    return this.request('/auth/me', {}, { skipCache: true })
  }

  // User Management (Admin only)
  async getUsers(): Promise<Array<{
    id: string
    email: string
    username: string
    role: 'admin' | 'user' | 'api_user'
    is_active: boolean
    is_verified: boolean
    created_at: string
    updated_at: string
  }>> {
    return this.request('/users', {}, { skipCache: true })
  }

  async createUser(userData: {
    email: string
    username: string
    password: string
    role: 'admin' | 'user' | 'api_user'
  }): Promise<{
    id: string
    email: string
    username: string
    role: string
    is_active: boolean
    is_verified: boolean
  }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, { skipCache: true })
  }

  async updateUser(userId: string, userData: {
    email?: string
    username?: string
    role?: 'admin' | 'user' | 'api_user'
    is_active?: boolean
  }): Promise<{
    id: string
    email: string
    username: string
    role: string
    is_active: boolean
    is_verified: boolean
  }> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }, { skipCache: true })
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, {
      method: 'DELETE',
    }, { skipCache: true })
  }

  // Trends
  async getTrends(params?: {
    page?: number
    limit?: number
    industry?: string
    minScore?: number
    maxScore?: number
    status?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
    search?: string
    discoveredAfter?: string
  }): Promise<{
    success: boolean
    trends: Array<{
      id: string
      topic: string
      industry: string
      description: string
      trend_score: number
      status: string
      keywords: string[]
      discovered_at: string
      sources: Array<{
        platform: string
        url: string
        title: string
        engagement_score: number
        mentions: number
      }>
      metrics: {
        search_volume: number
        trend_velocity: number
        engagement_rate: number
        sentiment_score: number
      }
      selected_for_generation?: boolean
    }>
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    filters_applied?: Record<string, string | number | boolean>
  }> {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.industry) searchParams.set('industry', params.industry)
    if (params?.minScore !== undefined) searchParams.set('min_score', params.minScore.toString())
    if (params?.maxScore !== undefined) searchParams.set('max_score', params.maxScore.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.sortBy) searchParams.set('sort_by', params.sortBy)
    if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.discoveredAfter) searchParams.set('discovered_after', params.discoveredAfter)
    
    const url = `/trends${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<{
      success: boolean
      trends: Array<{
        id: string
        topic: string
        industry: string
        description: string
        trend_score: number
        status: string
        keywords: string[]
        discovered_at: string
        sources: Array<{
          platform: string
          url: string
          title: string
          engagement_score: number
          mentions: number
        }>
        metrics: {
          search_volume: number
          trend_velocity: number
          engagement_rate: number
          sentiment_score: number
        }
        selected_for_generation?: boolean
      }>
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
      filters_applied?: Record<string, string | number | boolean>
    }>(url, {}, { skipCache: true }) // Don't cache trends as they change frequently
  }

  async discoverTrends(params: {
    industry: string
    limit?: number
  }): Promise<{
    success: boolean
    message: string
    trends: Array<{
      id: string
      topic: string
      industry: string
      description: string
      trend_score: number
      status: string
      keywords: string[]
      discovered_at: string
      sources: Array<{
        platform: string
        url: string
        title: string
        engagement_score: number
        mentions: number
      }>
      metrics: {
        search_volume: number
        trend_velocity: number
        engagement_rate: number
        sentiment_score: number
      }
    }>
    industry: string
    discovered_count: number
  }> {
    const searchParams = new URLSearchParams()
    searchParams.set('industry', params.industry)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    
    const url = `/trends/discover?${searchParams.toString()}`
    return this.request(url, {
      method: 'POST'
    }, { skipCache: true }) // Never cache discovery requests
  }

  async discoverTrendsAsync(params: {
    industry: string
    limit?: number
  }): Promise<{
    success: boolean
    message: string
    job_id: string
    industry: string
  }> {
    const searchParams = new URLSearchParams()
    searchParams.set('industry', params.industry)
    searchParams.set('async', 'true') // Request async processing
    if (params.limit) searchParams.set('limit', params.limit.toString())
    
    const url = `/trends/discover?${searchParams.toString()}`
    return this.request(url, {
      method: 'POST'
    }, { skipCache: true }) // Never cache discovery requests
  }

  async selectTrends(params: {
    trend_ids: string[]
  }): Promise<{
    success: boolean
    selected_trends: Array<{
      id: string
      topic: string
      industry: string
      description: string
      trend_score: number
      status: string
      selected_for_generation: boolean
      selection_timestamp: string
      selected_by: string
    }>
    selection_timestamp: string
    selected_by: string
  }> {
    return this.request('/trends/select', {
      method: 'POST',
      body: JSON.stringify(params),
    }, { skipCache: true })
  }

  async deselectTrend(trendId: string): Promise<{
    success: boolean
    message: string
    trend_id: string
  }> {
    return this.request(`/trends/${trendId}/deselect`, {
      method: 'POST'
    }, { skipCache: true })
  }

  async generateFromSelectedTrends(params: {
    language?: string
    blogType?: string
    researchDepth?: string
    selectedTrendIds: string[]
    industry?: string
  }): Promise<{ jobId: string }> {
    // Use the correct endpoint for selected trends
    const requestBody = {
      selected_trend_ids: params.selectedTrendIds,
      blog_type: params.blogType || 'informative',
      language: params.language || 'en',
      research_depth: params.researchDepth || 'moderate',
    }
    
    console.log('Calling /blog-posts/from-selected-trends with:', requestBody)
    
    const response = await this.request('/blog-posts/from-selected-trends', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
    
    const typedResponse = response as { request_id?: string; job_id?: string }
    const jobId = typedResponse.request_id || typedResponse.job_id
    if (!jobId) {
      throw new Error('No job ID returned from API')
    }
    
    return { jobId }
  }

  // Blog Publishing Functions
  async publishPostToWebsite(postId: string): Promise<{success: boolean; message: string}> {
    if (!postId || postId === 'undefined' || postId === 'null') {
      throw new Error(`Invalid post ID: ${postId}`)
    }

    return this.request<{success: boolean; message: string}>(`/blog-posts/${postId}/publish`, {
      method: 'POST',
    }, { skipCache: true })
  }

  // Industry Management
  async getIndustries(): Promise<Industry[]> {
    const response = await this.request<{
      industries: {
        built_in: Record<string, Industry>
        custom: Record<string, Industry>
      }
      total_count: number
      built_in_count: number
      custom_count: number
    }>('/industries', {}, { ttl: 60000 }) // Cache for 1 minute
    
    // Convert the nested object structure to a flat array
    const allIndustries: Industry[] = []
    
    // Add built-in industries
    for (const industry of Object.values(response.industries.built_in)) {
      allIndustries.push({
        ...industry,
        is_built_in: true,
        is_custom: false
      })
    }
    
    // Add custom industries
    for (const industry of Object.values(response.industries.custom)) {
      allIndustries.push({
        ...industry,
        is_built_in: false,
        is_custom: true
      })
    }
    
    return allIndustries
  }

  async getIndustryNames(): Promise<Record<string, string>> {
    return this.request('/industries/names', {}, { ttl: 300000 }) // Cache for 5 minutes
  }

  async getCustomIndustries(): Promise<Industry[]> {
    return this.request('/industries/custom', {}, { ttl: 30000 }) // Cache for 30 seconds
  }

  async createCustomIndustry(industryData: CustomIndustryCreate): Promise<Industry> {
    const response = await this.request<{
      success: boolean
      industry: Industry
      message: string
    }>('/industries/custom', {
      method: 'POST',
      body: JSON.stringify(industryData),
    }, { skipCache: true })
    
    // Invalidate industry-related caches
    this.invalidateCache('/industries')
    return {
      ...response.industry,
      is_built_in: false,
      is_custom: true
    }
  }

  async updateCustomIndustry(industryId: string, updateData: CustomIndustryUpdate): Promise<Industry> {
    const response = await this.request<{
      success: boolean
      industry: Industry
      message: string
    }>(`/industries/custom/${industryId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, { skipCache: true })
    
    // Invalidate industry-related caches
    this.invalidateCache('/industries')
    return {
      ...response.industry,
      is_built_in: false,
      is_custom: true
    }
  }

  async deleteCustomIndustry(industryId: string): Promise<void> {
    await this.request(`/industries/custom/${industryId}`, {
      method: 'DELETE',
    }, { skipCache: true })
    
    // Invalidate industry-related caches
    this.invalidateCache('/industries')
  }

  async getIndustryStats(): Promise<IndustryStats> {
    const response = await this.request<{
      industries: {
        total: number
        built_in: number
        custom: number
      }
      mappings: {
        total_mappings: number
        custom_mappings: number
        ai_mappings: number
        cache_hit_rate: number
        most_used_industry?: string
      }
    }>('/industries/stats', {}, { ttl: 60000 }) // Cache for 1 minute
    
    // Convert to the expected format
    return {
      total_industries: response.industries.total,
      built_in_count: response.industries.built_in,
      custom_count: response.industries.custom,
      most_used_industry: response.mappings.most_used_industry || 'N/A',
      total_mappings: response.mappings.total_mappings,
      custom_mappings: response.mappings.custom_mappings,
      ai_mappings: response.mappings.ai_mappings,
      cache_hit_rate: response.mappings.cache_hit_rate
    }
  }

  async addCustomCategoryMapping(mappingData: CustomCategoryMappingCreate): Promise<{
    success: boolean
    mapping: CategoryMapping
  }> {
    const response = await this.request<{
      success: boolean
      message: string
    }>('/industries/mappings/custom', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    }, { skipCache: true })
    
    return {
      success: response.success,
      mapping: {
        category: mappingData.category,
        industries: mappingData.industries,
        created_at: new Date().toISOString()
      }
    }
  }

  async getCustomCategoryMappings(): Promise<CategoryMapping[]> {
    const response = await this.request<Record<string, string[]>>('/industries/mappings/custom', {}, { ttl: 30000 })
    
    // Convert object to array format
    return Object.entries(response).map(([category, industries]) => ({
      category,
      industries,
      created_at: new Date().toISOString() // Backend doesn't provide timestamps yet
    }))
  }

  async testCategoryMapping(category: string): Promise<CategoryMappingTest> {
    const response = await this.request<{
      categories: string[]
      mapped_industries: string[]
      mapping_count: number
    }>('/industries/mappings/test', {
      method: 'POST',
      body: JSON.stringify([category]), // Backend expects array
    }, { skipCache: true })
    
    return {
      category,
      mapped_industries: response.mapped_industries,
      method: 'ai', // Backend doesn't specify method yet
      confidence: 1.0 // Backend doesn't provide confidence yet
    }
  }

  // User Subreddit Management
  async getUserSubreddits(enabledOnly: boolean = false): Promise<Array<{
    id: string
    subreddit_name: string
    industry: string
    enabled: boolean
    is_custom: boolean
    max_posts: number
    min_upvotes: number
    min_comments: number
    include_keywords: string[]
    exclude_keywords: string[]
    trends_discovered: number
    avg_trend_score: number
    subreddit_title?: string
    subreddit_description?: string
    subscriber_count?: number
  }>> {
    const url = enabledOnly ? '/user/sources/subreddits' : '/user/sources/subreddits?enabled_only=false'
    return this.request(url, {}, { skipCache: true })
  }

  async addUserSubreddit(subredditData: {
    subreddit_name: string
    industry: string
    enabled?: boolean
    is_custom?: boolean
    max_posts?: number
    min_upvotes?: number
    min_comments?: number
    include_keywords?: string[]
    exclude_keywords?: string[]
  }): Promise<{
    id: string
    subreddit_name: string
    industry: string
    enabled: boolean
    is_custom: boolean
  }> {
    try {
      return this.request('/user/sources/subreddits', {
        method: 'POST',
        body: JSON.stringify(subredditData),
      }, { skipCache: true })
    } catch (error) {
      console.error('Error in addUserSubreddit:', error)
      throw error
    }
  }

  async updateUserSubreddit(subredditId: string, updateData: {
    enabled?: boolean
    max_posts?: number
    min_upvotes?: number
    min_comments?: number
    include_keywords?: string[]
    exclude_keywords?: string[]
  }): Promise<{
    id: string
    subreddit_name: string
    industry: string
    enabled: boolean
    is_custom: boolean
  }> {
    return this.request(`/user/sources/subreddits/${subredditId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, { skipCache: true })
  }

  async deleteUserSubreddit(subredditId: string): Promise<void> {
    await this.request(`/user/sources/subreddits/${subredditId}`, {
      method: 'DELETE',
    }, { skipCache: true })
  }

  async bulkUpdateSubreddits(updates: Array<{
    subreddit_id: string
    enabled: boolean
  }>): Promise<{
    success: boolean
    updated_count: number
  }> {
    return this.request('/user/sources/subreddits/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }, { skipCache: true })
  }

  async initializeUserSubreddits(industries: string[]): Promise<{
    success: boolean
    message: string
    initialized_count: number
  }> {
    return this.request('/user/sources/initialize', {
      method: 'POST',
      body: JSON.stringify({ industries }),
    }, { skipCache: true })
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export default apiClient