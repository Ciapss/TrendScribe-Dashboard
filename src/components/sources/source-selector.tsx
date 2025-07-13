"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Settings,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

interface SourceConfig {
  enabled_sources: {
    reddit: boolean;
    linkup: boolean;
    rss_feeds: boolean;
    twitter: boolean;
    hashtags: boolean;
  };
  source_weights: {
    reddit: number;
    linkup: number;
    rss_feeds: number;
    twitter: number;
    hashtags: number;
  };
  rss_preferences: {
    enabled_feed_ids: string[];
  };
  twitter_preferences?: {
    enabled_hashtag_ids: string[];
  };
  hashtag_preferences?: {
    enabled_hashtag_ids: string[];
  };
  max_trends_per_source: number;
}

interface SourceSelectorProps {
  onConfigureFeeds?: () => void;
  showWeights?: boolean;
  compact?: boolean;
}

const VALID_SOURCE_TYPES = ['reddit', 'linkup', 'rss_feeds', 'twitter', 'hashtags'] as const;

export function SourceSelector({ 
  onConfigureFeeds, 
  showWeights = true, 
  compact = false 
}: SourceSelectorProps) {
  const [config, setConfig] = useState<SourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedsInfo, setFeedsInfo] = useState({
    enabled_rss_feeds_count: 0,
    available_rss_feeds_count: 0
  });
  const [hashtagsInfo, setHashtagsInfo] = useState({
    enabled_hashtags_count: 0,
    available_hashtags_count: 0
  });

  useEffect(() => {
    loadConfig();
    
    // Listen for hashtag configuration changes
    const handleHashtagConfigChange = () => {
      loadConfig();
    };
    
    window.addEventListener('hashtag-config-changed', handleHashtagConfigChange);
    
    return () => {
      window.removeEventListener('hashtag-config-changed', handleHashtagConfigChange);
    };
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.config) {
          setConfig(data.config);
          setFeedsInfo({
            enabled_rss_feeds_count: data.enabled_rss_feeds_count || 0,
            available_rss_feeds_count: data.available_rss_feeds_count || 0
          });
          setHashtagsInfo({
            enabled_hashtags_count: data.enabled_hashtags_count || 0,
            available_hashtags_count: data.available_hashtags_count || 0
          });
        } else {
          throw new Error('Invalid source configuration response');
        }
      } else {
        throw new Error('Failed to load source configuration');
      }
    } catch {
      toast.error("Failed to load source configuration");
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (sourceType: string, enabled: boolean) => {
    try {
      setSaving(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/toggle-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ source_type: sourceType, enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => prev ? {
          ...prev,
          enabled_sources: data.enabled_sources
        } : null);
        
        toast.success(data.message);
      } else {
        throw new Error('Failed to toggle source');
      }
    } catch {
      toast.error("Failed to update source settings");
    } finally {
      setSaving(false);
    }
  };

  const setSourceWeight = async (sourceType: string, weight: number) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/set-weight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ source_type: sourceType, weight }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => prev ? {
          ...prev,
          source_weights: data.source_weights
        } : null);
      } else {
        throw new Error('Failed to set source weight');
      }
    } catch {
      toast.error("Failed to update source weight");
    }
  };


  const getSourceName = (sourceType: string) => {
    switch (sourceType) {
      case 'reddit':
        return 'Reddit';
      case 'rss_feeds':
        return 'RSS Feeds';
      case 'linkup':
        return 'Linkup';
      case 'twitter':
        return 'Twitter/X';
      case 'hashtags':
        return 'Hashtags';
      default:
        return sourceType;
    }
  };

  const getSourceDescription = (sourceType: string) => {
    switch (sourceType) {
      case 'reddit':
        return 'Trending topics from Reddit communities';
      case 'rss_feeds':
        return `News and blogs (${feedsInfo.enabled_rss_feeds_count}/${feedsInfo.available_rss_feeds_count} feeds enabled)`;
      case 'linkup':
        return 'Real-time web search and analysis';
      case 'twitter':
        return 'Twitter/X social media monitoring';
      case 'hashtags':
        return `Hashtag monitoring (${hashtagsInfo.enabled_hashtags_count}/${hashtagsInfo.available_hashtags_count} hashtags enabled)`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load source configuration</p>
            <Button variant="outline" onClick={loadConfig} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {config.enabled_sources ? Object.entries(config.enabled_sources)
                .filter(([sourceType]) => VALID_SOURCE_TYPES.includes(sourceType as "reddit" | "linkup" | "rss_feeds" | "twitter"))
                .map(([sourceType, enabled]) => (
                <label key={sourceType} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    className="rounded h-4 w-4 cursor-pointer"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => toggleSource(sourceType, e.target.checked)}
                    disabled={saving}
                  />
                  <span className="text-sm">{getSourceName(sourceType)}</span>
                  {sourceType === 'rss_feeds' && (
                    <Badge variant="secondary" className="text-xs">
                      {feedsInfo.enabled_rss_feeds_count}
                    </Badge>
                  )}
                  {sourceType === 'hashtags' && (
                    <Badge variant="secondary" className="text-xs">
                      {hashtagsInfo.enabled_hashtags_count}
                    </Badge>
                  )}
                </label>
              )) : (
                <div className="text-sm text-muted-foreground">No sources available</div>
              )}
            </div>
            
            {onConfigureFeeds && (
              <Button variant="outline" size="sm" onClick={onConfigureFeeds}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Data Sources</CardTitle>
          {onConfigureFeeds && (
            <Button variant="outline" size="sm" onClick={onConfigureFeeds}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Sources
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {config.enabled_sources ? Object.entries(config.enabled_sources)
            .filter(([sourceType]) => VALID_SOURCE_TYPES.includes(sourceType as "reddit" | "linkup" | "rss_feeds" | "twitter"))
            .map(([sourceType, enabled]) => (
            <div key={sourceType} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input 
                        className="rounded h-4 w-4 cursor-pointer"
                        type="checkbox" 
                        checked={enabled}
                        onChange={(e) => toggleSource(sourceType, e.target.checked)}
                        disabled={saving}
                      />
                      <label className="font-medium cursor-pointer">
                        {getSourceName(sourceType)}
                      </label>
                      
                      {sourceType === 'rss_feeds' && (
                        <Badge variant="secondary" className="text-xs">
                          {feedsInfo.enabled_rss_feeds_count}/{feedsInfo.available_rss_feeds_count} feeds
                        </Badge>
                      )}
                      
                      {sourceType === 'hashtags' && (
                        <Badge variant="secondary" className="text-xs">
                          {hashtagsInfo.enabled_hashtags_count}/{hashtagsInfo.available_hashtags_count} hashtags
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSourceDescription(sourceType)}
                    </p>
                  </div>
                </div>
                
                {enabled && showWeights && (
                  <div className="text-sm text-muted-foreground">
                    Weight: {config.source_weights[sourceType as keyof typeof config.source_weights]?.toFixed(1)}
                  </div>
                )}
              </div>

              {enabled && showWeights && (
                <div className="mt-3 ml-7 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-16">Priority:</span>
                    <div className="flex-1">
                      <Slider
                        value={[config.source_weights[sourceType as keyof typeof config.source_weights] || 1.0]}
                        onValueChange={([value]) => setSourceWeight(sourceType, value)}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        className="flex-1"
                      />
                    </div>
                    <span className="text-sm w-8">
                      {config.source_weights[sourceType as keyof typeof config.source_weights]?.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher values prioritize this source in trend discovery
                  </p>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Unable to load source configuration
              </p>
            </div>
          )}

          {config.enabled_sources && !Object.values(config.enabled_sources).some(Boolean) && (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No sources are enabled. Enable at least one source to discover trends.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}