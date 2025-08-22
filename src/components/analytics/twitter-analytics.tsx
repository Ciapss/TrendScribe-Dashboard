"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Heart, Repeat2, Bookmark, Users, TrendingUp, Star } from "lucide-react";
import type { Trend } from "@/types";

interface TwitterAnalyticsProps {
  trends: Trend[];
  className?: string;
}

export function TwitterAnalytics({ trends, className }: TwitterAnalyticsProps) {
  // Filter for Twitter trends only
  const twitterTrends = trends.filter(trend => 
    trend.sources?.some(source => 
      source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x'
    )
  );

  if (twitterTrends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🐦 Twitter Analytics
          </CardTitle>
          <CardDescription>
            No Twitter trends available for analysis
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate Twitter-specific metrics
  const twitterSources = twitterTrends.flatMap(trend => 
    trend.sources?.filter(source => 
      source.platform?.toLowerCase() === 'twitter' || source.platform?.toLowerCase() === 'x'
    ) || []
  );

  const totalViews = twitterSources.reduce((sum, source) => sum + (source.metrics?.views || 0), 0);
  const totalLikes = twitterSources.reduce((sum, source) => sum + (source.metrics?.like_count || 0), 0);
  const totalRetweets = twitterSources.reduce((sum, source) => sum + (source.metrics?.retweet_count || 0), 0);
  const totalBookmarks = twitterSources.reduce((sum, source) => sum + (source.metrics?.bookmarks || 0), 0);
  const totalEngagement = twitterSources.reduce((sum, source) => sum + (source.metrics?.total_engagement || 0), 0);

  const verifiedCount = twitterSources.filter(source => source.author_info?.verified).length;
  const viralCount = twitterSources.filter(source => source.is_viral).length;
  const withMediaCount = twitterSources.filter(source => source.media?.photo && source.media.photo.length > 0).length;

  const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
  
  // Quality score distribution
  const qualityScores = twitterSources
    .map(source => source.quality_score)
    .filter((score): score is number => score !== undefined);
  
  const avgQualityScore = qualityScores.length > 0 
    ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
    : 0;

  const highQualityCount = qualityScores.filter(score => score >= 8).length;
  const mediumQualityCount = qualityScores.filter(score => score >= 6 && score < 8).length;
  const lowQualityCount = qualityScores.filter(score => score < 6).length;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🐦 Twitter Analytics
        </CardTitle>
        <CardDescription>
          Insights from {twitterTrends.length} Twitter trends with {twitterSources.length} total sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div className="font-bold text-lg">{formatNumber(totalViews)}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div className="font-bold text-lg">{formatNumber(totalLikes)}</div>
            <div className="text-xs text-muted-foreground">Total Likes</div>
          </div>
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <Repeat2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="font-bold text-lg">{formatNumber(totalRetweets)}</div>
            <div className="text-xs text-muted-foreground">Total Retweets</div>
          </div>
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-purple-500" />
            </div>
            <div className="font-bold text-lg">{formatNumber(totalBookmarks)}</div>
            <div className="text-xs text-muted-foreground">Total Bookmarks</div>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Average Engagement Rate</span>
            </div>
            <span className="text-sm font-bold">{avgEngagementRate.toFixed(2)}%</span>
          </div>
          <Progress value={Math.min(avgEngagementRate * 10, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {avgEngagementRate > 5 ? "Excellent engagement!" : 
             avgEngagementRate > 2 ? "Good engagement" : 
             "Consider focusing on higher-engagement content"}
          </div>
        </div>

        {/* Quality Score Distribution */}
        {qualityScores.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Content Quality Distribution</span>
              <Badge variant="outline" className="text-xs">
                Avg: {avgQualityScore.toFixed(1)}/10
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">High Quality (8-10)</span>
                <span className="font-medium">{highQualityCount} sources</span>
              </div>
              <Progress 
                value={(highQualityCount / qualityScores.length) * 100} 
                className="h-2 bg-green-100"
              />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-700">Medium Quality (6-8)</span>
                <span className="font-medium">{mediumQualityCount} sources</span>
              </div>
              <Progress 
                value={(mediumQualityCount / qualityScores.length) * 100} 
                className="h-2 bg-yellow-100"
              />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700">Low Quality (&lt;6)</span>
                <span className="font-medium">{lowQualityCount} sources</span>
              </div>
              <Progress 
                value={(lowQualityCount / qualityScores.length) * 100} 
                className="h-2 bg-red-100"
              />
            </div>
          </div>
        )}

        {/* Content Insights */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center space-y-1">
            <div className="text-sm font-medium text-blue-600">
              {((verifiedCount / twitterSources.length) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Verified Authors</div>
          </div>
          
          <div className="text-center space-y-1">
            <div className="text-sm font-medium text-red-600">
              {((viralCount / twitterSources.length) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Viral Content</div>
          </div>
          
          <div className="text-center space-y-1">
            <div className="text-sm font-medium text-purple-600">
              {((withMediaCount / twitterSources.length) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">With Media</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}