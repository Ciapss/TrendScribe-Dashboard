"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Clock, TrendingUp, Users, Calendar } from "lucide-react";
import type { Trend } from "@/types";
import { useState } from "react";

interface TrendCardProps {
  trend: Trend;
  selected: boolean;
  onSelect: (trendId: string, selected: boolean) => void;
  className?: string;
}

export function TrendCard({ trend, selected, onSelect, className }: TrendCardProps) {
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50";
    if (score >= 6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "discovered":
        return "bg-blue-100 text-blue-800";
      case "analyzed":
        return "bg-purple-100 text-purple-800";
      case "selected":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalMentions = trend.sources?.reduce((sum, source) => {
    // Handle different source data structures
    const mentions = source.mentions || 0;
    return sum + mentions;
  }, 0) || 0;
  
  const avgEngagement = trend.sources && trend.sources.length > 0 
    ? trend.sources.reduce((sum, source) => {
        // Handle different engagement score structures
        const engagement = source.engagement_score || 0;
        return sum + engagement;
      }, 0) / trend.sources.length 
    : 0;

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        selected && "ring-2 ring-blue-500 bg-blue-50/50",
        className
      )}
      onClick={() => onSelect(trend.id, !selected)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox 
                checked={selected}
                onCheckedChange={(checked) => {
                  onSelect(trend.id, checked === true);
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              <Badge variant="outline" className={cn(getStatusColor(trend.status), "text-xs")}>
                {trend.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {trend.industry}
              </Badge>
            </div>
            <h3 className="font-semibold text-base leading-tight mb-1 line-clamp-2">
              {trend.topic}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {trend.description}
            </p>
          </div>
          <div className={cn(
            "ml-2 px-2 py-1 rounded-lg text-xs font-bold shrink-0",
            getScoreColor(trend.trend_score)
          )}>
            {trend.trend_score.toFixed(1)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Keywords */}
        {trend.keywords.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {(keywordsExpanded ? trend.keywords : trend.keywords.slice(0, 2)).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {trend.keywords.length > 2 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKeywordsExpanded(!keywordsExpanded);
                  }}
                >
                  {keywordsExpanded ? 'Show less' : `+${trend.keywords.length - 2} more`}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            <span className="text-muted-foreground">Velocity:</span>
            <span className="font-medium">{(trend.metrics?.trend_velocity || trend.trend_score || 0).toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">Mentions:</span>
            <span className="font-medium">{totalMentions.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-purple-500" />
            <span className="text-muted-foreground">Engagement:</span>
            <span className="font-medium">{(avgEngagement * 100).toFixed(1)}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-orange-500" />
            <span className="text-muted-foreground">Discovered:</span>
            <span className="font-medium">{formatDate(trend.discovered_at)}</span>
          </div>
        </div>

        {/* Sources */}
        {trend.sources && trend.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">
              Sources ({trend.sources.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {[...new Set(trend.sources.map(s => s.platform || 'Unknown'))].slice(0, 2).map((platform, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}