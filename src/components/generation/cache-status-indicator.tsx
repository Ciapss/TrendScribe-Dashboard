"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Zap } from "lucide-react";
import type { CacheStatusInfo } from "@/types";

interface CacheStatusIndicatorProps {
  cacheInfo?: CacheStatusInfo;
  className?: string;
}

export function CacheStatusIndicator({ cacheInfo, className }: CacheStatusIndicatorProps) {
  if (!cacheInfo) {
    return null;
  }

  const getStatusBadge = () => {
    if (cacheInfo.cache_hit) {
      if (cacheInfo.cache_status === 'fresh') {
        return (
          <Badge variant="default" className="flex items-center gap-1 text-xs">
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Used cached research ({cacheInfo.cache_age}h old)</span>
            <span className="sm:hidden">Cached ({cacheInfo.cache_age}h)</span>
          </Badge>
        );
      } else if (cacheInfo.cache_status === 'stale') {
        return (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Used stale cached research ({cacheInfo.cache_age}h old)</span>
            <span className="sm:hidden">Stale ({cacheInfo.cache_age}h)</span>
          </Badge>
        );
      }
    }
    
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-xs">
        <Clock className="h-3 w-3" />
        <span className="hidden sm:inline">Fresh research conducted</span>
        <span className="sm:hidden">Fresh</span>
      </Badge>
    );
  };

  const getSavingsInfo = () => {
    if (cacheInfo.cache_hit && cacheInfo.cost_saved && cacheInfo.cost_saved > 0) {
      return (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Saved ~${cacheInfo.cost_saved.toFixed(3)}
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${className}`}>
      {getStatusBadge()}
      {getSavingsInfo()}
    </div>
  );
}