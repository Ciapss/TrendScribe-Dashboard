export interface BlogPost {
  id: string;
  title: string;
  content: string;
  industry: string;
  createdAt: Date;
  metadata: {
    wordCount: number;
    readingTime: number;
    /** SEO score as percentage (0-100) */
    seoScore: number;
    /** Fact check score on 0-10 scale */
    factCheckScore: number;
    /** Overall quality score on 0-10 scale */
    qualityScore: number;
    /** Trend relevance score on 0-10 scale */
    trendScore: number;
  };
  sources: Source[];
  keywords: string[];
  generationCost?: number; // Cost in USD
  costBreakdown?: Record<string, number>; // Service costs
}

export interface Source {
  title: string;
  url: string;
  credibilityScore: number;
  publishDate?: Date;
}

export interface GenerationJob {
  post_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  result?: unknown;
  error?: string;
}

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  method: "POST" | "PUT";
  enabled: boolean;
  auth: {
    type: "api_key" | "bearer" | "basic" | "custom";
    config: Record<string, string>;
  };
  schedule: {
    frequency: "immediate" | "daily" | "weekly" | "monthly";
    time: string; // HH:MM format
    timezone: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  industries: string[];
  industryRotation: boolean;
  tags: string[];
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
  lastDelivery?: {
    timestamp: Date;
    status: "success" | "failed";
    responseCode?: number;
    postId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  webhookName: string;
  timestamp: Date;
  status: "success" | "failed" | "retrying";
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  };
  error?: string;
  retryCount: number;
  postId?: string;
  postTitle?: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string; // Only shown once on creation
  keyPreview: string; // e.g., "sk-...abc123"
  permissions: {
    readPosts: boolean;
    generatePosts: boolean;
    manageWebhooks: boolean;
  };
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface WebhookPayload {
  post: BlogPost;
  webhook: {
    id: string;
    name: string;
  };
  timestamp: Date;
  signature?: string; // HMAC signature for payload verification
}

export interface DashboardStats {
  totalPosts: number;
  averageQualityScore: number;
  postsThisMonth: number;
  mostActiveIndustry: string;
  successRate: number;
  postsByIndustry: { industry: string; count: number }[];
  postsOverTime: { date: string; count: number }[];
}

// Trend-related types
export interface TrendSource {
  platform: string;
  url: string;
  title: string;
  engagement_score: number;
  mentions: number;
  sentiment?: number;
  author?: string;
  published_at?: string;
}

export interface TrendMetrics {
  search_volume: number;
  trend_velocity: number;
  engagement_rate: number;
  sentiment_score: number;
  geographic_distribution?: Record<string, number>;
  age_demographics?: Record<string, number>;
  competition_level?: number;
  seasonality_factor?: number;
}

export interface Trend {
  id: string;
  topic: string;
  industry: string;
  description: string;
  trend_score: number;
  status: "discovered" | "analyzed" | "selected" | "generating" | "completed" | "rejected";
  priority: "low" | "medium" | "high" | "urgent";
  keywords: string[];
  tags: string[];
  content_angle?: string;
  target_audience: string[];
  sources: TrendSource[];
  metrics: TrendMetrics;
  discovered_at: string;
  scheduled_for?: string;
  processed_at?: string;
  related_trends: string[];
  generated_post_id?: string;
  marked_for_generation: boolean;
  generation_attempts: number;
  last_updated_by: string;
  selected_for_generation?: boolean;
  selection_timestamp?: string;
  selected_by_user_id?: string;
  collection_source?: string;
}

export interface TrendFilters {
  industry?: string;
  minScore?: number;
  maxScore?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  source?: string;
}

export interface TrendSelectionRequest {
  trend_ids: string[];
}

export interface TrendSelectionResponse {
  success: boolean;
  selected_trends: Trend[];
  selection_timestamp: string;
  selected_by: string;
}

export interface TrendListResponse {
  success: boolean;
  trends: Trend[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters_applied?: Record<string, string | number | boolean>;
}

// Industry-related types
export interface Industry {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  common_categories: string[];
  default_subreddits: string[];
  is_built_in: boolean;
  is_custom?: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomIndustryCreate {
  industry_id: string;
  name: string;
  description: string;
  keywords: string[];
  common_categories: string[];
  default_subreddits: string[];
}

export interface CustomIndustryUpdate {
  name: string;
  description: string;
  keywords: string[];
  common_categories: string[];
  default_subreddits: string[];
}

export interface IndustryStats {
  total_industries: number;
  built_in_count: number;
  custom_count: number;
  most_used_industry: string;
  total_mappings: number;
  custom_mappings: number;
  ai_mappings: number;
  cache_hit_rate: number;
}

export interface CategoryMapping {
  category: string;
  industries: string[];
  created_at: string;
}

export interface CategoryMappingTest {
  category: string;
  mapped_industries: string[];
  method: 'core' | 'pattern' | 'cache' | 'ai' | 'custom';
  confidence: number;
}

export interface CustomCategoryMappingCreate {
  category: string;
  industries: string[];
}

// Twitter/X hashtag monitoring types
export interface UserHashtag {
  id: string;
  hashtag: string;
  industry: string;
  enabled: boolean;
  is_custom: boolean;
  track_sentiment: boolean;
  min_engagement: number;
  exclude_retweets: boolean;
  exclude_replies: boolean;
  language_filter?: string;
  include_keywords: string[];
  exclude_keywords: string[];
  trends_discovered: number;
  avg_trend_score: number;
  last_fetch_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TwitterSourceConfig {
  enabled: boolean;
  weight: number;
  max_hashtags_per_industry: number;
  default_min_engagement: number;
  default_language_filter: string;
  rate_limit_per_hour: number;
}

// Updated source configuration to include Twitter
export interface SourceConfiguration {
  enabled_sources: {
    reddit: boolean;
    linkup: boolean;
    rss_feeds: boolean;
    twitter: boolean;
  };
  source_weights: {
    reddit: number;
    linkup: number;
    rss_feeds: number;
    twitter: number;
  };
  rss_preferences: {
    enabled_feed_ids: string[];
  };
  twitter_preferences?: {
    enabled_hashtag_ids: string[];
  };
  max_trends_per_source: number;
}

// Research Caching Types
export interface ResearchCacheSettings {
  use_cached_research: boolean;
  max_research_age_hours: number;
  force_fresh_research: boolean;
}

export interface CacheStatusInfo {
  cache_hit: boolean;
  cache_age?: number; // hours
  cache_status?: 'fresh' | 'stale' | 'expired';
  cost_saved?: number; // USD
  research_duration?: number; // seconds
}

export interface CostEstimate {
  base_estimate: number;
  with_cache_estimate?: number;
  potential_savings?: number;
  cache_hit_probability?: number; // 0-1
}

// Enhanced blog post generation request
export interface BlogPostGenerationRequest {
  language?: string;
  blog_type?: string;
  industry?: string;
  topic?: string;
  research_depth?: 'moderate' | 'deep';
  
  // Research Caching Parameters
  use_cached_research?: boolean;        // Default: true
  max_research_age_hours?: number;      // Default: 24, range: 1-168
  force_fresh_research?: boolean;       // Default: false
}

// Enhanced workflow metadata to include cache information
export interface WorkflowMetadata {
  workflow_id?: string;
  stage?: string;
  progress?: number;
  estimated_time_remaining?: number;
  cache_hit?: boolean;
  cache_status?: 'fresh' | 'stale' | 'expired';
  research_duration?: number;
  cost_breakdown?: Record<string, number>;
}