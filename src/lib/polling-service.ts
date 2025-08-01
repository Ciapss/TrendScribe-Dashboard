'use client';

import { apiClient } from './api-client';

type PollingCallback<T> = (data: T) => void;
type ErrorCallback = (error: Error) => void;

interface PollingSubscription {
  id: string;
  endpoint: string;
  interval: number;
  callback: PollingCallback<unknown>;
  errorCallback?: ErrorCallback;
  isActive: boolean;
}

class PollingService {
  private subscriptions = new Map<string, PollingSubscription>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private endpointSubscriptions = new Map<string, Set<string>>(); // Track which endpoints have subscriptions
  private endpointErrors = new Map<string, { count: number; lastError: number }>(); // Track consecutive errors per endpoint
  private isVisible = true;
  private visibilityChangeHandler: () => void;
  private lastUserAction = 0; // Timestamp of last user action for adaptive polling
  private activeRequests = new Map<string, Promise<unknown>>(); // Track active requests to prevent duplicates

  constructor() {
    this.visibilityChangeHandler = () => {
      this.isVisible = !document.hidden;
      console.log(`👁️ Tab visibility changed: ${this.isVisible ? 'visible' : 'hidden'}`);
      this.updatePollingIntervals();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  subscribe<T>(
    id: string,
    endpoint: string,
    callback: PollingCallback<T>,
    interval: number = 30000,
    errorCallback?: ErrorCallback
  ): () => void {
    // Check if this endpoint is already being polled
    const existingEndpointSubs = this.endpointSubscriptions.get(endpoint) || new Set();
    const isFirstSubscription = existingEndpointSubs.size === 0;
    
    console.log(`📡 Subscribing to polling: ${id} (${endpoint}) every ${interval}ms${isFirstSubscription ? ' [FIRST]' : ' [ADDITIONAL]'}`);

    const subscription: PollingSubscription = {
      id,
      endpoint,
      interval,
      callback: callback as PollingCallback<unknown>,
      errorCallback,
      isActive: true,
    };

    this.subscriptions.set(id, subscription);
    
    // Track endpoint subscription
    existingEndpointSubs.add(id);
    this.endpointSubscriptions.set(endpoint, existingEndpointSubs);

    // Only start actual polling for the first subscription to this endpoint
    if (isFirstSubscription) {
      this.startPolling(subscription);
    } else {
      console.log(`🔗 Reusing existing polling for endpoint: ${endpoint}`);
    }

    return () => this.unsubscribe(id);
  }

  unsubscribe(id: string): void {
    console.log(`🚫 Unsubscribing from polling: ${id}`);
    
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      const { endpoint } = subscription;
      
      // Remove from endpoint tracking
      const endpointSubs = this.endpointSubscriptions.get(endpoint);
      if (endpointSubs) {
        endpointSubs.delete(id);
        
        // If this was the last subscription for this endpoint, stop polling
        if (endpointSubs.size === 0) {
          const interval = this.intervals.get(id);
          if (interval) {
            clearInterval(interval);
            this.intervals.delete(id);
            console.log(`⏹️ Stopped polling for endpoint: ${endpoint} (no more subscribers)`);
          }
          this.endpointSubscriptions.delete(endpoint);
        }
      }
    }
    
    this.subscriptions.delete(id);
  }

  private async startPolling(subscription: PollingSubscription, skipInitialCall = false): Promise<void> {
    if (!subscription.isActive) return;

    const { id, endpoint, interval } = subscription;
    
    const pollOnce = async () => {
      if (!subscription.isActive || !this.subscriptions.has(id)) {
        return;
      }

      try {
        // Check if there's already an active request for this endpoint
        const activeRequest = this.activeRequests.get(endpoint);
        if (activeRequest) {
          console.log(`⏸️ Skipping ${endpoint} request - already in progress`);
          return;
        }
        
        // Declare dataPromise variable
        let dataPromise: Promise<unknown>;
        
        // Create the data promise based on endpoint
        switch (endpoint) {
          case 'jobs':
            dataPromise = (async () => {
              try {
                const jobsData = await apiClient.getJobs({ includeArchived: false }); // Fetch only active jobs
                // Temporary debug: Check if we're getting jobs that should be archived
                if (jobsData && jobsData.length > 0) {
                  const completedJobs = jobsData.filter(j => j.status === 'completed');
                  if (completedJobs.length > 0) {
                    console.log('⚠️ Still receiving completed jobs after archive:', completedJobs.map(j => ({
                      id: j.id,
                      status: j.status,
                      archived: (j as any).archived
                    })));
                  }
                }
                return jobsData;
              } catch (error) {
                console.error('❌ Failed to fetch jobs:', error);
                if (error instanceof Error && (
                  error.message.includes('403') ||
                  error.message.includes('timeout') ||
                  error.message.includes('AbortError') ||
                  error.message.includes('Network Error') ||
                  error.message.includes('Failed to fetch')
                )) {
                  console.warn('⚠️ Jobs API temporarily unavailable:', error.message);
                  return []; // Return empty array for graceful handling
                } else {
                  throw error; // Re-throw other errors
                }
              }
            })();
            break;
          case 'dashboard-stats':
            dataPromise = apiClient.getDashboardStats();
            break;
          case 'detailed-costs':
            dataPromise = (async () => {
              try {
                return await apiClient.getDetailedCosts();
              } catch (error) {
                // Handle both permission errors and timeouts gracefully for cost monitoring
                if (error instanceof Error && (error.message.includes('403') || error.message.includes('timeout') || error.message.includes('AbortError'))) {
                  console.warn('⚠️ Cost monitoring not available (insufficient permissions or timeout):', error.message);
                  // Return empty cost data structure
                  return {
                    today: { total_usd: 0, gemini_usd: 0, linkup_eur: 0, services: {} },
                    exchange_rate: { eur_to_usd: 1.0, last_updated: 'N/A', source: 'unavailable' },
                    weekly_summary: { total_cost_usd: 0, total_requests: 0, avg_daily_cost_usd: 0 }
                  };
                } else {
                  throw error; // Re-throw other errors
                }
              }
            })();
            break;
          case 'job-stats':
            dataPromise = (async () => {
              try {
                return await apiClient.getJobStats();
              } catch (error) {
                if (error instanceof Error && error.message.includes('403')) {
                  console.warn('⚠️ Job stats not available (insufficient permissions)');
                  return { processing: 0, completed: 0, failed: 0, cancelled: 0, total: 0 };
                } else {
                  throw error;
                }
              }
            })();
            break;
          case 'archive-eligibility':
            dataPromise = (async () => {
              try {
                return await apiClient.checkArchiveEligibility();
              } catch (error) {
                if (error instanceof Error && error.message.includes('403')) {
                  console.warn('⚠️ Archive features not available (insufficient permissions)');
                  return { valid: false, eligibleJobsCount: 0, message: 'Archive feature not available' };
                } else {
                  throw error;
                }
              }
            })();
            break;
          case 'recent-posts':
            dataPromise = apiClient.getPosts({ limit: 5, sort: 'date-desc' });
            break;
          default:
            dataPromise = Promise.reject(new Error(`Unknown polling endpoint: ${endpoint}`));
        }
        
        // Store the active request to prevent duplicates
        this.activeRequests.set(endpoint, dataPromise);
        
        // Await the data and clean up
        const data = await dataPromise;
        this.activeRequests.delete(endpoint);
        
        // Reset error count on successful request
        this.endpointErrors.delete(endpoint);
        
        // Broadcast to all subscribers of this endpoint
        const endpointSubs = this.endpointSubscriptions.get(endpoint);
        if (endpointSubs) {
          for (const subId of endpointSubs) {
            const sub = this.subscriptions.get(subId);
            if (sub && sub.isActive) {
              sub.callback(data);
            }
          }
        }
      } catch (error) {
        // Clean up active request on error
        this.activeRequests.delete(endpoint);
        
        console.error(`Polling error for ${endpoint}:`, error);
        
        // Track consecutive errors for exponential backoff
        const errorInfo = this.endpointErrors.get(endpoint) || { count: 0, lastError: 0 };
        errorInfo.count += 1;
        errorInfo.lastError = Date.now();
        this.endpointErrors.set(endpoint, errorInfo);
        
        // Broadcast error to all subscribers of this endpoint
        const endpointSubs = this.endpointSubscriptions.get(endpoint);
        if (endpointSubs) {
          for (const subId of endpointSubs) {
            const sub = this.subscriptions.get(subId);
            if (sub && sub.isActive && sub.errorCallback) {
              sub.errorCallback(error as Error);
            }
          }
        }
      }
    };

    // Only make immediate call for critical data or when explicitly requested
    if (!skipInitialCall && (endpoint === 'jobs' || endpoint === 'dashboard-stats')) {
      console.log(`🚀 Making immediate call for critical endpoint: ${endpoint}`);
      await pollOnce();
    }

    const effectiveInterval = this.getEffectiveInterval(interval, endpoint);
    
    const intervalId = setInterval(pollOnce, effectiveInterval);
    this.intervals.set(id, intervalId);
    
    console.log(`⏰ Started polling ${id} every ${effectiveInterval}ms (immediate: ${!skipInitialCall})`);
  }

  private getEffectiveInterval(baseInterval: number, endpoint?: string): number {
    let multiplier = 1;
    
    // Speed up after recent user actions (within 2 minutes)
    const timeSinceLastAction = Date.now() - this.lastUserAction;
    const twoMinutes = 2 * 60 * 1000;
    if (timeSinceLastAction < twoMinutes && (endpoint === 'jobs' || endpoint === 'archived-jobs')) {
      multiplier *= 0.2; // 5x faster (30s -> 6s) for job-related endpoints
      console.log(`⚡ Speeding up polling for ${endpoint} due to recent user action (${Math.round(timeSinceLastAction / 1000)}s ago)`);
    }
    
    // Slow down when tab is not visible
    if (!this.isVisible) {
      multiplier *= 6;
    }
    
    // Slow down for endpoints with repeated failures
    if (endpoint) {
      const errorInfo = this.endpointErrors.get(endpoint);
      if (errorInfo && errorInfo.count > 0) {
        // Exponential backoff: 2x, 4x, 8x up to maximum of 8x
        const backoffMultiplier = Math.min(Math.pow(2, errorInfo.count), 8);
        multiplier *= backoffMultiplier;
        console.log(`⚠️ Slowing down polling for ${endpoint} due to ${errorInfo.count} consecutive errors (${backoffMultiplier}x slower)`);
      }
    }
    
    return Math.max(baseInterval * multiplier, 5000); // Minimum 5s instead of 30s
  }

  private updatePollingIntervals(): void {
    for (const [id, subscription] of this.subscriptions) {
      if (!subscription.isActive) continue;

      const interval = this.intervals.get(id);
      if (interval) {
        clearInterval(interval);
      }

      const effectiveInterval = this.getEffectiveInterval(subscription.interval);
      
      const pollOnce = async () => {
        if (!subscription.isActive || !this.subscriptions.has(id)) {
          return;
        }

        try {
          let data;
          
          switch (subscription.endpoint) {
            case 'jobs':
              data = await apiClient.getJobs({ includeArchived: false }); // Fetch only active jobs
              break;
            case 'dashboard-stats':
              data = await apiClient.getDashboardStats();
              break;
            case 'detailed-costs':
              data = await apiClient.getDetailedCosts();
              break;
            case 'job-stats':
              data = await apiClient.getJobStats();
              break;
            case 'archive-eligibility':
              data = await apiClient.checkArchiveEligibility();
              break;
            case 'recent-posts':
              data = await apiClient.getPosts({ limit: 5, sort: 'date-desc' });
              break;
            default:
              throw new Error(`Unknown polling endpoint: ${subscription.endpoint}`);
          }
          
          subscription.callback(data);
        } catch (error) {
          console.error(`Polling error for ${id}:`, error);
          if (subscription.errorCallback) {
            subscription.errorCallback(error as Error);
          }
        }
      };

      const newIntervalId = setInterval(pollOnce, effectiveInterval);
      this.intervals.set(id, newIntervalId);
      
      console.log(`⏰ Updated polling interval for ${id}: ${effectiveInterval}ms`);
    }
  }

  pause(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.isActive = false;
      
      const interval = this.intervals.get(id);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(id);
      }
      
      console.log(`⏸️ Paused polling: ${id}`);
    }
  }

  resume(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.isActive = true;
      this.startPolling(subscription);
      console.log(`▶️ Resumed polling: ${id}`);
    }
  }

  destroy(): void {
    console.log('🧹 Destroying polling service');
    
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  triggerManualRefresh(id?: string): void {
    // Mark user action for adaptive polling
    this.lastUserAction = Date.now();
    console.log('⚡ User action detected - enabling fast polling for 2 minutes');
    
    if (id) {
      const subscription = this.subscriptions.get(id);
      if (subscription && subscription.isActive) {
        console.log(`🔄 Manual refresh triggered for ${id}`);
        apiClient.resetErrorState();
        
        this.startPolling(subscription);
      }
    } else {
      console.log('🔄 Manual refresh triggered for all subscriptions');
      apiClient.resetErrorState();
      
      for (const subscription of this.subscriptions.values()) {
        if (subscription.isActive) {
          this.startPolling(subscription);
        }
      }
    }
    
    // Update all polling intervals to account for recent user action
    this.updatePollingIntervals();
  }
}

export const pollingService = new PollingService();