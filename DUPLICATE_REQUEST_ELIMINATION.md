# Duplicate Request Elimination System

## Overview

This document describes the comprehensive system implemented to eliminate duplicate API requests in the TrendScribe Dashboard. The solution reduces initial page load requests from ~74 to ~10-15 requests (80%+ improvement) through centralized polling, request deduplication, and intelligent data sharing.

## Problem Statement

### Original Issues
- **Multiple competing polling systems** making identical API calls
- **Component-level API calls** on mount creating request floods
- **Independent refresh timers** (5s, 15s, 30s intervals) overlapping
- **No request deduplication** at the API client level
- **Parallel data fetching** without coordination

### Impact
- **74+ duplicate requests** on page refresh
- **Poor performance** and server overload
- **Inconsistent data** across components
- **Wasted bandwidth** and API quota

## Solution Architecture

### 1. Centralized Polling Service (`/src/lib/polling-service.ts`)

The core of the system is a unified polling service that coordinates all API requests:

```typescript
class PollingService {
  private subscriptions = new Map<string, PollingSubscription>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private endpointSubscriptions = new Map<string, Set<string>>();
  private isVisible = true;
}
```

#### Key Features:

**Endpoint Deduplication:**
- Multiple subscriptions to the same endpoint share a single polling timer
- One API call broadcasts data to all subscribers
- Prevents duplicate requests for identical data

**Intelligent Scheduling:**
- Critical data (jobs, dashboard-stats) gets immediate calls
- Non-critical data (recent-posts, archived-jobs) is delayed 2 seconds
- Background vs foreground polling intervals (6x slower when tab hidden)

**Subscription Management:**
```typescript
subscribe(id: string, endpoint: string, callback: Function, interval: number)
```
- Tracks all subscriptions by endpoint
- Automatic cleanup when last subscriber unsubscribes
- Graceful error handling with fallback data

### 2. Request Deduplication (`/src/lib/api-client.ts`)

Re-enabled the built-in deduplication system:

```typescript
// Check for pending request (deduplication)
if (shouldCache && this.pendingRequests.has(cacheKey)) {
  const pendingEntry = this.pendingRequests.get(cacheKey)!
  const age = Date.now() - pendingEntry.timestamp
  // Only reuse if request is less than 15 seconds old
  if (age < 15000) {
    return pendingEntry.promise as Promise<T>
  }
}
```

**Features:**
- Prevents identical simultaneous requests
- 15-second window for request reuse
- Automatic stale request cleanup
- Circuit breaker pattern for error handling

### 3. Centralized Data Contexts

#### DataContext (`/src/contexts/DataContext.tsx`)
Provides shared data for dashboard components:

```typescript
interface DataContextType {
  dashboardStats: DashboardStats | null;
  costData: CostData | null;
  recentPosts: BlogPost[];
  loading: { dashboardStats: boolean; costData: boolean; recentPosts: boolean };
  errors: { dashboardStats: string | null; costData: string | null; recentPosts: string | null };
  refreshAll: () => void;
}
```

#### JobContext (`/src/contexts/JobContext.tsx`)
Manages job data through centralized polling:

```typescript
interface JobContextType {
  state: JobState;
  refreshJobs: () => void;
  setJobs: (jobs: Job[]) => void;
  dispatch: React.Dispatch<JobAction>;
}
```

### 4. Component Migration Strategy

#### Before (Individual API Calls):
```typescript
// OLD: Each component makes its own API call
useEffect(() => {
  const fetchData = async () => {
    const data = await apiClient.getDashboardStats()
    setData(data)
  }
  fetchData()
  
  // Independent refresh timer
  const interval = setInterval(fetchData, 30000)
  return () => clearInterval(interval)
}, [])
```

#### After (Shared Data):
```typescript
// NEW: Components use shared context data
const { stats, loading, error } = useDashboardStats()
```

## Implementation Details

### Polling Endpoints Configuration

| Endpoint | Interval | Priority | Initial Call |
|----------|----------|----------|--------------|
| `jobs` | 5s | Critical | ✅ Immediate |
| `dashboard-stats` | 60s | Critical | ✅ Immediate |
| `detailed-costs` | 30s | High | ✅ Immediate |
| `recent-posts` | 60s | Medium | ❌ Delayed |
| `archived-jobs` | 60s | Low | ❌ Delayed |
| `job-stats` | 30s | Medium | ❌ Delayed |
| `archive-eligibility` | 30s | Low | ❌ Delayed |

### Error Handling & Permissions

The system includes robust error handling for permission-sensitive endpoints:

```typescript
// Graceful 403 handling
try {
  data = await apiClient.getDetailedCosts();
} catch (error) {
  if (error instanceof Error && error.message.includes('403')) {
    console.warn('⚠️ Cost monitoring not available (insufficient permissions)');
    data = {
      today: { total_usd: 0, gemini_usd: 0, linkup_eur: 0, services: {} },
      exchange_rate: { eur_to_usd: 1.0, last_updated: 'N/A', source: 'unavailable' },
      weekly_summary: { total_cost_usd: 0, total_requests: 0, avg_daily_cost_usd: 0 }
    };
  }
}
```

**Fallback Strategies:**
- Empty data structures for missing permissions
- Graceful degradation without breaking UI
- User-friendly error messages
- Automatic retry mechanisms

### Visibility-Aware Polling

The system adjusts polling frequency based on tab visibility:

```typescript
private getEffectiveInterval(baseInterval: number): number {
  if (!this.isVisible) {
    return Math.max(baseInterval * 6, 30000); // 6x slower when hidden
  }
  return baseInterval;
}
```

**Benefits:**
- Reduces server load when users aren't actively viewing
- Conserves battery on mobile devices
- Maintains real-time updates when tab is active

## Migration Guide

### Migrating Components from Direct API Calls

#### 1. Remove Direct API Calls
```typescript
// REMOVE
useEffect(() => {
  const fetchData = async () => {
    const data = await apiClient.getSomeData()
    setData(data)
  }
  fetchData()
}, [])
```

#### 2. Add to Polling Service
```typescript
// Add to polling-service.ts
case 'some-data':
  data = await apiClient.getSomeData();
  break;
```

#### 3. Create Context Hook
```typescript
// Add to DataContext.tsx
export function useSomeData() {
  const { someData, loading, errors } = useData();
  return {
    data: someData,
    loading: loading.someData,
    error: errors.someData,
  };
}
```

#### 4. Update Component
```typescript
// REPLACE with context hook
const { data, loading, error } = useSomeData()
```

### Adding New Endpoints

1. **Add endpoint case** to polling service switch statement
2. **Add data type** to DataContext interface
3. **Add subscription** in DataContext useEffect
4. **Create hook** for component consumption
5. **Update components** to use the new hook

## Performance Metrics

### Before Optimization
- **~74 requests** on page refresh
- **Multiple overlapping polling timers**
- **Independent API calls** in 25+ components
- **No request deduplication**
- **Inconsistent refresh intervals**

### After Optimization
- **~10-15 requests** on page refresh (**80%+ reduction**)
- **Single polling timer** per endpoint
- **Centralized data management**
- **Built-in request deduplication**
- **Coordinated refresh cycles**

### Load Time Improvements
- **Critical data loads immediately** (jobs, dashboard stats)
- **Non-critical data delayed** by 2 seconds
- **Background polling** when tab not visible
- **Graceful error handling** prevents cascade failures

## Debugging & Monitoring

### Console Logging
The system includes comprehensive logging for debugging:

```typescript
// Subscription tracking
📡 Subscribing to polling: jobs (jobs) every 5000ms [FIRST]
🔗 Reusing existing polling for endpoint: jobs

// Data flow monitoring
🚀 Making immediate call for critical endpoint: jobs
✅ Jobs data received: 5 jobs
📡 useGlobalJobPolling: Received job data: 5 jobs

// Error handling
⚠️ Cost monitoring not available (insufficient permissions)
❌ Failed to fetch jobs: Error message
```

### Health Checks
- **Subscription count** per endpoint
- **Request success/failure rates**
- **Polling interval effectiveness**
- **Cache hit/miss ratios**

## Best Practices

### Do's ✅
- Use context hooks for data access
- Add new endpoints to polling service
- Handle permission errors gracefully
- Set appropriate polling intervals
- Use loading states from contexts

### Don'ts ❌
- Make direct API calls in components
- Create independent polling timers
- Bypass the centralized system
- Ignore error handling
- Poll too frequently for non-critical data

## Future Enhancements

### Planned Improvements
1. **WebSocket integration** for real-time updates
2. **Smart caching** with TTL optimization
3. **Request prioritization** system
4. **Bandwidth-aware polling** adjustment
5. **Offline support** with request queuing

### Monitoring Integration
- **Performance metrics** collection
- **Error rate tracking**
- **API usage analytics**
- **User experience monitoring**

## Troubleshooting

### Common Issues

#### "No data showing in components"
1. Check console for subscription messages
2. Verify context provider is properly wrapped
3. Ensure component uses correct hook
4. Check for permission errors

#### "Still seeing duplicate requests"
1. Verify component isn't making direct API calls
2. Check for multiple subscriptions to same endpoint
3. Ensure proper cleanup in useEffect
4. Review network tab for request patterns

#### "Slow data loading"
1. Check if endpoint is marked as critical
2. Verify polling intervals are appropriate
3. Review error handling logs
4. Ensure proper fallback data

### Debug Commands
```typescript
// Check active subscriptions
console.log(pollingService.subscriptions)

// Monitor data flow
console.log('Data received:', data)

// Check context state
console.log('Context state:', state)
```

## Conclusion

The duplicate request elimination system provides a robust, scalable solution for managing API requests in the TrendScribe Dashboard. By centralizing polling, implementing proper deduplication, and sharing data through contexts, we've achieved significant performance improvements while maintaining real-time data updates.

The system is designed to be:
- **Maintainable**: Clear separation of concerns
- **Scalable**: Easy to add new endpoints
- **Robust**: Graceful error handling
- **Efficient**: Minimal API requests
- **User-friendly**: Fast loading times

This architecture serves as a foundation for future enhancements and ensures optimal performance as the application grows.