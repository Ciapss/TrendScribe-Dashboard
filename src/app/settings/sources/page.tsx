"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Rss, 
  BarChart3, 
  RefreshCw,
  ArrowLeft,
  Info,
  Hash,
  MessageCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { RSSFeedManager } from "@/components/sources/rss-feed-manager";
import { TwitterHashtagManager } from "@/components/sources/twitter-hashtag-manager";
import { SourceSelector } from "@/components/sources/source-selector";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";

// Mapping of industry categories to relevant subreddits
const INDUSTRY_SUBREDDITS: Record<string, string[]> = {
  "technology": ["technology", "programming", "MachineLearning", "artificial", "webdev", "coding", "techsupport"],
  "healthcare": ["Health", "nutrition", "fitness", "medicine", "medical", "mentalhealth", "HealthyFood"],
  "finance": ["personalfinance", "investing", "SecurityAnalysis", "financialindependence", "stocks", "Fire", "Economics"],
  "marketing": ["marketing", "SEO", "socialmedia", "advertising", "content_marketing", "PPC", "analytics"],
  "education": ["education", "teachers", "HomeschoolRecovery", "AskAcademia", "EDTech", "GetStudying", "studytips"],
  "entertainment": ["entertainment", "movies", "television", "Music", "books", "gaming", "netflix"],
  "sports": ["sports", "nfl", "soccer", "basketball", "baseball", "hockey", "MMA", "olympics"],
  "business": ["business", "entrepreneur", "startups", "smallbusiness", "EntrepreneurRideAlong", "Entrepreneur", "freelance"],
  "science": ["science", "askscience", "biology", "chemistry", "physics", "engineering", "space", "datascience"],
  "environment": ["environment", "climate", "sustainability", "ZeroWaste", "Green", "ClimateChange", "renewable"],
  "politics": ["politics", "PoliticalDiscussion", "neutralpolitics", "Ask_Politics", "moderatepolitics"],
  "travel": ["travel", "solotravel", "backpacking", "digitalnomad", "roadtrip", "flights", "hotels"],
  "food": ["food", "Cooking", "recipes", "FoodPorn", "MealPrepSunday", "AskCulinary", "nutrition"],
  "fashion": ["fashion", "malefashionadvice", "femalefashionadvice", "streetwear", "frugalmalefashion"],
  "automotive": ["cars", "AutoDetailing", "Justrolledintotheshop", "BMW", "teslamotors", "motorcycles"],
  "real-estate": ["RealEstate", "realestateinvesting", "FirstTimeHomeBuyer", "homeowners", "landlord"],
  "cryptocurrency": ["CryptoCurrency", "Bitcoin", "ethereum", "CryptoMarkets", "DeFi", "NFT", "altcoin"],
  "ai-ml": ["MachineLearning", "artificial", "deeplearning", "datascience", "ArtificialInteligence", "ChatGPT", "OpenAI"],
  "cybersecurity": ["cybersecurity", "netsec", "AskNetsec", "malware", "hacking", "security", "privacy"],
  "startups": ["startups", "entrepreneur", "EntrepreneurRideAlong", "Entrepreneur", "smallbusiness", "SideProject"]
};


export default function SourcesSettingsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for adding subreddits
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [subredditName, setSubredditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // State for expanding subreddit lists
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  
  // State for custom added subreddits
  const [customSubreddits, setCustomSubreddits] = useState<Record<string, string[]>>({});
  
  // State for subreddit settings
  const [subredditSettings, setSubredditSettings] = useState<{
    maxPosts: number | string;
    minUpvotes: number | string;
    minComments: number | string;
  }>({
    maxPosts: 10,
    minUpvotes: 50,
    minComments: 5
  });
  
  // State for enabled/disabled subreddits
  const [enabledSubreddits, setEnabledSubreddits] = useState<Record<string, boolean>>({});

  // State for advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    maxTrendsPerSource: 10,
    discoveryTimeoutMinutes: 5,
    globalIncludeKeywords: "",
    globalExcludeKeywords: ""
  });

  // Helper function to get combined subreddit list
  const getCombinedSubreddits = (industry: string): string[] => {
    const originalSubreddits = INDUSTRY_SUBREDDITS[industry] || [];
    const customSubredditsForIndustry = customSubreddits[industry] || [];
    return [...originalSubreddits, ...customSubredditsForIndustry];
  };

  // Function to fetch existing subreddits from API
  const fetchExistingSubreddits = async () => {
    try {
      const subreddits = await apiClient.getUserSubreddits(false); // Fetch ALL subreddits, including disabled ones
      
      // Group custom subreddits by industry
      const customByIndustry: Record<string, string[]> = {};
      const enabledState: Record<string, boolean> = {};
      const settingsFromAPI = {
        maxPosts: 10,
        minUpvotes: 50,
        minComments: 5
      };
      
      if (subreddits.length === 0) {
        // If no subreddits exist, all default subreddits should be enabled by default
        Object.entries(INDUSTRY_SUBREDDITS).forEach(([, subredditList]) => {
          subredditList.forEach(subreddit => {
            enabledState[subreddit] = true;
          });
        });
      } else {
        subreddits.forEach((subreddit) => {
          // Track enabled/disabled state for all subreddits
          enabledState[subreddit.subreddit_name] = subreddit.enabled;
          
          // Group custom subreddits by industry
          if (subreddit.is_custom) {
            if (!customByIndustry[subreddit.industry]) {
              customByIndustry[subreddit.industry] = [];
            }
            customByIndustry[subreddit.industry].push(subreddit.subreddit_name);
          }
          
          // Use settings from the first subreddit (they should be consistent)
          if (subreddit.max_posts) settingsFromAPI.maxPosts = subreddit.max_posts;
          if (subreddit.min_upvotes) settingsFromAPI.minUpvotes = subreddit.min_upvotes;
          if (subreddit.min_comments) settingsFromAPI.minComments = subreddit.min_comments;
        });
      }
      
      console.log('Fetched subreddits from API:', subreddits.map(s => ({ 
        name: s.subreddit_name, 
        id: s.id, 
        enabled: s.enabled, 
        is_custom: s.is_custom 
      })));
      console.log('Processed state:', { customByIndustry, enabledState, settingsFromAPI });
      
      setCustomSubreddits(customByIndustry);
      setEnabledSubreddits(enabledState);
      setSubredditSettings(settingsFromAPI);
    } catch (error) {
      // The 401 error will be handled by the api-client automatically
      // Just log for debugging, no need to show error here as user will be redirected
      console.error("Failed to fetch existing subreddits:", error);
    }
  };

  // Function to load advanced settings from source configuration
  const loadAdvancedSettings = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.config) {
          setAdvancedSettings({
            maxTrendsPerSource: data.config.max_trends_per_source || 10,
            discoveryTimeoutMinutes: data.config.discovery_timeout_minutes || 5,
            globalIncludeKeywords: data.config.global_include_keywords?.join(", ") || "",
            globalExcludeKeywords: data.config.global_exclude_keywords?.join(", ") || ""
          });
        }
      } else {
        throw new Error('Failed to load advanced settings');
      }
    } catch (error) {
      console.error("Failed to load advanced settings:", error);
    }
  };

  // Load existing subreddits and advanced settings on component mount
  useEffect(() => {
    fetchExistingSubreddits();
    loadAdvancedSettings();
  }, []);

  // Handler for adding subreddit
  const handleAddSubreddit = async () => {
    if (!selectedIndustry || !subredditName.trim()) {
      toast.error("Please select an industry and enter a subreddit name");
      return;
    }

    const cleanSubredditName = subredditName.trim().replace(/^r\//, ''); // Remove r/ prefix if present
    
    // Check if subreddit already exists
    const combinedSubreddits = getCombinedSubreddits(selectedIndustry);
    if (combinedSubreddits.includes(cleanSubredditName)) {
      toast.error(`r/${cleanSubredditName} is already added to ${INDUSTRY_LABELS[selectedIndustry]}`);
      return;
    }
    
    setIsLoading(true);
    try {
      // Make API call to add subreddit
      await apiClient.addUserSubreddit({
        subreddit_name: cleanSubredditName,
        industry: selectedIndustry,
        enabled: true,
        is_custom: true
      });
      
      // Show success toast
      toast.success(`Successfully added r/${cleanSubredditName} to ${INDUSTRY_LABELS[selectedIndustry]}`);
      
      // Clear form on success
      setSubredditName("");
      
      // Refresh all subreddit data to get the new subreddit with its proper ID
      await fetchExistingSubreddits();
      
    } catch (error) {
      console.error("Failed to add subreddit:", error);
      toast.error("Failed to add subreddit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for toggling industry expansion
  const toggleIndustryExpansion = (industry: string) => {
    setExpandedIndustries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(industry)) {
        newSet.delete(industry);
      } else {
        newSet.add(industry);
      }
      return newSet;
    });
  };

  // Handler for saving subreddit settings
  const handleSaveSubredditSettings = async () => {
    setIsLoading(true);
    try {
      // First, get all current subreddits from database (including disabled ones)
      const currentSubreddits = await apiClient.getUserSubreddits(false);
      
      // Track all the changes we need to make
      const updates: Array<{
        subreddit_id: string;
        enabled: boolean;
        max_posts?: number;
        min_upvotes?: number;
        min_comments?: number;
      }> = [];
      
      const creations: Array<{
        subreddit_name: string;
        industry: string;
        enabled: boolean;
        is_custom: boolean;
        max_posts: number;
        min_upvotes: number;
        min_comments: number;
      }> = [];
      
      // Create a mapping of subreddit names to database entries for easier lookup
      const dbSubredditMap = new Map();
      currentSubreddits.forEach(sub => {
        dbSubredditMap.set(sub.subreddit_name, sub);
      });
      
      // Process all subreddits that have state changes in the frontend
      Object.entries(enabledSubreddits).forEach(([subredditName, frontendEnabled]) => {
        const dbSubreddit = dbSubredditMap.get(subredditName);
        
        // Debug specific problematic subreddit
        if (subredditName === 'smallbusiness') {
          console.log('DEBUG smallbusiness:', {
            frontendEnabled,
            dbSubreddit: dbSubreddit ? { id: dbSubreddit.id, enabled: dbSubreddit.enabled } : 'NOT_FOUND',
            inMap: dbSubredditMap.has(subredditName)
          });
        }
        
        if (dbSubreddit) {
          // This subreddit exists in database - check if it needs updating
          const hasEnabledChange = frontendEnabled !== dbSubreddit.enabled;
          const maxPosts = typeof subredditSettings.maxPosts === 'string' ? parseInt(subredditSettings.maxPosts) || 10 : subredditSettings.maxPosts;
          const minUpvotes = typeof subredditSettings.minUpvotes === 'string' ? parseInt(subredditSettings.minUpvotes) || 50 : subredditSettings.minUpvotes;
          const minComments = typeof subredditSettings.minComments === 'string' ? parseInt(subredditSettings.minComments) || 5 : subredditSettings.minComments;
          const hasSettingsChange = dbSubreddit.max_posts !== maxPosts || 
                                    dbSubreddit.min_upvotes !== minUpvotes ||
                                    dbSubreddit.min_comments !== minComments;
          
          if (hasEnabledChange || hasSettingsChange) {
            // Validate that the subreddit has a proper ID
            if (!dbSubreddit.id || dbSubreddit.id === 'undefined' || dbSubreddit.id === undefined) {
              console.error(`Subreddit ${subredditName} has invalid ID:`, dbSubreddit.id);
              return; // Skip this subreddit
            }
            
            updates.push({
              subreddit_id: dbSubreddit.id,
              enabled: frontendEnabled,
              max_posts: maxPosts,
              min_upvotes: minUpvotes,
              min_comments: minComments
            });
          }
        } else {
          // This subreddit doesn't exist in database yet - need to create it
          // Find which industry this subreddit belongs to
          let subredditIndustry = null;
          for (const [industry, subredditList] of Object.entries(INDUSTRY_SUBREDDITS)) {
            if (subredditList.includes(subredditName)) {
              subredditIndustry = industry;
              break;
            }
          }
          
          if (subredditIndustry && frontendEnabled !== true) {
            // This is a default subreddit that needs to be created and disabled
            creations.push({
              subreddit_name: subredditName,
              industry: subredditIndustry,
              enabled: frontendEnabled,
              is_custom: false,
              max_posts: typeof subredditSettings.maxPosts === 'string' ? parseInt(subredditSettings.maxPosts) || 10 : subredditSettings.maxPosts,
              min_upvotes: typeof subredditSettings.minUpvotes === 'string' ? parseInt(subredditSettings.minUpvotes) || 50 : subredditSettings.minUpvotes,
              min_comments: typeof subredditSettings.minComments === 'string' ? parseInt(subredditSettings.minComments) || 5 : subredditSettings.minComments
            });
          } else {
            // This might be a custom subreddit that was added but somehow didn't get refreshed
            // Check if it's in our custom subreddits list
            let customIndustry = null;
            for (const [industry, customList] of Object.entries(customSubreddits)) {
              if (customList.includes(subredditName)) {
                customIndustry = industry;
                break;
              }
            }
            
            if (customIndustry) {
              console.warn(`Custom subreddit ${subredditName} exists in state but not in database. This suggests a sync issue.`);
              // We could try to recreate it, but this suggests a data consistency problem
              // For now, let's log it and skip it to avoid duplicate creation errors
            }
          }
        }
      });
      
      // Note: Default subreddit creation logic is now handled in the main loop above
      
      console.log('Current subreddits from DB:', currentSubreddits.map(s => ({ 
        name: s.subreddit_name, 
        id: s.id, 
        enabled: s.enabled 
      })));
      console.log('DB Map contents:', Array.from(dbSubredditMap.entries()).map(([name, sub]) => ({ 
        name, 
        id: sub.id, 
        enabled: sub.enabled 
      })));
      console.log('Frontend enabled state:', enabledSubreddits);
      console.log('Changes detected:', { 
        updates: updates.length, 
        creations: creations.length,
        updatesData: updates,
        creationsData: creations 
      });
      
      // Apply all changes
      let totalChanges = 0;
      
      // Create new subreddits
      if (creations.length > 0) {
        await Promise.all(creations.map(creation => 
          apiClient.addUserSubreddit(creation)
        ));
        totalChanges += creations.length;
      }
      
      // Update existing subreddits
      if (updates.length > 0) {
        await Promise.all(updates.map(update => 
          apiClient.updateUserSubreddit(update.subreddit_id, {
            enabled: update.enabled,
            max_posts: update.max_posts,
            min_upvotes: update.min_upvotes,
            min_comments: update.min_comments
          })
        ));
        totalChanges += updates.length;
      }
      
      if (totalChanges > 0) {
        toast.success(`Successfully updated ${totalChanges} subreddit(s)!`);
        // Refresh the data to reflect changes
        await fetchExistingSubreddits();
      } else {
        toast.info("No changes to save.");
      }
      
      // Force a refresh regardless to ensure state consistency
      if (creations.length > 0 || updates.length > 0) {
        console.log('Forcing refresh due to database changes...');
        await fetchExistingSubreddits();
      }
      
    } catch (error) {
      console.error("Failed to save subreddit settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for toggling subreddit enable/disable
  const handleToggleSubreddit = (subreddit: string, enabled: boolean) => {
    setEnabledSubreddits(prev => ({
      ...prev,
      [subreddit]: enabled
    }));
  };

  // Handler for saving advanced settings
  const handleSaveAdvancedSettings = async () => {
    // Validate inputs before saving
    if (advancedSettings.maxTrendsPerSource < 1 || advancedSettings.maxTrendsPerSource > 100) {
      toast.error("Max trends per source must be between 1 and 100");
      return;
    }
    
    if (advancedSettings.discoveryTimeoutMinutes < 1 || advancedSettings.discoveryTimeoutMinutes > 30) {
      toast.error("Discovery timeout must be between 1 and 30 minutes");
      return;
    }
    
    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      
      // Parse comma-separated keywords into arrays
      const globalIncludeKeywords = advancedSettings.globalIncludeKeywords
        .split(',')
        .map(kw => kw.trim())
        .filter(kw => kw.length > 0);
      
      const globalExcludeKeywords = advancedSettings.globalExcludeKeywords
        .split(',')
        .map(kw => kw.trim())
        .filter(kw => kw.length > 0);

      const updateData = {
        max_trends_per_source: advancedSettings.maxTrendsPerSource,
        discovery_timeout_minutes: advancedSettings.discoveryTimeoutMinutes,
        global_include_keywords: globalIncludeKeywords,
        global_exclude_keywords: globalExcludeKeywords
      };

      const response = await fetch(`${apiBaseUrl}/sources/config/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success("Advanced settings saved successfully!");
        await loadAdvancedSettings(); // Refresh the settings
      } else {
        throw new Error('Failed to save advanced settings');
      }
    } catch (error) {
      console.error("Failed to save advanced settings:", error);
      toast.error("Failed to save advanced settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "container mx-auto",
      isMobile 
        ? "h-screen max-h-screen flex flex-col py-2 px-4 gap-3 overflow-hidden" 
        : "py-6 space-y-6"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-4",
        isMobile && "flex-shrink-0"
      )}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div>
          <h1 className={cn(
            "font-bold",
            isMobile ? "text-lg" : "text-2xl"
          )}>Source Configuration</h1>
          <p className={cn(
            "text-muted-foreground",
            isMobile ? "text-xs" : "text-sm"
          )}>
            Manage your trend discovery sources and RSS feeds
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn(
        isMobile 
          ? "flex-1 min-h-0 flex flex-col gap-3 overflow-hidden" 
          : "space-y-6"
      )}>
        <TabsList className={cn(
          "w-full flex-shrink-0",
          isMobile 
            ? "h-auto p-1 grid grid-cols-3 gap-1 grid-rows-2" 
            : "grid grid-cols-5"
        )}>
          <TabsTrigger value="overview" className={cn(
            "flex items-center gap-1",
            isMobile ? "px-2 py-3 text-xs col-span-1" : "gap-2"
          )}>
            <BarChart3 className="h-4 w-4" />
            {isMobile ? "Overview" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="subreddits" className={cn(
            "flex items-center gap-1",
            isMobile ? "px-2 py-3 text-xs col-span-1" : "gap-2"
          )}>
            <MessageCircle className="h-4 w-4" />
            Subreddits
          </TabsTrigger>
          <TabsTrigger value="rss" className={cn(
            "flex items-center gap-1",
            isMobile ? "px-2 py-3 text-xs col-span-1" : "gap-2"
          )}>
            <Rss className="h-4 w-4" />
            {isMobile ? "RSS" : "RSS Feeds"}
          </TabsTrigger>
          <TabsTrigger value="hashtags" className={cn(
            "flex items-center gap-1",
            isMobile ? "px-2 py-3 text-xs col-span-1" : "gap-2"
          )}>
            <Hash className="h-4 w-4" />
            {isMobile ? "Hashtags" : "Hashtags"}
          </TabsTrigger>
          <TabsTrigger value="sources" className={cn(
            "flex items-center gap-1",
            isMobile ? "px-2 py-3 text-xs col-span-1" : "gap-2"
          )}>
            <Settings className="h-4 w-4" />
            {isMobile ? "Settings" : "Source Settings"}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className={cn(
          isMobile 
            ? "flex-1 min-h-0 overflow-auto pb-4" 
            : "space-y-6"
        )}>
          <div className={cn(
            "grid gap-6",
            isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          )}>
            {/* Quick Stats Card */}
            <Card>
              <CardHeader className={cn(isMobile && "pb-3")}>
                <CardTitle className={cn(
                  "flex items-center gap-2",
                  isMobile ? "text-base" : "text-lg"
                )}>
                  <BarChart3 className="h-5 w-5" />
                  Source Summary
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "space-y-2 pb-3" : "space-y-4"
              )}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Sources</span>
                    <Badge variant="default">3 of 3</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">RSS Feeds</span>
                    <Badge variant="secondary">5 enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subreddits</span>
                    <Badge variant="secondary">{Object.values(INDUSTRY_SUBREDDITS).flat().length} across {INDUSTRIES.length} industries</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Twitter Hashtags</span>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Discovery</span>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Discovery Performance</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Reddit</span>
                      <span>85% reliability</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RSS Feeds</span>
                      <span>92% reliability</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Linkup</span>
                      <span>78% reliability</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Twitter/X</span>
                      <span>90% reliability</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "grid grid-cols-2 gap-2" : "space-y-3"
              )}>
                <Button 
                  variant="outline" 
                  className={cn(
                    "justify-start",
                    isMobile ? "text-xs px-2 py-2 h-auto" : "w-full"
                  )}
                  onClick={() => setActiveTab("rss")}
                >
                  <Rss className="h-4 w-4 mr-1" />
                  {isMobile ? "RSS" : "Add RSS Feed"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "justify-start",
                    isMobile ? "text-xs px-2 py-2 h-auto" : "w-full"
                  )}
                  onClick={() => setActiveTab("subreddits")}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {isMobile ? "Sources" : "Manage Subreddits"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "justify-start",
                    isMobile ? "text-xs px-2 py-2 h-auto" : "w-full"
                  )}
                  onClick={() => setActiveTab("hashtags")}
                >
                  <Hash className="h-4 w-4 mr-1" />
                  {isMobile ? "Hashtags" : "Manage Hashtags"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "justify-start",
                    isMobile ? "text-xs px-2 py-2 h-auto" : "w-full"
                  )}
                  onClick={() => setActiveTab("sources")}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {isMobile ? "Config" : "Configure Sources"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "justify-start col-span-2",
                    isMobile ? "text-xs px-2 py-2 h-auto" : "w-full"
                  )}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {isMobile ? "Test Sources" : "Test All Sources"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How Source Configuration Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Reddit</h4>
                  <p className="text-sm text-muted-foreground">
                    Discovers trending topics from Reddit communities organized by industry categories.
                    Monitors {Object.values(INDUSTRY_SUBREDDITS).flat().length}+ subreddits across {INDUSTRIES.length} industries.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">RSS Feeds</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitors news sources, blogs, and publications for fresh content 
                    and trending stories in your industries.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Linkup</h4>
                  <p className="text-sm text-muted-foreground">
                    Performs real-time web search and analysis to find emerging 
                    trends and breaking news across the internet.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Twitter/X</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitors trending hashtags and conversations on Twitter/X to discover 
                    viral topics and emerging trends across industries.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Source Weights</h4>
                <p className="text-sm text-muted-foreground">
                  Adjust the priority of each source type to influence trend discovery. 
                  Higher weights mean that source will have more influence on the final trend scores.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Settings Tab */}
        <TabsContent value="sources" className={cn(
          isMobile 
            ? "flex-1 min-h-0 overflow-auto pb-4" 
            : "space-y-6"
        )}>
          <div className={cn(isMobile && "space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle>Source Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enable or disable trend discovery sources and adjust their priority weights.
              </p>
            </CardHeader>
            <CardContent>
              <SourceSelector 
                showWeights={true}
                compact={false}
                onConfigureFeeds={() => setActiveTab("rss")}
              />
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Trends per Source</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={advancedSettings.maxTrendsPerSource}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= 100) {
                        setAdvancedSettings(prev => ({
                          ...prev,
                          maxTrendsPerSource: value
                        }));
                      } else if (e.target.value === '') {
                        setAdvancedSettings(prev => ({
                          ...prev,
                          maxTrendsPerSource: 10
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of trends to collect from each source (1-100)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discovery Timeout (minutes)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={advancedSettings.discoveryTimeoutMinutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= 30) {
                        setAdvancedSettings(prev => ({
                          ...prev,
                          discoveryTimeoutMinutes: value
                        }));
                      } else if (e.target.value === '') {
                        setAdvancedSettings(prev => ({
                          ...prev,
                          discoveryTimeoutMinutes: 5
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time to wait for each source to respond (1-30 minutes)
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Global Include Keywords</label>
                <input 
                  type="text" 
                  placeholder="AI, technology, innovation (comma-separated)"
                  value={advancedSettings.globalIncludeKeywords}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    globalIncludeKeywords: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Topics containing these keywords will be prioritized
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Global Exclude Keywords</label>
                <input 
                  type="text" 
                  placeholder="spam, advertisement, promotion (comma-separated)"
                  value={advancedSettings.globalExcludeKeywords}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    globalExcludeKeywords: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Topics containing these keywords will be filtered out
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveAdvancedSettings} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* RSS Feeds Tab */}
        <TabsContent value="rss" className={cn(
          isMobile 
            ? "flex-1 min-h-0 overflow-auto pb-4" 
            : "space-y-6"
        )}>
          <RSSFeedManager />
        </TabsContent>

        {/* Subreddits Tab */}
        <TabsContent value="subreddits" className={cn(
          isMobile 
            ? "flex-1 min-h-0 overflow-auto pb-4" 
            : "space-y-6"
        )}>
          <div className={cn(isMobile && "space-y-4")}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Reddit Subreddit Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure which subreddits to monitor for trending topics. Organized by the same industry categories used in content generation.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category sections - Dynamic based on INDUSTRIES */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {INDUSTRIES.slice(0, 12).map((industry) => (
                  <div key={industry} className="space-y-3">
                    <h3 className="font-semibold text-sm">{INDUSTRY_LABELS[industry]}</h3>
                    <div className="space-y-2">
                      {(expandedIndustries.has(industry) 
                        ? getCombinedSubreddits(industry) 
                        : getCombinedSubreddits(industry)?.slice(0, 5)
                      )?.map((subreddit) => (
                        <div key={`${industry}-${subreddit}`} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={enabledSubreddits[subreddit] !== false}
                              onChange={(e) => handleToggleSubreddit(subreddit, e.target.checked)}
                              className="rounded h-4 w-4" 
                            />
                            <span className="text-sm font-medium">r/{subreddit}</span>
                          </div>
                          <Badge variant={enabledSubreddits[subreddit] !== false ? "default" : "secondary"} className="text-xs">
                            {enabledSubreddits[subreddit] !== false ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      ))}
                      {getCombinedSubreddits(industry)?.length > 5 && (
                        <button
                          onClick={() => toggleIndustryExpansion(industry)}
                          className="text-xs text-muted-foreground pl-6 hover:text-foreground transition-colors cursor-pointer"
                        >
                          {expandedIndustries.has(industry) 
                            ? 'Show less' 
                            : `+${getCombinedSubreddits(industry).length - 5} more...`
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Show remaining industries if any */}
              {INDUSTRIES.length > 12 && (
                <div className="pt-4">
                  <h3 className="font-semibold text-sm mb-4">Additional Industries</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {INDUSTRIES.slice(12).map((industry) => (
                      <div key={industry} className="space-y-3">
                        <h3 className="font-semibold text-sm">{INDUSTRY_LABELS[industry]}</h3>
                        <div className="space-y-2">
                          {(expandedIndustries.has(industry) 
                            ? getCombinedSubreddits(industry) 
                            : getCombinedSubreddits(industry)?.slice(0, 5)
                          )?.map((subreddit) => (
                            <div key={`${industry}-${subreddit}`} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={enabledSubreddits[subreddit] !== false}
                                  onChange={(e) => handleToggleSubreddit(subreddit, e.target.checked)}
                                  className="rounded h-4 w-4" 
                                />
                                <span className="text-sm font-medium">r/{subreddit}</span>
                              </div>
                              <Badge variant={enabledSubreddits[subreddit] !== false ? "default" : "secondary"} className="text-xs">
                                {enabledSubreddits[subreddit] !== false ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                          ))}
                          {getCombinedSubreddits(industry)?.length > 5 && (
                            <button
                              onClick={() => toggleIndustryExpansion(industry)}
                              className="text-xs text-muted-foreground pl-6 hover:text-foreground transition-colors cursor-pointer"
                            >
                              {expandedIndustries.has(industry) 
                                ? 'Show less' 
                                : `+${getCombinedSubreddits(industry).length - 5} more...`
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry Selector for Custom Addition */}
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Add Subreddits by Industry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Industry</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                    >
                      <option value="">Choose an industry...</option>
                      {INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry}>
                          {INDUSTRY_LABELS[industry]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subreddit Name</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter subreddit name"
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        value={subredditName}
                        onChange={(e) => setSubredditName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubreddit()}
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={handleAddSubreddit}
                        disabled={isLoading || !selectedIndustry || !subredditName.trim()}
                      >
                        {isLoading ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select an industry category first, then add custom subreddits. This helps organize sources for content generation.
                </p>
              </div>

              {/* Current Subreddits for Selected Industry */}
              {selectedIndustry && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">
                    Current subreddits for {INDUSTRY_LABELS[selectedIndustry]}:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getCombinedSubreddits(selectedIndustry)?.map((subreddit) => (
                      <Badge key={`${selectedIndustry}-${subreddit}`} variant="secondary" className="text-xs">
                        r/{subreddit}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These are the subreddits monitored for this industry. Default ones plus any you&apos;ve added.
                  </p>
                </div>
              )}

              <Separator />

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Posts per Subreddit</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={subredditSettings.maxPosts}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        // Allow empty field temporarily
                        setSubredditSettings(prev => ({ ...prev, maxPosts: '' as unknown as number }));
                      } else {
                        const value = parseInt(inputValue);
                        setSubredditSettings(prev => ({ 
                          ...prev, 
                          maxPosts: isNaN(value) ? 10 : Math.max(1, Math.min(100, value))
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      // When user leaves the field, ensure it has a valid value
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        setSubredditSettings(prev => ({ ...prev, maxPosts: 10 }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Upvotes</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="1000" 
                    value={subredditSettings.minUpvotes}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        // Allow empty field temporarily
                        setSubredditSettings(prev => ({ ...prev, minUpvotes: '' as unknown as number }));
                      } else {
                        const value = parseInt(inputValue);
                        setSubredditSettings(prev => ({ 
                          ...prev, 
                          minUpvotes: isNaN(value) ? 50 : Math.max(1, Math.min(1000, value))
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      // When user leaves the field, ensure it has a valid value
                      if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                        setSubredditSettings(prev => ({ ...prev, minUpvotes: 50 }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveSubredditSettings} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Hashtags Tab */}
        <TabsContent value="hashtags" className={cn(
          isMobile 
            ? "flex-1 min-h-0 overflow-auto pb-4" 
            : "space-y-6"
        )}>
          <TwitterHashtagManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}