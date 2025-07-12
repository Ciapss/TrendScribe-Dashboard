"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Filter, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import type { TrendFilters, Industry } from "@/types";

interface TrendFiltersProps {
  filters: TrendFilters;
  onFiltersChange: (filters: TrendFilters) => void;
  industries: string[];
  statuses: string[];
  onLoadTopics?: () => void;
  onConfigureSources?: () => void;
  disabled?: boolean;
  className?: string;
}

export function TrendFilters({
  filters,
  onFiltersChange,
  onLoadTopics,
  disabled = false,
  className,
}: TrendFiltersProps) {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(true);

  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const data = await apiClient.getIndustries();
        setIndustries(data);
      } catch (error) {
        console.error('Failed to load industries:', error);
        // Fallback to static industries for backward compatibility
        const fallbackIndustries: Industry[] = INDUSTRIES.map(key => ({
          id: key,
          name: INDUSTRY_LABELS[key],
          description: `${INDUSTRY_LABELS[key]} industry`,
          keywords: [],
          common_categories: [],
          default_subreddits: [],
          is_built_in: true,
          is_custom: false,
          created_at: '',
          updated_at: ''
        }));
        setIndustries(fallbackIndustries);
      } finally {
        setIsLoadingIndustries(false);
      }
    };

    loadIndustries();
  }, []);

  const updateFilter = (key: keyof TrendFilters, value: string | number | boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof TrendFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      sortBy: "trend_score",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters = Object.keys(filters).some(
    key => key !== "sortBy" && key !== "sortOrder" && filters[key as keyof TrendFilters]
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Topic Selection
          </CardTitle>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs"
              disabled={disabled}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Industry Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Industry</Label>
            <Select
              value={filters.industry || ""}
              onValueChange={(value) => {
                if (value) {
                  updateFilter("industry", value);
                } else {
                  clearFilter("industry");
                }
                // Clear search when industry changes
                if (filters.search) {
                  clearFilter("search");
                }
              }}
              disabled={isLoadingIndustries || disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={isLoadingIndustries ? "Loading..." : "Select industry"} />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.name} value={industry.name}>
                    {industry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium invisible">Action</Label>
            <Button 
              type="button"
              variant="default" 
              size="sm" 
              className="h-9 w-full"
              disabled={!filters.industry || disabled}
              onClick={() => {
                if (onLoadTopics && filters.industry) {
                  onLoadTopics();
                }
              }}
            >
              Load Topics
            </Button>
          </div>
        </div>

        {/* Search - only show when industry is selected */}
        {filters.industry && (
          <div className="space-y-1">
            <Label htmlFor="search" className="text-sm font-medium">Search Topics</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search topics by name or keywords..."
                value={filters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="h-9"
                disabled={disabled}
              />
              {filters.search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => clearFilter("search")}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Filters</Label>
            <div className="flex flex-wrap gap-1">
              {filters.search && (
                <Badge variant="secondary" className="gap-1 h-6">
                  Search: {filters.search}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => clearFilter("search")}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.industry && (
                <Badge variant="secondary" className="gap-1 h-6">
                  Industry: {filters.industry}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => clearFilter("industry")}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}