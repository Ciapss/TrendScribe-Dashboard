"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, MessageCircle, Repeat2, Bookmark, Eye, Users } from "lucide-react";
import { TwitterVerificationBadge, QualityScoreBadge, ViralBadge, EngagementMetrics } from "@/components/ui/twitter-badge";
import type { TrendSource } from "@/types";
import { cn } from "@/lib/utils";

interface TwitterTrendCardProps {
  source: TrendSource;
  className?: string;
  compact?: boolean;
}

export function TwitterTrendCard({ source, className, compact = false }: TwitterTrendCardProps) {
  const isTwitter = source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x';
  
  // Only render for Twitter sources with enhanced data
  if (!isTwitter || !source.author_info) {
    return null;
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  const getEngagementRate = (): string => {
    if (source.metrics?.views && source.metrics?.total_engagement) {
      const rate = (source.metrics.total_engagement / source.metrics.views) * 100;
      return `${Math.min(rate, 100).toFixed(1)}%`;
    }
    return 'N/A';
  };

  if (compact) {
    return (
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={source.author_info.profile_image_url} alt={source.author_info.display_name} />
              <AvatarFallback className="text-xs">
                {source.author_info.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-medium text-sm truncate">
                  {source.author_info.display_name}
                </span>
                <TwitterVerificationBadge verified={source.author_info.verified} />
                <span className="text-muted-foreground text-xs">
                  @{source.author_info.username}
                </span>
              </div>
              
              {source.text && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {source.text.substring(0, 120)}
                  {source.text.length > 120 && '...'}
                </p>
              )}
              
              {source.metrics && (
                <EngagementMetrics metrics={source.metrics} compact={true} />
              )}
            </div>
            
            <div className="flex flex-col gap-1 items-end">
              {source.quality_score && (
                <QualityScoreBadge score={source.quality_score} className="px-1 py-0" />
              )}
              <ViralBadge isViral={source.is_viral || false} className="px-1 py-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-4">
        {/* Header - Author Info */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={source.author_info.profile_image_url} alt={source.author_info.display_name} />
            <AvatarFallback>
              {source.author_info.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">
                {source.author_info.display_name}
              </h3>
              <TwitterVerificationBadge verified={source.author_info.verified} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {formatNumber(source.author_info.followers_count)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              @{source.author_info.username}
              {source.author_info.location && (
                <> • {source.author_info.location}</>
              )}
            </p>
          </div>
          
          <div className="flex flex-col gap-1 items-end">
            {source.quality_score && (
              <QualityScoreBadge score={source.quality_score} showLabel={true} />
            )}
            <ViralBadge isViral={source.is_viral || false} />
          </div>
        </div>

        {/* Tweet Content */}
        {source.text && (
          <div className="mb-3">
            <p className="text-sm leading-relaxed">
              {source.text}
            </p>
          </div>
        )}

        {/* Media Preview */}
        {source.media?.photo && source.media.photo.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2">
              {source.media.photo.slice(0, 4).map((photo, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={photo.media_url_https}
                    alt="Tweet media"
                    className="w-full h-24 object-cover rounded border"
                  />
                  {idx === 3 && source.media!.photo!.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        +{source.media!.photo!.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Metrics */}
        {source.metrics && (
          <div className="space-y-2">
            <EngagementMetrics metrics={source.metrics} compact={false} />
            
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Engagement: {getEngagementRate()}</span>
                {source.created_at && (
                  <span>
                    {new Date(source.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {source.url && (
                <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tweet Metadata */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {source.language && (
              <Badge variant="outline" className="text-xs">
                {source.language.toUpperCase()}
              </Badge>
            )}
            {source.source && (
              <span>via {source.source}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}