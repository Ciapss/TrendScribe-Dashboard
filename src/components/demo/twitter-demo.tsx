"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwitterTrendCard } from "@/components/trends/twitter-trend-card";
import { TwitterAnalytics } from "@/components/analytics/twitter-analytics";
import { TwitterVerificationBadge, QualityScoreBadge, ViralBadge, EngagementMetrics } from "@/components/ui/twitter-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Trend, TrendSource } from "@/types";

// Mock enhanced Twitter data - this is what the backend will provide
const mockTwitterSources: TrendSource[] = [
  {
    platform: "twitter",
    url: "https://twitter.com/elonmusk/status/1234567890",
    title: "AI breakthrough: New model achieves 99% accuracy",
    engagement_score: 95,
    mentions: 15420,
    id: "1234567890",
    text: "🚀 Excited to announce our latest AI breakthrough! Our new model achieves 99% accuracy on complex reasoning tasks. This changes everything for autonomous systems. #AI #Innovation #TechBreakthrough",
    created_at: "2024-08-04T10:30:00Z",
    language: "en",
    source: "Twitter for iPhone",
    
    author_info: {
      username: "elonmusk",
      display_name: "Elon Musk",
      verified: true,
      followers_count: 155000000,
      profile_image_url: "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
      description: "CEO of Tesla, SpaceX, and xAI",
      location: "Austin, Texas"
    },
    
    metrics: {
      like_count: 89420,
      retweet_count: 23810,
      reply_count: 5420,
      quote_count: 8920,
      bookmarks: 45230,
      views: 2840000,
      total_engagement: 167800
    },
    
    entities: {
      hashtags: ["AI", "Innovation", "TechBreakthrough"],
      urls: [],
      user_mentions: []
    },
    
    media: {
      photo: [
        {
          media_url_https: "https://pbs.twimg.com/media/sample1.jpg",
          sizes: { h: 1200, w: 1600 }
        },
        {
          media_url_https: "https://pbs.twimg.com/media/sample2.jpg", 
          sizes: { h: 800, w: 1200 }
        }
      ]
    },
    
    quality_score: 9.2,
    is_viral: true
  },
  {
    platform: "twitter",
    url: "https://twitter.com/sundarpichai/status/1234567891",
    title: "Google's quantum computing milestone",
    engagement_score: 78,
    mentions: 8930,
    id: "1234567891",
    text: "Proud to share Google's latest quantum computing milestone. We've achieved quantum supremacy in a new domain that could revolutionize cryptography and drug discovery.",
    created_at: "2024-08-04T09:15:00Z",
    language: "en",
    source: "Twitter Web App",
    
    author_info: {
      username: "sundarpichai",
      display_name: "Sundar Pichai",
      verified: true,
      followers_count: 5200000,
      profile_image_url: "https://pbs.twimg.com/profile_images/sample_sundar.jpg",
      description: "CEO of Google and Alphabet",
      location: "Mountain View, CA"
    },
    
    metrics: {
      like_count: 34820,
      retweet_count: 12450,
      reply_count: 2890,
      quote_count: 4560,
      bookmarks: 18930,
      views: 890000,
      total_engagement: 73650
    },
    
    entities: {
      hashtags: ["QuantumComputing", "Google", "Innovation"],
      urls: [],
      user_mentions: []
    },
    
    quality_score: 8.7,
    is_viral: false
  },
  {
    platform: "twitter",
    url: "https://twitter.com/techinfluencer/status/1234567892",
    title: "ChatGPT productivity tips thread",
    engagement_score: 65,
    mentions: 4520,
    id: "1234567892",
    text: "🧵 THREAD: 10 ChatGPT productivity hacks that will save you hours every day. These are game-changers for developers, writers, and entrepreneurs. Let's dive in... 1/10",
    created_at: "2024-08-04T08:45:00Z",
    language: "en",
    source: "Twitter for Android",
    
    author_info: {
      username: "techinfluencer",
      display_name: "Alex Chen",
      verified: false,
      followers_count: 89500,
      profile_image_url: "https://pbs.twimg.com/profile_images/sample_alex.jpg",
      description: "Tech enthusiast | AI researcher | Productivity hacker",
      location: "San Francisco, CA"
    },
    
    metrics: {
      like_count: 12840,
      retweet_count: 3920,
      reply_count: 890,
      quote_count: 1230,
      bookmarks: 8940,
      views: 234000,
      total_engagement: 27820
    },
    
    entities: {
      hashtags: ["ChatGPT", "ProductivityHacks", "AI"],
      urls: [],
      user_mentions: []
    },
    
    quality_score: 7.3,
    is_viral: false
  }
];

const mockTrends: Trend[] = [
  {
    id: "trend-1",
    topic: "AI Breakthrough in Autonomous Systems",
    industry: "technology",
    description: "Major breakthrough in AI reasoning capabilities with 99% accuracy achievement",
    trend_score: 9.5,
    status: "discovered",
    priority: "high",
    keywords: ["AI", "artificial intelligence", "autonomous systems", "machine learning"],
    tags: ["breakthrough", "innovation"],
    content_angle: "Technical innovation with business impact",
    target_audience: ["tech professionals", "AI researchers", "investors"],
    sources: [mockTwitterSources[0]],
    metrics: {
      search_volume: 125000,
      trend_velocity: 8.9,
      engagement_rate: 5.9,
      sentiment_score: 0.85,
      total_engagement: 167800,
      total_reach: 2840000,
      reach_display: "2.8M"
    },
    discovered_at: "2024-08-04T10:30:00Z",
    related_trends: [],
    marked_for_generation: false,
    generation_attempts: 0,
    last_updated_by: "system",
    collection_source: "twitter"
  },
  {
    id: "trend-2", 
    topic: "Google Quantum Computing Milestone",
    industry: "technology",
    description: "Google achieves new quantum supremacy milestone in cryptography domain",
    trend_score: 8.7,
    status: "discovered",
    priority: "medium", 
    keywords: ["quantum computing", "Google", "cryptography", "quantum supremacy"],
    tags: ["quantum", "breakthrough"],
    content_angle: "Scientific achievement with future implications",
    target_audience: ["tech professionals", "researchers", "crypto enthusiasts"],
    sources: [mockTwitterSources[1]],
    metrics: {
      search_volume: 85000,
      trend_velocity: 7.8,
      engagement_rate: 8.3,
      sentiment_score: 0.78,
      total_engagement: 73650,
      total_reach: 890000,
      reach_display: "890K"
    },
    discovered_at: "2024-08-04T09:15:00Z",
    related_trends: [],
    marked_for_generation: false,
    generation_attempts: 0,
    last_updated_by: "system",
    collection_source: "twitter"
  },
  {
    id: "trend-3",
    topic: "ChatGPT Productivity Methods for Professionals", 
    industry: "technology",
    description: "Viral thread sharing advanced ChatGPT productivity techniques",
    trend_score: 7.3,
    status: "discovered",
    priority: "medium",
    keywords: ["ChatGPT", "productivity", "AI tools", "automation"],
    tags: ["productivity", "tutorial"],
    content_angle: "Practical guide for professionals",
    target_audience: ["professionals", "entrepreneurs", "developers"],
    sources: [mockTwitterSources[2]],
    metrics: {
      search_volume: 45000,
      trend_velocity: 6.5,
      engagement_rate: 11.9,
      sentiment_score: 0.72,
      total_engagement: 27820,
      total_reach: 234000,
      reach_display: "234K"
    },
    discovered_at: "2024-08-04T08:45:00Z",
    related_trends: [],
    marked_for_generation: false,
    generation_attempts: 0,
    last_updated_by: "system",
    collection_source: "twitter"
  }
];

export function TwitterDemo() {
  const [activeDemo, setActiveDemo] = useState<string>("individual");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🐦 Enhanced Twitter Integration Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This demonstrates how the UI will look once the backend provides enhanced Twitter data with author info, engagement metrics, quality scores, and media.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="individual">Twitter Cards</TabsTrigger>
              <TabsTrigger value="badges">UI Elements</TabsTrigger>
              <TabsTrigger value="trends">Trend List</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-4">
              <h3 className="text-lg font-semibold">Individual Twitter Trend Cards</h3>
              <div className="space-y-4">
                {mockTwitterSources.map((source, index) => (
                  <TwitterTrendCard key={index} source={source} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              <h3 className="text-lg font-semibold">Twitter UI Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Verification Badges</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span>Elon Musk</span>
                      <TwitterVerificationBadge verified={true} />
                      <span className="text-sm text-muted-foreground">Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Alex Chen</span>
                      <TwitterVerificationBadge verified={false} />
                      <span className="text-sm text-muted-foreground">Not verified</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quality Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <QualityScoreBadge score={9.2} showLabel={true} />
                      <span className="text-sm text-muted-foreground">Excellent content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <QualityScoreBadge score={7.3} showLabel={true} />
                      <span className="text-sm text-muted-foreground">Good content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <QualityScoreBadge score={5.1} showLabel={true} />
                      <span className="text-sm text-muted-foreground">Lower quality</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Viral Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ViralBadge isViral={true} />
                      <span className="text-sm text-muted-foreground">Viral content (2.8M views)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ViralBadge isViral={false} />
                      <span className="text-sm text-muted-foreground">Regular content</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Engagement Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EngagementMetrics 
                      metrics={mockTwitterSources[0].metrics!} 
                      compact={false}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <h3 className="text-lg font-semibold">Enhanced Trend List View</h3>
              <p className="text-sm text-muted-foreground">
                This shows how the trend selector will display enhanced Twitter data in the main interface.
              </p>
              
              <div className="space-y-4">
                {mockTrends.map((trend) => (
                  <Card key={trend.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Trend Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{trend.topic}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {trend.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              {trend.trend_score.toFixed(1)}
                            </Badge>
                            {trend.sources[0].is_viral && (
                              <ViralBadge isViral={true} />
                            )}
                          </div>
                        </div>

                        {/* Enhanced Metrics */}
                        <div className="grid grid-cols-3 gap-4 text-center text-sm">
                          <div>
                            <div className="font-semibold">
                              {trend.metrics.reach_display}
                            </div>
                            <div className="text-muted-foreground">Views</div>
                          </div>
                          <div>
                            <div className="font-semibold">
                              {trend.metrics.engagement_rate.toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground">Engagement</div>
                          </div>
                          <div>
                            <div className="font-semibold">
                              {trend.sources[0].quality_score?.toFixed(1)}/10
                            </div>
                            <div className="text-muted-foreground">Quality</div>
                          </div>
                        </div>

                        {/* Twitter Author Info */}
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
                            {trend.sources[0].author_info?.display_name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {trend.sources[0].author_info?.display_name}
                              </span>
                              <TwitterVerificationBadge 
                                verified={trend.sources[0].author_info?.verified || false} 
                              />
                              <span className="text-xs text-muted-foreground">
                                {(trend.sources[0].author_info?.followers_count || 0) >= 1000000 
                                  ? `${(trend.sources[0].author_info!.followers_count / 1000000).toFixed(1)}M followers`
                                  : `${(trend.sources[0].author_info!.followers_count / 1000).toFixed(0)}K followers`
                                }
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{trend.sources[0].author_info?.username} • {trend.sources[0].author_info?.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <h3 className="text-lg font-semibold">Twitter Analytics Dashboard</h3>
              <TwitterAnalytics trends={mockTrends} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-2xl">💡</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Implementation Status</h4>
              <p className="text-sm text-blue-800 mb-3">
                All frontend code is ready! Once the backend API is updated to return the enhanced Twitter data structure, 
                these features will automatically appear throughout the application.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✅</span>
                  <span>Frontend components implemented</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✅</span>
                  <span>Type definitions updated</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✅</span>
                  <span>Enhanced filtering and analytics ready</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-orange-600">⏳</span>
                  <span>Waiting for backend API to provide enhanced Twitter data</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}