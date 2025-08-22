# BACKEND ISSUE: Trends API Timeout and Performance Problems

## Issue Summary
The `/trends` API endpoint is experiencing severe performance issues causing 30-second timeouts, affecting the trends selection functionality in the dashboard.

## Error Details
```
Request timeout after 30000ms: /trends?page=1&limit=30&industry=Technology&sort_by=trend_score&sort_order=desc&discovered_after=2025-08-01
```

## Root Cause Analysis

### Primary Issues:
1. **Date Filtering Performance**: The `discovered_after` parameter with today's date is causing expensive database queries
2. **Backend Query Optimization**: The trends endpoint appears to have unoptimized database queries
3. **Timeout Configuration**: 30-second timeout indicates slow query execution

### Frontend Involvement:
- Frontend was automatically adding `discoveredAfter: today` filter
- This has been **removed** in frontend code to prevent backend timeouts
- Frontend now loads all trends without date filtering

## Backend Performance Issues to Address

### 1. Database Query Optimization
- **Issue**: Queries with date filtering are extremely slow
- **Impact**: 30+ second response times
- **Recommendation**: 
  - Add database indexes on `discovered_at` column
  - Optimize date range queries
  - Consider query plan analysis

### 2. API Response Time
- **Current**: 30+ seconds (timing out)
- **Target**: < 2 seconds for reasonable UX
- **Suggestions**:
  - Implement query caching
  - Add database connection pooling
  - Consider pagination optimization

### 3. Specific API Parameters Causing Issues
- `discovered_after=2025-08-01` - This date filter is the primary culprit
- Large result sets with sorting by `trend_score`
- Industry filtering combined with date filtering

## Frontend Workarounds Implemented

### ✅ Completed Frontend Fixes:
1. **Removed problematic date filtering**: No more `discoveredAfter` parameter
2. **Switched to client-side pagination**: Load all trends once, paginate in browser
3. **Better error handling**: User-friendly timeout messages
4. **Increased data limit**: Load up to 1000 trends at once for better UX

### Frontend Changes Made:
```typescript
// OLD (causing timeouts):
const response = await apiClient.getTrends({
  page: currentPage,
  limit: 30,
  industry: trendFilters.industry,
  discoveredAfter: today, // REMOVED - This was causing timeouts
})

// NEW (fixed):
const response = await apiClient.getTrends({
  limit: 1000, // Load all trends at once
  industry: trendFilters.industry,
  sortBy: trendFilters.sortBy,
  sortOrder: trendFilters.sortOrder,
  search: trendFilters.search,
  // No date filtering to prevent backend timeouts
})
```

## Backend Action Items (Priority Order)

### 🔴 HIGH PRIORITY
1. **Optimize date-based queries** - Add proper indexes on `discovered_at`
2. **Remove or optimize expensive date filtering** - Consider background processing
3. **Add query performance monitoring** - Track slow queries

### 🟡 MEDIUM PRIORITY  
4. **Implement response caching** - Cache trends data for faster responses
5. **Review database query plans** - Identify bottlenecks
6. **Add API performance metrics** - Monitor response times

### 🟢 LOW PRIORITY
7. **Consider data archiving** - Move old trends to separate tables
8. **Implement smart pagination** - Server-side optimization for large datasets

## Testing Recommendations

### Load Testing:
- Test `/trends` endpoint with various industry filters
- Test with and without date parameters
- Measure query execution time in database

### Database Analysis:
```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM trends 
WHERE industry = 'Technology' 
AND discovered_at >= '2025-08-01' 
ORDER BY trend_score DESC;

-- Add recommended index
CREATE INDEX idx_trends_industry_discovered 
ON trends(industry, discovered_at, trend_score);
```

## Expected Outcomes

### After Backend Fixes:
- ✅ API response times < 2 seconds
- ✅ No more timeout errors
- ✅ Better user experience with source filtering
- ✅ Faster page navigation and filtering

### User Experience Impact:
- **Before**: 30+ second timeouts, only Reddit trends visible
- **After**: Instant pagination, all source types visible, smooth filtering

## Contact
- **Frontend Changes**: Already implemented and deployed
- **Backend Issues**: Require immediate attention from backend team
- **Priority**: HIGH - Affects core dashboard functionality

---
*Issue created: 2025-08-01*  
*Frontend fixes: Completed*  
*Backend fixes: Pending*