"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Filter, RotateCcw } from "lucide-react";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import type { TrendFilters } from "@/types";

interface TrendFiltersProps {
  filters: TrendFilters;
  onFiltersChange: (filters: TrendFilters) => void;
  industries: string[];
  statuses: string[];
  onLoadTopics?: () => void;
  onConfigureSources?: () => void;
  className?: string;
}

export function TrendFilters({
  filters,
  onFiltersChange,
  onLoadTopics,
  className,
}: TrendFiltersProps) {
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
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {INDUSTRY_LABELS[industry]}
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
              disabled={!filters.industry}
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
              />
              {filters.search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => clearFilter("search")}
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