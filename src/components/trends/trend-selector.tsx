"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendFilters } from "./trend-filters";
import type { Trend, TrendFilters as TrendFiltersType } from "@/types";
import { ChevronDown, ChevronRight, ChevronLeft, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TrendSelectorProps {
  trends: Trend[];
  selectedTrendIds: string[];
  onTrendSelection: (trendIds: string[]) => void;
  loading?: boolean;
  error?: string;
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  filters: TrendFiltersType;
  onFiltersChange: (filters: TrendFiltersType) => void;
  onLoadTopics?: () => void;
  disabled?: boolean;
  className?: string;
}

export function TrendSelector({
  trends,
  selectedTrendIds,
  onTrendSelection,
  loading = false,
  error,
  totalCount,
  currentPage,
  onPageChange,
  filters,
  onFiltersChange,
  onLoadTopics,
  disabled = false,
  className,
}: TrendSelectorProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());

  // Extract unique values for filter options
  const industries = useMemo(
    () => [...new Set(trends.map(trend => trend.industry))].sort(),
    [trends]
  );

  const statuses = useMemo(
    () => [...new Set(trends.map(trend => trend.status))].sort(),
    [trends]
  );

  // Extract unique source types and map them to user-friendly labels
  const sourceTypes = useMemo(() => {
    // Create a map to count trends by source type
    const sourceCounts = new Map<string, number>();
    
    // Count trends for each source type
    trends.forEach(trend => {
      const collectionSource = trend.collection_source?.toLowerCase();
      if (!collectionSource) return;
      
      let sourceType: string;
      if (collectionSource === 'twitter' || collectionSource === 'x') {
        sourceType = 'hashtag';
      } else if (collectionSource === 'reddit') {
        sourceType = 'reddit';
      } else if (collectionSource === 'rss' || collectionSource === 'rss_feeds') {
        sourceType = 'rss';
      } else if (collectionSource === 'linkup') {
        sourceType = 'linkup';
      } else {
        sourceType = collectionSource;
      }
      
      sourceCounts.set(sourceType, (sourceCounts.get(sourceType) || 0) + 1);
    });
    
    // Convert to array with labels
    const sourceTypes = Array.from(sourceCounts.entries()).map(([sourceType, count]) => ({
      value: sourceType,
      label: sourceType === 'hashtag' ? 'Hashtag' : 
             sourceType === 'reddit' ? 'Reddit' :
             sourceType === 'rss' ? 'RSS' :
             sourceType === 'linkup' ? 'LinkUp' :
             sourceType.charAt(0).toUpperCase() + sourceType.slice(1),
      count
    }));
    
    return sourceTypes.sort((a, b) => b.count - a.count);
  }, [trends]);


  const handleTrendSelect = useCallback((trendId: string) => {
    // Only allow selecting one trend at a time
    if (selectedTrendIds.includes(trendId)) {
      onTrendSelection([]); // Deselect if already selected
    } else {
      onTrendSelection([trendId]); // Select only this trend
    }
  }, [selectedTrendIds, onTrendSelection]);

  const toggleRowExpansion = useCallback((trendId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trendId)) {
        newSet.delete(trendId);
      } else {
        newSet.add(trendId);
      }
      return newSet;
    });
  }, []);

  const toggleKeywordsExpand = useCallback((trendId: string) => {
    setExpandedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trendId)) {
        newSet.delete(trendId);
      } else {
        newSet.add(trendId);
      }
      return newSet;
    });
  }, []);

  // Reset to page 1 when filters change
  const handlePageChange = useCallback((page: number) => {
    onPageChange(page);
  }, [onPageChange]);

  // When search or source filters change, reset to page 1
  useEffect(() => {
    if (currentPage > 1 && (filters.search || filters.source)) {
      onPageChange(1);
    }
  }, [filters.search, filters.source, currentPage, onPageChange]);

  const handleRowSelect = useCallback((trendId: string) => {
    handleTrendSelect(trendId);
  }, [handleTrendSelect]);

  // Helper functions for statistics display with proper fallbacks
  const getTrendScore = useCallback((trend: Trend): string => {
    const score = trend.trend_score ?? 0;
    return Math.min(Math.max(score, 0), 10).toFixed(1);  // Ensure 0-10 range
  }, []);

  const getReachDisplay = useCallback((trend: Trend): string => {
    // Debug: Log the first trend's metrics to see what we're getting
    if (trends.length > 0 && trend.id === trends[0].id) {
      console.log('Debug - Reach metrics:', {
        id: trend.id,
        topic: trend.topic,
        reach_display: trend.metrics?.reach_display,
        total_reach: trend.metrics?.total_reach,
        search_volume: trend.metrics?.search_volume,
        twitter_sources: trend.sources?.filter(s => 
          s.platform?.toLowerCase() === 'twitter' || s.platform?.toLowerCase() === 'x'
        ).length
      });
    }
    
    // Use the pre-formatted reach_display field (primary method)
    if (trend.metrics?.reach_display) {
      return trend.metrics.reach_display;
    }
    
    // Enhanced fallback: Calculate total reach from Twitter views if available
    const twitterSources = trend.sources?.filter(source => 
      source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x'
    );
    
    if (twitterSources && twitterSources.length > 0) {
      let totalTwitterViews = 0;
      let validSources = 0;
      
      twitterSources.forEach(source => {
        if (source.metrics?.views && source.metrics.views > 0) {
          totalTwitterViews += source.metrics.views;
          validSources++;
        }
      });
      
      if (validSources > 0 && totalTwitterViews > 0) {
        // Format large numbers nicely (e.g., 1.2M, 150K)
        if (totalTwitterViews >= 1000000) {
          return `${(totalTwitterViews / 1000000).toFixed(1)}M`;
        } else if (totalTwitterViews >= 1000) {
          return `${(totalTwitterViews / 1000).toFixed(0)}K`;
        }
        return totalTwitterViews.toLocaleString();
      }
    }
    
    // Fallback to formatted total_reach if available
    if (trend.metrics?.total_reach) {
      return trend.metrics.total_reach.toLocaleString();
    }
    
    // Final fallback to search_volume (legacy compatibility)
    if (trend.metrics?.search_volume) {
      return trend.metrics.search_volume.toLocaleString();
    }
    
    return '0';
  }, [trends]);

  const getEngagementRate = useCallback((trend: Trend): string => {
    // Debug: Log engagement data for troubleshooting
    if (trends.length > 0 && trend.id === trends[0].id) {
      console.log('Debug - Engagement data:', {
        id: trend.id,
        topic: trend.topic,
        engagement_rate: trend.metrics?.engagement_rate,
        total_engagement: trend.metrics?.total_engagement,
        total_reach: trend.metrics?.total_reach,
        sources_count: trend.sources?.length || 0,
        // Additional debug info
        has_metrics: !!trend.metrics,
        trend_score: trend.trend_score
      });
      
      // Log individual source data including new Twitter metrics
      trend.sources?.forEach((source, idx) => {
        console.log(`Source ${idx}:`, {
          platform: source.platform,
          engagement_score: source.engagement_score,
          mentions: source.mentions,
          // Twitter-specific metrics
          twitter_metrics: source.metrics,
          author_info: source.author_info,
          quality_score: source.quality_score,
          is_viral: source.is_viral
        });
      });
    }
    
    // Use the backend-calculated engagement_rate (already a percentage 0-100)
    if (trend.metrics?.engagement_rate !== undefined && trend.metrics.engagement_rate !== null && trend.metrics.engagement_rate > 0) {
      const rate = Math.max(trend.metrics.engagement_rate, 0);
      return rate.toFixed(1);
    }
    
    // Enhanced fallback: Calculate engagement from Twitter sources if available
    const twitterSources = trend.sources?.filter(source => 
      source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x'
    );
    
    if (twitterSources && twitterSources.length > 0) {
      // Calculate average engagement rate from Twitter sources
      let totalEngagement = 0;
      let totalViews = 0;
      let validSources = 0;
      
      twitterSources.forEach(source => {
        if (source.metrics?.total_engagement && source.metrics?.views) {
          totalEngagement += source.metrics.total_engagement;
          totalViews += source.metrics.views;
          validSources++;
        }
      });
      
      if (validSources > 0 && totalViews > 0) {
        const avgEngagementRate = (totalEngagement / totalViews) * 100;
        return Math.min(avgEngagementRate, 100).toFixed(1); // Cap at 100%
      }
    }
    
    // Fallback: Use trend_score as a proxy for engagement
    // trend_score is typically 0-10, so we'll use a more conservative conversion
    if (trend.trend_score > 0) {
      // Convert 0-10 score to a reasonable engagement percentage
      // Score 10 = ~10% engagement, Score 5 = ~5% engagement
      const proxyRate = trend.trend_score;
      return proxyRate.toFixed(1);
    }
    
    // Handle case where no data is available
    if (!trend.metrics || trend.metrics.total_reach === 0) {
      return 'N/A';
    }
    
    return '0.0';
  }, [trends]);

  // Filter trends based on search term and source - whole word matching
  const allFilteredTrends = useMemo(() => {
    let filtered = trends;
    
    // Filter by source first
    if (filters.source && filters.source !== 'all') {
      filtered = filtered.filter(trend => {
        const collectionSource = trend.collection_source?.toLowerCase();
        if (filters.source === 'hashtag') {
          return collectionSource === 'twitter' || collectionSource === 'x';
        }
        if (filters.source === 'rss') {
          return collectionSource === 'rss' || collectionSource === 'rss_feeds';
        }
        return collectionSource === filters.source;
      });
    }
    
    // Enhanced Twitter filtering
    if (filters.verifiedOnly) {
      filtered = filtered.filter(trend => {
        return trend.sources?.some(source => 
          (source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x') && 
          source.author_info?.verified
        );
      });
    }
    
    if (filters.viralOnly) {
      filtered = filtered.filter(trend => {
        return trend.sources?.some(source => source.is_viral);
      });
    }
    
    if (filters.hasMedia) {
      filtered = filtered.filter(trend => {
        return trend.sources?.some(source => 
          source.media?.photo && source.media.photo.length > 0
        );
      });
    }
    
    if (filters.minViews !== undefined) {
      filtered = filtered.filter(trend => {
        const maxViews = Math.max(...(trend.sources?.map(source => 
          source.metrics?.views || 0
        ) || [0]));
        return maxViews >= filters.minViews!;
      });
    }
    
    if (filters.maxViews !== undefined) {
      filtered = filtered.filter(trend => {
        const maxViews = Math.max(...(trend.sources?.map(source => 
          source.metrics?.views || 0
        ) || [0]));
        return maxViews <= filters.maxViews!;
      });
    }
    
    if (filters.minQualityScore !== undefined) {
      filtered = filtered.filter(trend => {
        const maxQuality = Math.max(...(trend.sources?.map(source => 
          source.quality_score || 0
        ) || [0]));
        return maxQuality >= filters.minQualityScore!;
      });
    }
    
    if (filters.maxQualityScore !== undefined) {
      filtered = filtered.filter(trend => {
        const maxQuality = Math.max(...(trend.sources?.map(source => 
          source.quality_score || 0
        ) || [0]));
        return maxQuality <= filters.maxQualityScore!;
      });
    }
    
    // Then filter by search term
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      
      // Create regex for whole word matching
      const createWordRegex = (term: string) => {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escapedTerm}\\b`, 'i');
      };
      
      const wordRegex = createWordRegex(searchTerm);
      
      filtered = filtered.filter(trend => {
        // Search in topic title (whole words)
        if (wordRegex.test(trend.topic)) {
          return true;
        }
        
        // Search in description (whole words)
        if (trend.description && wordRegex.test(trend.description)) {
          return true;
        }
        
        // Search in keywords (exact keyword matches)
        if (trend.keywords && trend.keywords.some(keyword => 
          keyword.toLowerCase() === searchTerm || wordRegex.test(keyword)
        )) {
          return true;
        }
        
        return false;
      });
    }
    
    return filtered;
  }, [trends, filters]);

  // Client-side pagination
  const trendsPerPage = 10;
  const filteredTrends = useMemo(() => {
    const startIndex = (currentPage - 1) * trendsPerPage;
    const endIndex = startIndex + trendsPerPage;
    return allFilteredTrends.slice(startIndex, endIndex);
  }, [allFilteredTrends, currentPage]);

  // Update total count and pages based on filtered data
  const actualTotalCount = allFilteredTrends.length;
  const actualTotalPages = Math.ceil(actualTotalCount / trendsPerPage);

  // Helper function to highlight search terms - whole word matching
  const highlightSearchTerm = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm || !searchTerm.trim()) {
      return text;
    }
    
    // Create regex for whole word highlighting
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escapedTerm}\\b)`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark> : 
        part
    );
  }, []);


  const renderPagination = () => {
    if (actualTotalPages <= 1) return null;

    const startItem = (currentPage - 1) * trendsPerPage + 1;
    const endItem = Math.min(currentPage * trendsPerPage, actualTotalCount);

    return (
      <div className="space-y-4">
        {/* Mobile pagination info */}
        <div className="text-center text-sm text-muted-foreground lg:hidden">
          Page {currentPage} of {actualTotalPages} • {actualTotalCount} total trends
        </div>
        
        {/* Desktop pagination info */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {actualTotalCount} trends
          </div>
        </div>
        
        {/* Pagination controls */}
        <div className="flex items-center justify-center lg:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          
          {/* Page numbers - responsive display */}
          <div className="flex items-center gap-1">
            {/* Mobile: Show 3 pages max */}
            <div className="flex items-center gap-1 sm:hidden">
              {Array.from({ length: Math.min(actualTotalPages, 3) }, (_, i) => {
                let pageNum;
                if (actualTotalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage <= 2) {
                  pageNum = i + 1;
                } else if (currentPage >= actualTotalPages - 1) {
                  pageNum = actualTotalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }

                return (
                  <Button
                    type="button"
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-9 h-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            {/* Desktop: Show 5 pages max */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(actualTotalPages, 5) }, (_, i) => {
                let pageNum;
                if (actualTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= actualTotalPages - 2) {
                  pageNum = actualTotalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    type="button"
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === actualTotalPages}
            className="px-3"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load trends</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Left Column: Filters and Search */}
      <div className="lg:col-span-1 space-y-4">
        {/* Filters */}
        <TrendFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          industries={industries}
          statuses={statuses}
          onLoadTopics={onLoadTopics}
          disabled={disabled}
        />

        {/* Search Section - Between filters and results */}
        {filters.industry && totalCount > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Topics
                </Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Search topics by name or keywords..."
                    value={filters.search || ""}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="h-9"
                    disabled={disabled}
                  />
                  {filters.search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => onFiltersChange({ ...filters, search: "" })}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {filters.search && (
                  <p className="text-xs text-muted-foreground">
                    {actualTotalCount} of {totalCount} topics match your search
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Trending Topics Table */}
      <div className="lg:col-span-1">
        {/* Trending Topics Table with Source Filter Tabs */}
        <Tabs 
          value={filters.source || 'all'} 
          onValueChange={(value) => onFiltersChange({ ...filters, source: value === 'all' ? undefined : value })}
          className="w-full"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Trending Topics
                  {!loading && (
                    <Badge variant="secondary">
                      {filters.search ? 
                        `${actualTotalCount} of ${totalCount}` : 
                        `${totalCount} total`
                      }
                    </Badge>
                  )}
                </CardTitle>
              </div>

              {/* Source Filter Tabs */}
              {filters.industry && totalCount > 0 && (
                <TabsList className="grid w-full mt-4" style={{ gridTemplateColumns: `repeat(${sourceTypes.length + 1}, minmax(0, 1fr))` }}>
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All ({totalCount})
                  </TabsTrigger>
                  {sourceTypes.map(source => (
                    <TabsTrigger key={source.value} value={source.value} className="text-xs sm:text-sm">
                      {source.label} ({source.count})
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}

              {/* Selection Info */}
              {selectedTrendIds.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="default" className="gap-1">
                    1 topic selected
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onTrendSelection([])}
                    className="h-6 text-xs"
                    disabled={disabled}
                  >
                    Clear selection
                  </Button>
                </div>
              )}
            </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          ) : actualTotalCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {filters.search ? 
                  `No trends found matching "${filters.search}"` : 
                  "No trends found matching your criteria"
                }
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ sortBy: "trend_score", sortOrder: "desc" })}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              
              {filteredTrends.map((trend) => {
                const isSelected = selectedTrendIds.includes(trend.id);
                const isExpanded = expandedRows.has(trend.id);
                
                return (
                  <div key={trend.id} className={cn(
                    "border rounded-lg transition-all duration-200",
                    !disabled && "hover:shadow-md cursor-pointer active:scale-[0.99]",
                    disabled && "opacity-60 cursor-not-allowed",
                    isSelected && "ring-2 ring-primary bg-primary/5 shadow-md"
                  )}>
                    {/* Mobile/Tablet Layout */}
                    <div className="lg:hidden">
                      <div className="p-3">
                        {/* Main Title Section - Full Width */}
                        <div 
                          className="cursor-pointer"
                          onClick={disabled ? undefined : () => handleRowSelect(trend.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-3">
                              <h3 className="font-semibold text-base leading-tight mb-1">
                                {filters.search ? 
                                  highlightSearchTerm(trend.topic, filters.search) : 
                                  trend.topic
                                }
                              </h3>
                              <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                                {filters.search ? 
                                  highlightSearchTerm(trend.description || "", filters.search) : 
                                  trend.description
                                }
                              </p>
                            </div>
                            
                            {isSelected && (
                              <Badge variant="default" className="flex-shrink-0 text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Accordion Toggle for Details */}
                        <button 
                          className="w-full flex items-center justify-between py-2 mt-2 border-t text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(trend.id);
                          }}
                        >
                          <span>View details</span>
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>

                        {/* Expandable Details */}
                        {isExpanded && (
                          <div className="space-y-4 pt-3">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className={cn(
                                  "inline-flex items-center justify-center px-3 py-2 rounded-full text-sm font-bold mb-1",
                                  trend.trend_score >= 8 ? "bg-green-100 text-green-800" :
                                  trend.trend_score >= 6 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                )}>
                                  {getTrendScore(trend)}
                                </div>
                                <div className="text-xs text-muted-foreground">Score</div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-lg font-bold mb-1">
                                  {getReachDisplay(trend)}
                                </div>
                                <div className="text-xs text-muted-foreground">Reach</div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-lg font-bold mb-1">
                                  {getEngagementRate(trend) === 'N/A' ? 'N/A' : `${getEngagementRate(trend)}%`}
                                </div>
                                <div className="text-xs text-muted-foreground">Engagement</div>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Industry:</span>
                                <span className="font-medium">{trend.industry}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Discovered:</span>
                                <span className="font-medium">{new Date(trend.discovered_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Keywords */}
                            {trend.keywords && trend.keywords.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium">Keywords</h4>
                                <div className="flex flex-wrap gap-1">
                                  {(expandedKeywords.has(trend.id) ? trend.keywords : trend.keywords.slice(0, 3)).map((keyword, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                  {trend.keywords.length > 3 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs cursor-pointer hover:bg-secondary/80"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleKeywordsExpand(trend.id);
                                      }}
                                    >
                                      {expandedKeywords.has(trend.id) ? 'Less' : `+${trend.keywords.length - 3}`}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Sources */}
                            {trend.sources && trend.sources.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium">Sources</h4>
                                <div className="space-y-2">
                                  {trend.sources.slice(0, 3).map((source, idx) => {
                                    const isTwitter = source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x';
                                    
                                    return (
                                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                                        {isTwitter && source.author_info ? (
                                          // Rich Twitter source display
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 mb-1">
                                              <span className="font-medium truncate">
                                                @{source.author_info.username}
                                              </span>
                                              {source.author_info.verified && (
                                                <span className="text-blue-500 text-xs">✓</span>
                                              )}
                                              {source.quality_score && source.quality_score >= 8 && (
                                                <Badge className="text-xs bg-green-100 text-green-800 border-green-200 px-1 py-0">
                                                  High Quality
                                                </Badge>
                                              )}
                                              {source.is_viral && (
                                                <Badge className="text-xs bg-red-100 text-red-800 border-red-200 px-1 py-0">
                                                  🔥 Viral
                                                </Badge>
                                              )}
                                            </div>
                                            {source.metrics && (
                                              <div className="text-muted-foreground text-xs">
                                                {source.metrics.views?.toLocaleString() || '0'} views • {' '}
                                                {source.metrics.like_count?.toLocaleString() || '0'} likes
                                                {source.metrics.bookmarks > 0 && (
                                                  <> • {source.metrics.bookmarks.toLocaleString()} bookmarks</>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          // Standard source display for non-Twitter sources
                                          <div className="flex-1 min-w-0">
                                            <Badge variant="outline" className="text-xs">
                                              {source.platform === 'twitter' || source.platform === 'x' ? 'Twitter' :
                                               source.platform === 'reddit' ? 'Reddit' :
                                               source.platform === 'rss' ? 'RSS' :
                                               source.platform === 'linkup' ? 'LinkUp' :
                                               source.platform}
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {trend.sources.length > 3 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{trend.sources.length - 3} more sources
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:block">
                      <div className="p-3">
                        {/* Row 1: Title Section */}
                        <div 
                          className="cursor-pointer"
                          onClick={disabled ? undefined : () => handleRowSelect(trend.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-3">
                              <h3 className="font-semibold text-base leading-tight">
                                {filters.search ? 
                                  highlightSearchTerm(trend.topic, filters.search) : 
                                  trend.topic
                                }
                              </h3>
                            </div>
                            
                            {/* Selection Badge */}
                            {isSelected && (
                              <Badge variant="default" className="flex-shrink-0 text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                          
                          {/* Row 2: Metrics - More Compact */}
                          <div className="flex items-center gap-4">
                            {/* Score */}
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold",
                                trend.trend_score >= 8 ? "bg-green-100 text-green-800" :
                                trend.trend_score >= 6 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {getTrendScore(trend)}
                              </div>
                              <span className="text-xs text-muted-foreground">Score</span>
                            </div>
                            
                            {/* Reach */}
                            <div className="flex items-center gap-1">
                              <div className="text-sm font-semibold">
                                {getReachDisplay(trend)}
                              </div>
                              <span className="text-xs text-muted-foreground">Reach</span>
                            </div>
                            
                            {/* Engagement */}
                            <div className="flex items-center gap-1">
                              <div className="text-sm font-semibold">
                                {getEngagementRate(trend) === 'N/A' ? 'N/A' : `${getEngagementRate(trend)}%`}
                              </div>
                              <span className="text-xs text-muted-foreground">Engagement</span>
                            </div>
                          </div>
                        </div>

                        {/* Accordion Toggle for Additional Details */}
                        <button 
                          type="button"
                          className="w-full flex items-center justify-between py-2 mt-2 border-t text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            toggleRowExpansion(trend.id);
                          }}
                        >
                          <span>Additional details</span>
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>

                        {/* Expandable Additional Details */}
                        {isExpanded && (
                          <div className="space-y-4 pt-3">
                            {/* Description */}
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {filters.search ? 
                                  highlightSearchTerm(trend.description || "", filters.search) : 
                                  trend.description
                                }
                              </p>
                            </div>

                            {/* Industry and Discovery Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Industry:</span>
                                <span className="font-medium">{trend.industry}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Discovered:</span>
                                <span className="font-medium">{new Date(trend.discovered_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Keywords and Sources */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Keywords */}
                              {trend.keywords && trend.keywords.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Keywords</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {(expandedKeywords.has(trend.id) ? trend.keywords : trend.keywords.slice(0, 5)).map((keyword, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                    {trend.keywords.length > 5 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs cursor-pointer hover:bg-secondary/80"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          toggleKeywordsExpand(trend.id);
                                        }}
                                      >
                                        {expandedKeywords.has(trend.id) ? 'Show less' : `+${trend.keywords.length - 5} more`}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Sources */}
                              {trend.sources && trend.sources.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Sources</h4>
                                  <div className="space-y-2">
                                    {trend.sources.slice(0, 3).map((source, idx) => {
                                      const isTwitter = source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x';
                                      
                                      return (
                                        <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                                          {isTwitter && source.author_info ? (
                                            // Rich Twitter source display
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1 mb-1">
                                                <span className="font-medium truncate">
                                                  @{source.author_info.username}
                                                </span>
                                                {source.author_info.verified && (
                                                  <span className="text-blue-500 text-xs">✓</span>
                                                )}
                                                {source.quality_score && source.quality_score >= 8 && (
                                                  <Badge className="text-xs bg-green-100 text-green-800 border-green-200 px-1 py-0">
                                                    High Quality
                                                  </Badge>
                                                )}
                                                {source.is_viral && (
                                                  <Badge className="text-xs bg-red-100 text-red-800 border-red-200 px-1 py-0">
                                                    🔥 Viral
                                                  </Badge>
                                                )}
                                              </div>
                                              {source.metrics && (
                                                <div className="text-muted-foreground text-xs">
                                                  {source.metrics.views?.toLocaleString() || '0'} views • {' '}
                                                  {source.metrics.like_count?.toLocaleString() || '0'} likes
                                                  {source.metrics.bookmarks > 0 && (
                                                    <> • {source.metrics.bookmarks.toLocaleString()} bookmarks</>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            // Standard source display for non-Twitter sources
                                            <div className="flex-1 min-w-0">
                                              <Badge variant="outline" className="text-xs">
                                                {source.platform === 'twitter' || source.platform === 'x' ? 'Twitter' :
                                                 source.platform === 'reddit' ? 'Reddit' :
                                                 source.platform === 'rss' ? 'RSS' :
                                                 source.platform === 'linkup' ? 'LinkUp' :
                                                 source.platform}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {trend.sources.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{trend.sources.length - 3} more sources
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredTrends.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              {renderPagination()}
            </div>
          )}
        </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}