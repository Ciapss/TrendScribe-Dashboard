import type { BlogPost, GenerationJob, Webhook, APIKey, DashboardStats, WebhookLog, Industry, CustomIndustryCreate, CustomIndustryUpdate, IndustryStats, CategoryMapping, CategoryMappingTest, CustomCategoryMappingCreate } from "@/types"
import type { Job, JobStats } from "@/types/job"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

// Generate fallback URLs based on environment
function getAPIFallbackUrls(primaryUrl: string): string[] {
  const fallbacks: string[] = []
  
  // Only add localhost variants if we're in development (localhost/127.0.0.1)
  if (primaryUrl.includes('localhost') || primaryUrl.includes('127.0.0.1') || primaryUrl.includes('[::1]')) {
    try {
      const url = new URL(primaryUrl)
      const port = url.port || '8000' // Default to 8000 if no port specified
      const pathname = url.pathname
      
      // Try different localhost variants with the same port and path
      fallbacks.push(
        `http://127.0.0.1:${port}${pathname}`,
        `http://localhost:${port}${pathname}`,
        `http://[::1]:${port}${pathname}`
      )
    } catch (error) {
      console.warn('Failed to parse primary URL for fallbacks:', primaryUrl, error)
    }
  }
  
  return fallbacks.filter(url => url !== primaryUrl)
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class APIClient {
  private baseURL: string
  private apiKey?: string
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private pendingRequests: Map<string, { promise: Promise<unknown>; timestamp: number; abortController: AbortController }> = new Map()
  private failureCounts: Map<string, { count: number; lastFailure: number }> = new Map()
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private circuitBreakerFailures = 0
  private circuitBreakerLastFailure = 0
  private readonly circuitBreakerThreshold = 8 // Open circuit after 8 failures
  private readonly circuitBreakerTimeout = 30000 // Keep circuit open for 30 seconds

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL
    
    // Clean up expired cache entries and stale pending requests every 30 seconds
    setInterval(() => {
      this.cleanupCache()
      this.cleanupPendingRequests()
      this.cleanupFailureCounts()
    }, 30 * 1000)
    
    // Reset circuit breaker on fresh page load if it's been more than 5 minutes
    const lastFailureAge = Date.now() - this.circuitBreakerLastFailure
    if (this.circuitBreakerState === 'OPEN' && lastFailureAge > 300000) { // 5 minutes
      console.log('🔄 Circuit breaker: Resetting on fresh page load (old failure)')
      this.resetErrorState()
    }
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

  private async makeXHRRequest(url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      
      // Set headers
      xhr.setRequestHeader('Content-Type', 'application/json')
      const accessToken = this.getAccessToken()
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
      } else if (this.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`)
      }
      
      xhr.timeout = 10000 // 10 second timeout
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error}`))
          }
        } else {
          reject(new Error(`XHR request failed: ${xhr.status} ${xhr.statusText}`))
        }
      }
      
      xhr.onerror = () => {
        reject(new Error('XHR request failed due to network error'))
      }
      
      xhr.ontimeout = () => {
        reject(new Error('XHR request timed out'))
      }
      
      console.log(`🌐 XHR: Starting request to ${url}`)
      xhr.send()
    })
  }

  private cleanupCache() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  private cleanupPendingRequests() {
    const now = Date.now()
    const maxAge = 30000 // 30 seconds max age for pending requests
    let cleanedCount = 0
    
    for (const [key, entry] of this.pendingRequests.entries()) {
      if (now - entry.timestamp > maxAge) {
        console.warn(`🧹 Cleaning up stale pending request: ${key} (age: ${now - entry.timestamp}ms)`)
        // Abort the stale request
        try {
          entry.abortController.abort()
        } catch (error) {
          console.warn('Error aborting stale request:', error)
        }
        this.pendingRequests.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale pending requests. Active requests: ${this.pendingRequests.size}`)
    }
    
    // Warn if too many pending requests
    if (this.pendingRequests.size > 10) {
      console.warn(`⚠️ High number of pending requests: ${this.pendingRequests.size}. This may indicate a problem.`)
    }
  }

  private cleanupFailureCounts() {
    const now = Date.now()
    const maxAge = 300000 // 5 minutes
    let cleanedCount = 0
    
    for (const [key, entry] of this.failureCounts.entries()) {
      if (now - entry.lastFailure > maxAge) {
        this.failureCounts.delete(key)
        cleanedCount++
      }
    }
    
    // Auto-reset circuit breaker if it's been open for more than 2 minutes
    if (this.circuitBreakerState === 'OPEN' && now - this.circuitBreakerLastFailure > 120000) {
      console.log('🔄 Circuit breaker: Auto-resetting after 2 minutes open')
      this.circuitBreakerState = 'CLOSED'
      this.circuitBreakerFailures = 0
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old failure counts`)
    }
  }

  private updateCircuitBreaker(isSuccess: boolean) {
    const now = Date.now()
    
    if (isSuccess) {
      // Reset circuit breaker on success
      if (this.circuitBreakerState === 'HALF_OPEN') {
        console.log('✅ Circuit breaker: Request succeeded, closing circuit')
        this.circuitBreakerState = 'CLOSED'
        this.circuitBreakerFailures = 0
      }
    } else {
      this.circuitBreakerFailures++
      this.circuitBreakerLastFailure = now
      
      if (this.circuitBreakerState === 'CLOSED' && this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
        console.warn(`🚫 Circuit breaker: Opening circuit after ${this.circuitBreakerFailures} consecutive failures`)
        this.circuitBreakerState = 'OPEN'
      } else if (this.circuitBreakerState === 'HALF_OPEN') {
        console.warn(`🚫 Circuit breaker: Request failed in half-open state, reopening circuit`)
        this.circuitBreakerState = 'OPEN'
        this.circuitBreakerLastFailure = now
      }
    }
    
    // Note: Half-open state transition is handled in isCircuitOpen() method
  }

  private isCircuitOpen(): boolean {
    // Check if we should move to half-open state based on time
    const now = Date.now()
    if (this.circuitBreakerState === 'OPEN' && now - this.circuitBreakerLastFailure > this.circuitBreakerTimeout) {
      console.log('🔄 Circuit breaker: Moving to half-open state (timeout expired)')
      this.circuitBreakerState = 'HALF_OPEN'
    }
    
    return this.circuitBreakerState === 'OPEN'
  }

  private shouldBackoff(endpoint: string): boolean {
    // Check circuit breaker first
    if (this.isCircuitOpen()) {
      console.log('🚫 Circuit breaker is OPEN, blocking all requests')
      return true
    }
    
    const failure = this.failureCounts.get(endpoint)
    if (!failure) return false
    
    // Don't backoff on first few failures for polling endpoints
    const isPollingEndpoint = endpoint.includes('/jobs') || endpoint.includes('/stats')
    const minFailuresForBackoff = isPollingEndpoint ? 5 : 3 // Even more lenient
    
    if (failure.count < minFailuresForBackoff) {
      return false
    }
    
    const now = Date.now()
    // More reasonable backoff times: 2s, 4s, 8s, 16s, max 30s
    const baseDelay = isPollingEndpoint ? 2000 : 1000
    const maxDelay = isPollingEndpoint ? 30000 : 60000
    const backoffTime = Math.min(maxDelay, baseDelay * Math.pow(2, failure.count - minFailuresForBackoff))
    const shouldWait = now - failure.lastFailure < backoffTime
    
    if (shouldWait) {
      console.log(`⏳ Exponential backoff for ${endpoint}: waiting ${backoffTime}ms (attempt ${failure.count})`)
    }
    
    return shouldWait
  }

  private recordFailure(endpoint: string, errorMessage?: string) {
    // Don't count network timeouts or connection issues as backoff-worthy failures
    const isTemporaryFailure = errorMessage && (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Connection')
    )
    
    if (isTemporaryFailure) {
      console.log(`🌐 Temporary network issue for ${endpoint}, not counting for backoff: ${errorMessage}`)
      return
    }
    
    const existing = this.failureCounts.get(endpoint)
    const count = existing ? existing.count + 1 : 1
    this.failureCounts.set(endpoint, {
      count,
      lastFailure: Date.now()
    })
    console.log(`📈 Recorded failure for ${endpoint} (count: ${count})`)
  }

  private recordSuccess(endpoint: string) {
    if (this.failureCounts.has(endpoint)) {
      this.failureCounts.delete(endpoint)
      console.log(`✅ Reset failure count for ${endpoint}`)
    }
    this.updateCircuitBreaker(true)
  }

  private getRequestTimeout(endpoint: string): number {
    // Reduce jobs timeout to prevent long hangs
    if (endpoint.includes('/jobs')) {
      return 30000 // 30 seconds for jobs endpoints (reduced from 60s)
    }
    // Cost monitoring should timeout quickly to not block other requests
    if (endpoint.includes('/monitoring/costs/detailed')) {
      return 15000 // 15 seconds for cost monitoring
    }
    return 30000 // 30 seconds for other requests
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
    // Implement cache size limit to prevent memory bloat
    if (this.cache.size > 1000) {
      // Remove oldest 10% of entries when cache gets too large
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      const toRemove = sortedEntries.slice(0, Math.floor(this.cache.size * 0.1))
      toRemove.forEach(([key]) => this.cache.delete(key))
      console.log(`Cache size limit reached, removed ${toRemove.length} old entries`)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    })
  }

  private getOptimalTTL(endpoint: string, method: string): number {
    // Static data - cache for longer
    if (endpoint.includes('/industries/names') || endpoint.includes('/industries') && method === 'GET') {
      return 300000 // 5 minutes for industry lists
    }
    if (endpoint.includes('/stats') && !endpoint.includes('/jobs')) {
      return 60000 // 1 minute for dashboard stats
    }
    if (endpoint.includes('/costs')) {
      return 15000 // 15 seconds for cost data
    }
    // Dynamic data - shorter cache
    if (endpoint.includes('/jobs') || endpoint.includes('/trends')) {
      return 5000 // 5 seconds for job/trend data
    }
    // Default cache time
    return 30000 // 30 seconds
  }

  private async tryFetchWithSingleUrl(
    url: string,
    options: RequestInit,
    requestId: string,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      // Make the fetch request
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      // Request succeeded
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      // Request failed
      throw error
    }
  }

  private async tryFetchWithFallback(
    endpoint: string,
    options: RequestInit,
    requestId: string,
    timeout: number
  ): Promise<Response> {
    const primaryUrl = this.baseURL + endpoint
    const fallbackUrls = getAPIFallbackUrls(this.baseURL).map(url => url + endpoint)
    const urls = [primaryUrl, ...fallbackUrls]
    
    // Disable fallback system temporarily
    return await this.tryFetchWithSingleUrl(primaryUrl, options, requestId, timeout)
    
    // In production, only try the primary URL
    if (process.env.NODE_ENV === 'production' && fallbackUrls.length > 0) {
      console.log(`🏭 Production mode: skipping ${fallbackUrls.length} localhost fallback URLs`)
      return await this.tryFetchWithSingleUrl(primaryUrl, options, requestId, timeout)
    }
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      try {
        console.log(`🌐 Trying URL ${i + 1}/${urls.length} [${requestId}]: ${url}`)
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        console.log(`✅ Success with URL ${i + 1} [${requestId}]: ${url}`)
        
        // Update baseURL if fallback worked
        if (i > 0) {
          const newBaseUrl = fallbackUrls[i - 1].replace(endpoint, '')
          console.log(`🔄 Updating baseURL from ${this.baseURL} to ${newBaseUrl}`)
          this.baseURL = newBaseUrl
        }
        
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        console.warn(`❌ Failed URL ${i + 1}/${urls.length} [${requestId}]: ${url}`, error)
        
        // If this is the last URL, throw the error
        if (i === urls.length - 1) {
          throw error
        }
        
        // Otherwise continue to next URL
        continue
      }
    }
    
    throw new Error('All fallback URLs failed')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheOptions?: { ttl?: number; skipCache?: boolean }
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, options)
    const isReadOnlyRequest = !options.method || options.method === 'GET'
    const shouldCache = isReadOnlyRequest && !cacheOptions?.skipCache
    const ttl = cacheOptions?.ttl || this.getOptimalTTL(endpoint, options.method || 'GET')
    
    // Check for exponential backoff
    if (this.shouldBackoff(endpoint)) {
      throw new Error(`Request blocked by exponential backoff: ${endpoint}`)
    }
    
    // Check cache for GET requests
    if (shouldCache) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        console.log(`💾 Cache hit for: ${endpoint} (instant response, pending: ${this.pendingRequests.size})`)
        return cached
      }
    }
    
    // Check for pending request (deduplication)
    if (shouldCache && this.pendingRequests.has(cacheKey)) {
      const pendingEntry = this.pendingRequests.get(cacheKey)!
      const age = Date.now() - pendingEntry.timestamp
      // Only reuse if request is less than 15 seconds old
      if (age < 15000) {
        console.log(`🔄 Deduplicating request for: ${endpoint} (age: ${age}ms, pending: ${this.pendingRequests.size})`)
        return pendingEntry.promise as Promise<T>
      } else {
        console.log(`🗑️ Stale pending request, aborting and creating new one: ${endpoint} (age: ${age}ms)`)
        try {
          pendingEntry.abortController.abort()
        } catch (error) {
          console.warn('Error aborting stale pending request:', error)
        }
        this.pendingRequests.delete(cacheKey)
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    
    // Set standard timeout
    const timeout = this.getRequestTimeout(endpoint)

    // Use JWT access token for authentication (prioritize over API key)
    const accessToken = this.getAccessToken()
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    // Log the request for debugging with timing
    const requestStart = performance.now()
    const requestId = Math.random().toString(36).substr(2, 9)
    


    const requestPromise = this.tryFetchWithFallback(endpoint, {
      ...options,
      headers,
    }, requestId, timeout).then(async (response) => {
      if (!response.ok) {
        // Log the error response for debugging
        const errorText = await response.text()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        // Handle 429 Rate Limit specifically
        if (response.status === 429) {
          console.warn('Rate limited - waiting before retry:', errorText)
          // Don't show toast for rate limits - they're handled gracefully by polling logic
          throw new Error(`Rate limited: ${errorText}`)
        }
        
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
      
      // Record success and cache successful GET responses
      this.recordSuccess(endpoint)
      if (shouldCache) {
        this.setCache(cacheKey, data, ttl)
      }
      
      return data
    }).catch((error) => {
      const requestEnd = performance.now()
      const duration = requestEnd - requestStart
      
      if (error.name === 'AbortError') {
        console.error(`⏰ API Timeout [${requestId}]: ${endpoint} timed out after ${duration.toFixed(2)}ms`)
        throw new Error(`Request timeout after ${timeout}ms: ${endpoint}`)
      }
      
      console.error(`❌ API Error [${requestId}]: ${endpoint} failed after ${duration.toFixed(2)}ms`, {
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        duration: `${duration.toFixed(2)}ms`,
        pendingRequests: shouldCache ? this.pendingRequests.size : 'N/A',
        baseURL: this.baseURL,
        fetchSupported: typeof fetch !== 'undefined',
        abortControllerSupported: typeof AbortController !== 'undefined'
      })
      
      // Record failure for exponential backoff (but not for timeouts)
      if (error.name !== 'AbortError') {
        this.recordFailure(endpoint, error.message)
        // Only update circuit breaker for non-temporary failures
        const isTemporaryFailure = error.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('timeout') ||
          error.message.includes('Connection')
        )
        if (!isTemporaryFailure) {
          this.updateCircuitBreaker(false)
        }
      }
      
      throw error
    }).finally(() => {
      // TEMPORARY: Disable cleanup for debugging
      // Clean up pending requests - DISABLED
      // if (shouldCache) {
      //   const wasRemoved = this.pendingRequests.delete(cacheKey)
      //   if (wasRemoved) {
      //     console.log(`🧹 Cleaned up completed request [${requestId}]:`, endpoint, `(${this.pendingRequests.size} remaining)`)
      //   }
      // }
    })

    // TEMPORARY: Disable pending request storage for debugging
    // Store pending request for deduplication - DISABLED
    // if (shouldCache) {
    //   const pendingController = new AbortController()
    //   this.pendingRequests.set(cacheKey, {
    //     promise: requestPromise,
    //     timestamp: Date.now(),
    //     abortController: pendingController
    //   })
    // }

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

  // Method to reset backoff and circuit breaker (useful for user-initiated actions)
  resetErrorState() {
    console.log('🔄 Resetting error state: clearing failure counts and circuit breaker')
    this.failureCounts.clear()
    this.circuitBreakerState = 'CLOSED'
    this.circuitBreakerFailures = 0
    this.circuitBreakerLastFailure = 0
  }

  // Method to force open the circuit breaker (for testing)
  forceCircuitOpen() {
    console.log('🚫 Force opening circuit breaker')
    this.circuitBreakerState = 'OPEN'
    this.circuitBreakerFailures = this.circuitBreakerThreshold
    this.circuitBreakerLastFailure = Date.now()
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
    researchDepth?: 'moderate' | 'deep'
    
    // Research Caching Parameters
    useCachedResearch?: boolean
    maxResearchAgeHours?: number
    forceFreshResearch?: boolean
    
    options?: Record<string, unknown>
  }): Promise<{ jobId: string } | { post: BlogPost }> {
    // Determine which endpoint to use based on parameters
    if (params.topic) {
      // Generate from custom topic
      const requestBody = {
        topic: params.topic,
        blog_type: params.blogType || 'informative',
        language: params.language || 'en',
        research_depth: params.researchDepth || 'moderate',
        
        // Research caching parameters
        use_cached_research: params.useCachedResearch ?? true,
        max_research_age_hours: params.maxResearchAgeHours ?? 24,
        force_fresh_research: params.forceFreshResearch ?? false,
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
        research_depth: params.researchDepth || 'moderate',
        count: 1,
        
        // Research caching parameters
        use_cached_research: params.useCachedResearch ?? true,
        max_research_age_hours: params.maxResearchAgeHours ?? 24,
        force_fresh_research: params.forceFreshResearch ?? false,
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
    const url = query ? `/jobs?${query}` : '/jobs'
    
    const response = await this.request<Job[]>(url, {}, { skipCache: true })
    
    // Transform _id to id for each job
    const transformedJobs = response.map(job => {
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
    })
    
    return transformedJobs
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
    const url = query ? `/jobs/archived?${query}` : '/jobs/archived'
    
    const response = await this.request<Job[]>(url, {}, { skipCache: true })
    
    // Transform _id to id for each job
    const transformedJobs = response.map(job => {
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
        archived_at: job.archived_at ? new Date(job.archived_at) : undefined,
      }
    })
    
    return transformedJobs
  }

  async getJob(jobId: string): Promise<Job> {
    const job = await this.request<Job>(`/jobs/${jobId}`, {}, { ttl: 2000 }) // Short cache for deduplication
    
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


  async archiveCompletedJobs(): Promise<{ success: boolean; message: string; archivedCount?: number }> {
    try {
      const result = await this.request<{ success: boolean; message: string; archived_count?: number }>('/jobs/archive', { method: 'POST' })
      
      // Invalidate job-related caches
      this.invalidateCache('/jobs')
      this.invalidateCache('/jobs/archived')
      
      return {
        success: result.success,
        message: result.message,
        archivedCount: result.archived_count
      }
    } catch (error) {
      console.error('Failed to archive completed jobs:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred during archiving',
        archivedCount: 0
      }
    }
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
        engagement_score: number  // Legacy field
        mentions: number
        
        // Enhanced Twitter fields
        id?: string
        text?: string
        created_at?: string
        language?: string
        source?: string
        
        // Author information
        author_info?: {
          username: string
          display_name: string
          verified: boolean
          followers_count: number
          profile_image_url?: string
          description?: string
          location?: string
        }
        
        // Enhanced metrics
        metrics?: {
          like_count: number
          retweet_count: number
          reply_count: number
          quote_count: number
          bookmarks: number
          views: number
          total_engagement: number
        }
        
        // Entities
        entities?: {
          hashtags: string[]
          urls: Array<{
            url: string
            expanded_url: string
            display_url: string
          }>
          user_mentions: Array<{
            username: string
            name: string
          }>
        }
        
        // Media
        media?: {
          photo?: Array<{
            media_url_https: string
            sizes: {
              h: number
              w: number
            }
          }>
          video?: Array<{
            media_url_https: string
            sizes: {
              h: number
              w: number
            }
          }>
        }
        
        // Quality indicators
        quality_score?: number
        is_viral?: boolean
      }>
      metrics: {
        search_volume: number
        trend_velocity: number
        engagement_rate: number        // 0-100 scale (e.g., 2.33 for 2.33%)
        sentiment_score: number
        total_engagement: number       // Raw engagement count
        total_reach: number           // Raw reach number
        reach_display: string         // Formatted for UI: "150K", "1.2M", etc.
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
        engagement_score: number  // Legacy field
        mentions: number
        
        // Enhanced Twitter fields
        id?: string
        text?: string
        created_at?: string
        language?: string
        source?: string
        
        // Author information
        author_info?: {
          username: string
          display_name: string
          verified: boolean
          followers_count: number
          profile_image_url?: string
          description?: string
          location?: string
        }
        
        // Enhanced metrics
        metrics?: {
          like_count: number
          retweet_count: number
          reply_count: number
          quote_count: number
          bookmarks: number
          views: number
          total_engagement: number
        }
        
        // Entities
        entities?: {
          hashtags: string[]
          urls: Array<{
            url: string
            expanded_url: string
            display_url: string
          }>
          user_mentions: Array<{
            username: string
            name: string
          }>
        }
        
        // Media
        media?: {
          photo?: Array<{
            media_url_https: string
            sizes: {
              h: number
              w: number
            }
          }>
          video?: Array<{
            media_url_https: string
            sizes: {
              h: number
              w: number
            }
          }>
        }
        
        // Quality indicators
        quality_score?: number
        is_viral?: boolean
      }>
      metrics: {
        search_volume: number
        trend_velocity: number
        engagement_rate: number        // 0-100 scale (e.g., 2.33 for 2.33%)
        sentiment_score: number
        total_engagement: number       // Raw engagement count
        total_reach: number           // Raw reach number
        reach_display: string         // Formatted for UI: "150K", "1.2M", etc.
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
    
    // Research Caching Parameters
    useCachedResearch?: boolean
    maxResearchAgeHours?: number
    forceFreshResearch?: boolean
  }): Promise<{ jobId: string }> {
    // Use the correct endpoint for selected trends
    const requestBody = {
      selected_trend_ids: params.selectedTrendIds,
      blog_type: params.blogType || 'informative',
      language: params.language || 'en',
      research_depth: params.researchDepth || 'moderate',
      
      // Research caching parameters
      use_cached_research: params.useCachedResearch ?? true,
      max_research_age_hours: params.maxResearchAgeHours ?? 24,
      force_fresh_research: params.forceFreshResearch ?? false,
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

  // User Hashtag Management (Twitter/X)
  async getUserHashtags(enabledOnly: boolean = false): Promise<Array<{
    id: string
    hashtag: string
    industry: string
    enabled: boolean
    is_custom: boolean
    track_sentiment: boolean
    min_engagement: number
    exclude_retweets: boolean
    exclude_replies: boolean
    language_filter?: string
    include_keywords: string[]
    exclude_keywords: string[]
    trends_discovered: number
    avg_trend_score: number
    last_fetch_at?: string
    created_at: string
    updated_at: string
    use_trending_keywords: boolean
    trending_keywords?: string
  }>> {
    const url = enabledOnly ? '/user/sources/hashtags' : '/user/sources/hashtags?enabled_only=false'
    const response = await this.request<Array<Record<string, unknown>>>(url, {}, { skipCache: true })
    
    // Transform _id to id for each hashtag (similar to jobs)
    return response.map(hashtag => {
      const hashtagWithId = hashtag as Record<string, unknown> & { _id?: string }
      return {
        ...hashtag,
        id: hashtagWithId._id || hashtag.id,
        // Set default values for new trending keywords fields if not present
        use_trending_keywords: hashtag.use_trending_keywords ?? true,
        trending_keywords: hashtag.trending_keywords as string | undefined,
      }
    }) as Array<{
      id: string
      hashtag: string
      industry: string
      enabled: boolean
      is_custom: boolean
      track_sentiment: boolean
      min_engagement: number
      exclude_retweets: boolean
      exclude_replies: boolean
      language_filter?: string
      include_keywords: string[]
      exclude_keywords: string[]
      trends_discovered: number
      avg_trend_score: number
      last_fetch_at?: string
      created_at: string
      updated_at: string
      use_trending_keywords: boolean
      trending_keywords?: string
    }>
  }

  async addUserHashtag(hashtagData: {
    hashtag: string
    industry: string
    enabled?: boolean
    is_custom?: boolean
    track_sentiment?: boolean
    min_engagement?: number
    exclude_retweets?: boolean
    exclude_replies?: boolean
    language_filter?: string
    include_keywords?: string[]
    exclude_keywords?: string[]
    use_trending_keywords?: boolean
    trending_keywords?: string
  }): Promise<{
    id: string
    hashtag: string
    industry: string
    enabled: boolean
    is_custom: boolean
    use_trending_keywords: boolean
    trending_keywords?: string
  }> {
    try {
      return this.request('/user/sources/hashtags', {
        method: 'POST',
        body: JSON.stringify(hashtagData),
      }, { skipCache: true })
    } catch (error) {
      console.error('Error in addUserHashtag:', error)
      throw error
    }
  }

  async updateUserHashtag(hashtagId: string, updateData: {
    enabled?: boolean
    track_sentiment?: boolean
    min_engagement?: number
    exclude_retweets?: boolean
    exclude_replies?: boolean
    language_filter?: string
    include_keywords?: string[]
    exclude_keywords?: string[]
    use_trending_keywords?: boolean
    trending_keywords?: string
  }): Promise<{
    id: string
    hashtag: string
    industry: string
    enabled: boolean
    is_custom: boolean
    use_trending_keywords: boolean
    trending_keywords?: string
  }> {
    return this.request(`/user/sources/hashtags/${hashtagId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, { skipCache: true })
  }

  async deleteUserHashtag(hashtagId: string): Promise<void> {
    await this.request(`/user/sources/hashtags/${hashtagId}`, {
      method: 'DELETE',
    }, { skipCache: true })
  }

  async bulkUpdateHashtags(updates: Array<{
    hashtag_id: string
    enabled: boolean
  }>): Promise<{
    success: boolean
    updated_count: number
  }> {
    return this.request('/user/sources/hashtags/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }, { skipCache: true })
  }

  async toggleHashtag(hashtagId: string, enabled: boolean): Promise<{
    message: string
    hashtag: {
      id: string
      hashtag: string
      enabled: boolean
    }
  }> {
    return this.request('/sources/config/toggle-hashtag', {
      method: 'POST',
      body: JSON.stringify({ hashtag_id: hashtagId, enabled }),
    }, { skipCache: true })
  }

  // Trending keywords methods
  async getTrendingExamples(industry?: string): Promise<{
    examples: Array<{
      hashtag: string
      trending_keywords: string
      engagement_improvement: string
      industry?: string
    }>
  }> {
    const queryParams = new URLSearchParams()
    if (industry) queryParams.append('industry', industry)
    
    const url = `/user/sources/hashtags/trending-examples${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.request(url, {}, { ttl: 300000 }) // Cache for 5 minutes
  }

  async convertHashtagToTrending(hashtagId: string): Promise<{
    success: boolean
    message: string
    hashtag: {
      id: string
      hashtag: string
      trending_keywords: string
      use_trending_keywords: boolean
    }
  }> {
    return this.request(`/user/sources/hashtags/${hashtagId}/convert-to-trending`, {
      method: 'POST',
    }, { skipCache: true })
  }

  async getHashtagsStatistics(): Promise<{
    trending_keywords_stats: {
      total_hashtags: number
      using_trending_keywords: number
      custom_trending_keywords: number
      avg_engagement_improvement: number
    }
  }> {
    return this.request('/user/sources/statistics', {}, { ttl: 30000 }) // Cache for 30 seconds
  }

  // NEW: User Keywords Management (Simplified System)
  async getUserKeywords(enabledOnly: boolean = false): Promise<Array<{
    id: string
    primary_keywords: string[]
    industry: string
    enabled: boolean
    is_custom: boolean
    track_sentiment: boolean
    min_engagement: number
    exclude_retweets: boolean
    exclude_replies: boolean
    language_filter?: string
    include_keywords: string[]
    exclude_keywords: string[]
    trends_discovered: number
    avg_trend_score: number
    last_fetch_at?: string
    created_at: string
    updated_at: string
  }>> {
    const url = enabledOnly ? '/user/sources/keywords' : '/user/sources/keywords?enabled_only=false'
    const response = await this.request<Array<Record<string, unknown>>>(url, {}, { skipCache: true })
    
    // Transform _id to id for each keyword set
    return response.map(keywords => {
      const keywordsWithId = keywords as Record<string, unknown> & { _id?: string }
      return {
        ...keywords,
        id: keywordsWithId._id || keywords.id,
        primary_keywords: keywords.primary_keywords as string[] || [],
        include_keywords: keywords.include_keywords as string[] || [],
        exclude_keywords: keywords.exclude_keywords as string[] || [],
      }
    }) as Array<{
      id: string
      primary_keywords: string[]
      industry: string
      enabled: boolean
      is_custom: boolean
      track_sentiment: boolean
      min_engagement: number
      exclude_retweets: boolean
      exclude_replies: boolean
      language_filter?: string
      include_keywords: string[]
      exclude_keywords: string[]
      trends_discovered: number
      avg_trend_score: number
      last_fetch_at?: string
      created_at: string
      updated_at: string
    }>
  }

  async addUserKeywords(keywordsData: {
    primary_keywords: string[]
    industry: string
    enabled?: boolean
    is_custom?: boolean
    track_sentiment?: boolean
    min_engagement?: number
    exclude_retweets?: boolean
    exclude_replies?: boolean
    language_filter?: string
    include_keywords?: string[]
    exclude_keywords?: string[]
  }): Promise<{
    id: string
    primary_keywords: string[]
    industry: string
    enabled: boolean
    is_custom: boolean
  }> {
    try {
      return this.request('/user/sources/keywords', {
        method: 'POST',
        body: JSON.stringify(keywordsData),
      }, { skipCache: true })
    } catch (error) {
      console.error('Error in addUserKeywords:', error)
      throw error
    }
  }

  async updateUserKeywords(keywordsId: string, updateData: {
    enabled?: boolean
    primary_keywords?: string[]
    track_sentiment?: boolean
    min_engagement?: number
    exclude_retweets?: boolean
    exclude_replies?: boolean
    language_filter?: string
    include_keywords?: string[]
    exclude_keywords?: string[]
  }): Promise<{
    id: string
    primary_keywords: string[]
    industry: string
    enabled: boolean
    is_custom: boolean
  }> {
    return this.request(`/user/sources/keywords/${keywordsId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, { skipCache: true })
  }

  async deleteUserKeywords(keywordsId: string): Promise<void> {
    await this.request(`/user/sources/keywords/${keywordsId}`, {
      method: 'DELETE',
    }, { skipCache: true })
  }

  async bulkUpdateKeywords(updates: Array<{
    keywords_id: string
    enabled: boolean
  }>): Promise<{
    success: boolean
    updated_count: number
  }> {
    return this.request('/user/sources/keywords/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }, { skipCache: true })
  }

  async toggleKeywords(keywordsId: string, enabled: boolean): Promise<{
    message: string
    keywords: {
      id: string
      primary_keywords: string[]
      enabled: boolean
    }
  }> {
    return this.request('/sources/config/toggle-keywords', {
      method: 'POST',
      body: JSON.stringify({ keywords_id: keywordsId, enabled }),
    }, { skipCache: true })
  }

  // NEW: Keyword examples and optimization
  async getKeywordExamples(industry?: string): Promise<{
    examples: Array<{
      old_hashtag?: string
      primary_keywords: string[]
      engagement_improvement: string
      industry?: string
    }>
  }> {
    const queryParams = new URLSearchParams()
    if (industry) queryParams.append('industry', industry)
    
    const url = `/user/sources/keywords/examples${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.request(url, {}, { ttl: 300000 }) // Cache for 5 minutes
  }

  async optimizeKeywords(keywordsId: string): Promise<{
    success: boolean
    message: string
    keywords: {
      id: string
      primary_keywords: string[]
      optimized: boolean
    }
  }> {
    return this.request(`/user/sources/keywords/${keywordsId}/optimize`, {
      method: 'POST',
    }, { skipCache: true })
  }

  async getKeywordsStatistics(): Promise<{
    keyword_stats: {
      total_keywords: number
      active_keywords: number
      custom_keywords: number
      avg_engagement_improvement: number
    }
  }> {
    return this.request('/user/sources/keywords/statistics', {}, { ttl: 30000 }) // Cache for 30 seconds
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export default apiClient