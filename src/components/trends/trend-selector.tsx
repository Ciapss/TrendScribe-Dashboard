"use client";

import { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendFilters } from "./trend-filters";
import type { Trend, TrendFilters as TrendFiltersType } from "@/types";
import { ChevronDown, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendSelectorProps {
  trends: Trend[];
  selectedTrendIds: string[];
  onTrendSelection: (trendIds: string[]) => void;
  loading?: boolean;
  error?: string;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  filters: TrendFiltersType;
  onFiltersChange: (filters: TrendFiltersType) => void;
  onLoadTopics?: () => void;
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
  totalPages,
  onPageChange,
  filters,
  onFiltersChange,
  onLoadTopics,
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


  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * 10 + 1;
    const endItem = Math.min(currentPage * 10, totalCount);

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {totalCount} trends
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  type="button"
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
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
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      <TrendFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        industries={industries}
        statuses={statuses}
        onLoadTopics={onLoadTopics}
      />

      {/* Trending Topics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Trending Topics
              {!loading && (
                <Badge variant="secondary">
                  {totalCount} total
                </Badge>
              )}
            </CardTitle>
          </div>

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
          ) : trends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trends found matching your criteria</p>
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
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <TooltipProvider>
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 p-3 border-b font-medium text-sm bg-muted/50 sticky top-0 z-10">
                  <div>Topic</div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center w-16 flex items-center justify-center gap-1 cursor-help">
                        Score
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Trend score based on multiple factors including engagement, 
                        recency, and relevance. Scale: 0-10 (higher is better).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center w-20 flex items-center justify-center gap-1 cursor-help">
                        Mentions
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Total mentions across all sources (Reddit upvotes, comments, 
                        social media interactions, etc.) for this topic.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center w-24 flex items-center justify-center gap-1 cursor-help">
                        Engagement
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Average engagement rate calculated from source interactions 
                        (likes, shares, comments) relative to reach.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="w-8"></div>
                </div>
              </TooltipProvider>
              
              {trends.map((trend) => {
                const isSelected = selectedTrendIds.includes(trend.id);
                const isExpanded = expandedRows.has(trend.id);
                const { totalMentions, avgEngagement } = calculateEngagement(trend);
                
                return (
                  <div key={trend.id} className="border-b last:border-b-0">
                    {/* Main Row */}
                    <div 
                      className={cn(
                        "grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        isSelected && "bg-blue-50 border-l-4 border-l-blue-500"
                      )}
                      onClick={() => toggleRowExpansion(trend.id)}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{trend.topic}</div>
                        <div className="text-xs text-muted-foreground truncate">{trend.description}</div>
                      </div>
                      
                      <div className="text-center w-16">
                        <div className={cn(
                          "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold",
                          trend.trend_score >= 8 ? "bg-green-100 text-green-800" :
                          trend.trend_score >= 6 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        )}>
                          {trend.trend_score.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="text-center w-20 text-sm">
                        {totalMentions.toLocaleString()}
                      </div>
                      
                      <div className="text-center w-24 text-sm">
                        {avgEngagement.toFixed(1)}%
                      </div>
                      
                      <button 
                        className="w-8 h-8 flex items-center justify-center"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 bg-muted/25 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Details</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-muted-foreground">Industry:</span> {trend.industry}</div>
                              <div><span className="text-muted-foreground">Mentions:</span> {totalMentions.toLocaleString()}</div>
                              <div><span className="text-muted-foreground">Discovered:</span> {new Date(trend.discovered_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Keywords & Sources</h4>
                            <div className="space-y-2">
                              {trend.keywords && trend.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {(expandedKeywords.has(trend.id) ? trend.keywords : trend.keywords.slice(0, 5)).map((keyword, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                  {trend.keywords.length > 5 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleKeywordsExpand(trend.id);
                                      }}
                                    >
                                      {expandedKeywords.has(trend.id) ? 'Show less' : `+${trend.keywords.length - 5} more`}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {trend.sources && trend.sources.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {[...new Set(trend.sources.map(s => s.platform || 'Unknown'))].slice(0, 3).map((platform, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {platform}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleRowSelect(trend.id);
                            }}
                            variant={isSelected ? "default" : "outline"}
                          >
                            {isSelected ? "Selected" : "Select Topic"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && trends.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              {renderPagination()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}