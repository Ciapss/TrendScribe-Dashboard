"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TwitterVerificationBadgeProps {
  verified: boolean;
  className?: string;
}

export function TwitterVerificationBadge({ verified, className }: TwitterVerificationBadgeProps) {
  if (!verified) return null;
  
  return (
    <span className={cn("text-blue-500 inline-flex items-center", className)}>
      <svg 
        viewBox="0 0 24 24" 
        className="w-4 h-4 fill-current"
        aria-label="Verified account"
      >
        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
      </svg>
    </span>
  );
}

interface QualityScoreBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

export function QualityScoreBadge({ score, className, showLabel = false }: QualityScoreBadgeProps) {
  const getQualityColor = (score: number): string => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getQualityLabel = (score: number): string => {
    if (score >= 8) return "High Quality";
    if (score >= 6) return "Good Quality";
    return "Low Quality";
  };

  return (
    <Badge 
      className={cn("text-xs", getQualityColor(score), className)}
      title={`Quality Score: ${score.toFixed(1)}/10`}
    >
      {showLabel ? getQualityLabel(score) : score.toFixed(1)}
    </Badge>
  );
}

interface ViralBadgeProps {
  isViral: boolean;
  className?: string;
}

export function ViralBadge({ isViral, className }: ViralBadgeProps) {
  if (!isViral) return null;
  
  return (
    <Badge className={cn("text-xs bg-red-100 text-red-800 border-red-200", className)}>
      🔥 Viral
    </Badge>
  );
}

interface EngagementMetricsProps {
  metrics: {
    views?: number;
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    bookmarks?: number;
    total_engagement?: number;
  };
  compact?: boolean;
  className?: string;
}

export function EngagementMetrics({ metrics, compact = false, className }: EngagementMetricsProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  const getEngagementRate = (): string => {
    if (metrics.views && metrics.total_engagement) {
      const rate = (metrics.total_engagement / metrics.views) * 100;
      return `${Math.min(rate, 100).toFixed(1)}%`;
    }
    return 'N/A';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
        {metrics.views && (
          <span>{formatNumber(metrics.views)} views</span>
        )}
        {metrics.like_count && (
          <span>{formatNumber(metrics.like_count)} likes</span>
        )}
        <span>{getEngagementRate()}</span>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs", className)}>
      {metrics.views && (
        <div className="space-y-1">
          <div className="text-muted-foreground">Views</div>
          <div className="font-semibold">{formatNumber(metrics.views)}</div>
        </div>
      )}
      {metrics.like_count && (
        <div className="space-y-1">
          <div className="text-muted-foreground">Likes</div>
          <div className="font-semibold">{formatNumber(metrics.like_count)}</div>
        </div>
      )}
      {metrics.retweet_count && (
        <div className="space-y-1">
          <div className="text-muted-foreground">Retweets</div>
          <div className="font-semibold">{formatNumber(metrics.retweet_count)}</div>
        </div>
      )}
      {metrics.bookmarks && (
        <div className="space-y-1">
          <div className="text-muted-foreground">Bookmarks</div>
          <div className="font-semibold">{formatNumber(metrics.bookmarks)}</div>
        </div>
      )}
    </div>
  );
}