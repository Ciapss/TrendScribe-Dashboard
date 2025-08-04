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
    const sources = [...new Set(trends.map(trend => trend.collection_source?.toLowerCase()).filter(Boolean))] as string[];
    
    const sourceMap = sources.map(source => {
      if (source === 'twitter' || source === 'x') return { value: 'hashtag', label: 'Hashtag', count: 0 };
      if (source === 'reddit') return { value: 'reddit', label: 'Reddit', count: 0 };
      if (source === 'rss' || source === 'rss_feeds') return { value: 'rss', label: 'RSS', count: 0 };
      if (source === 'linkup') return { value: 'linkup', label: 'LinkUp', count: 0 };
      return { value: source, label: source.charAt(0).toUpperCase() + source.slice(1), count: 0 };
    });
    
    // Remove duplicates and count occurrences from all trends (not filtered by search)
    const uniqueSources = sourceMap.reduce((acc, source) => {
      const existing = acc.find(s => s.value === source.value);
      if (existing) {
        existing.count++;
      } else {
        source.count = trends.filter(trend => {
          const collectionSource = trend.collection_source?.toLowerCase();
          if (source.value === 'hashtag') {
            return collectionSource === 'twitter' || collectionSource === 'x';
          }
          return collectionSource === source.value;
        }).length;
        acc.push(source);
      }
      return acc;
    }, [] as Array<{ value: string; label: string; count: number }>);
    
    return uniqueSources.sort((a, b) => b.count - a.count);
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

  const calculateEngagement = useCallback((trend: Trend) => {
    const totalMentions = trend.sources?.reduce((sum, source) => {
      const mentions = source.mentions || 0;
      return sum + mentions;
    }, 0) || 0;
    
    // Calculate average engagement as a percentage (0-100)
    const avgEngagement = trend.sources && trend.sources.length > 0 
      ? trend.sources.reduce((sum, source) => {
          const engagement = source.engagement_score || 0;
          return sum + engagement;
        }, 0) / trend.sources.length 
      : 0;
    
    // Convert to reasonable percentage if it's too large
    const normalizedEngagement = avgEngagement > 100 ? (avgEngagement / 1000) : avgEngagement;
    
    return { totalMentions, avgEngagement: normalizedEngagement };
  }, []);

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
        return collectionSource === filters.source;
      });
    }
    
    // Then filter by search term
    if (!filters.search || !filters.search.trim()) {
      return filtered;
    }
    
    const searchTerm = filters.search.toLowerCase().trim();
    
    // Create regex for whole word matching
    const createWordRegex = (term: string) => {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escapedTerm}\\b`, 'i');
    };
    
    const wordRegex = createWordRegex(searchTerm);
    
    return filtered.filter(trend => {
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
  }, [trends, filters.search, filters.source]);

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
                const { totalMentions, avgEngagement } = calculateEngagement(trend);
                
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
                                  {trend.trend_score.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">Score</div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-lg font-bold mb-1">
                                  {totalMentions.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">Mentions</div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-lg font-bold mb-1">
                                  {avgEngagement.toFixed(1)}%
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
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    // Get platform from trend-level collection_source field
                                    const collectionSource = trend.collection_source;
                                    
                                    if (collectionSource) {
                                      // Map platform names to user-friendly labels
                                      const getPlatformLabel = (platform: string) => {
                                        const lower = platform.toLowerCase();
                                        if (lower === 'twitter' || lower === 'x') return 'hashtag';
                                        if (lower === 'reddit') return 'reddit';
                                        if (lower === 'rss' || lower === 'rss_feeds') return 'rss';
                                        if (lower === 'linkup') return 'linkup';
                                        return lower;
                                      };
                                      
                                      return [
                                        <Badge key={0} variant="outline" className="text-xs">
                                          {getPlatformLabel(collectionSource)}
                                        </Badge>
                                      ];
                                    }
                                    
                                    // Fallback to "Unknown" if no collection_source found
                                    return [
                                      <Badge key={0} variant="outline" className="text-xs">
                                        unknown
                                      </Badge>
                                    ];
                                  })()}
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
                                {trend.trend_score.toFixed(1)}
                              </div>
                              <span className="text-xs text-muted-foreground">Score</span>
                            </div>
                            
                            {/* Mentions */}
                            <div className="flex items-center gap-1">
                              <div className="text-sm font-semibold">
                                {totalMentions.toLocaleString()}
                              </div>
                              <span className="text-xs text-muted-foreground">Mentions</span>
                            </div>
                            
                            {/* Engagement */}
                            <div className="flex items-center gap-1">
                              <div className="text-sm font-semibold">
                                {avgEngagement.toFixed(1)}%
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
                                  <div className="flex flex-wrap gap-1">
                                    {(() => {
                                      // Get platform from trend-level collection_source field
                                      const collectionSource = trend.collection_source;
                                      
                                      if (collectionSource) {
                                        // Map platform names to user-friendly labels
                                        const getPlatformLabel = (platform: string) => {
                                          const lower = platform.toLowerCase();
                                          if (lower === 'twitter' || lower === 'x') return 'hashtag';
                                          if (lower === 'reddit') return 'reddit';
                                          if (lower === 'rss' || lower === 'rss_feeds') return 'rss';
                                          if (lower === 'linkup') return 'linkup';
                                          return lower;
                                        };
                                        
                                        return [
                                          <Badge key={0} variant="outline" className="text-xs">
                                            {getPlatformLabel(collectionSource)}
                                          </Badge>
                                        ];
                                      }
                                      
                                      // Fallback to "Unknown" if no collection_source found
                                      return [
                                        <Badge key={0} variant="outline" className="text-xs">
                                          unknown
                                        </Badge>
                                      ];
                                    })()}
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