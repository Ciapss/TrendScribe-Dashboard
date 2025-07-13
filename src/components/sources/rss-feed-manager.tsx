"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  status: 'active' | 'inactive' | 'error' | 'validating';
  is_system_feed: boolean;
  title?: string;
  description?: string;
  categories: string[];
  tags: string[];
  stats?: {
    total_entries_processed: number;
    trends_discovered: number;
    avg_trend_score: number;
    last_fetched?: string;
    fetch_error_count: number;
    reliability_score: number;
  };
  created_at: string;
  updated_at: string;
}

interface AddFeedFormData {
  name: string;
  url: string;
  categories: string[];
  tags: string[];
}

interface ValidationResult {
  is_valid: boolean;
  error?: string;
  title?: string;
  description?: string;
  entries_count?: number;
  feed_type?: string;
}

export function RSSFeedManager() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [systemFeeds, setSystemFeeds] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledFeeds, setEnabledFeeds] = useState<Set<string>>(new Set());
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false);
  
  // Form states
  const [addFormData, setAddFormData] = useState<AddFeedFormData>({
    name: '',
    url: '',
    categories: [],
    tags: []
  });
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [discoveryUrl, setDiscoveryUrl] = useState('');
  const [discoveredFeeds, setDiscoveredFeeds] = useState<RSSFeed[]>([]);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Load feeds on component mount
  useEffect(() => {
    loadFeeds();
    loadSourceConfig();
  }, []);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemFeeds(data.system_feeds || []);
        setFeeds(data.user_feeds || []);
      } else {
        throw new Error('Failed to load RSS feeds');
      }
    } catch {
      toast.error("Failed to load RSS feeds");
    } finally {
      setLoading(false);
    }
  };

  const loadSourceConfig = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const config = data.config;
        setEnabledFeeds(new Set(config.rss_preferences?.enabled_feed_ids || []));
      }
    } catch (error) {
      console.error('Failed to load source config:', error);
    }
  };

  const validateFeed = async (url: string): Promise<ValidationResult> => {
    try {
      setValidating(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/validate?url=${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const result = await response.json();
      return result;
    } catch {
      return {
        is_valid: false,
        error: 'Failed to validate feed'
      };
    } finally {
      setValidating(false);
    }
  };

  const handleAddFeed = async () => {
    if (!addFormData.name || !addFormData.url) {
      toast.error("Name and URL are required");
      return;
    }

    try {
      // Validate first
      const validation = await validateFeed(addFormData.url);
      if (!validation.is_valid) {
        toast.error(validation.error || "Feed validation failed");
        return;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(addFormData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        setShowAddDialog(false);
        setAddFormData({ name: '', url: '', categories: [], tags: [] });
        setValidationResult(null);
        await loadFeeds();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add feed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add RSS feed");
    }
  };

  const handleEditFeed = async () => {
    if (!editingFeed) return;

    try {
      const updates = {
        name: editingFeed.name,
        url: editingFeed.url,
        categories: editingFeed.categories,
        tags: editingFeed.tags,
      };

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/${editingFeed.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        setShowEditDialog(false);
        setEditingFeed(null);
        await loadFeeds();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update feed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update RSS feed");
    }
  };

  const handleDeleteFeed = async (feedId: string, feedName: string) => {
    if (!confirm(`Are you sure you want to delete "${feedName}"?`)) {
      return;
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/${feedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        toast.success("RSS feed deleted successfully");
        await loadFeeds();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete feed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete RSS feed");
    }
  };

  const handleToggleFeed = async (feedId: string, enabled: boolean) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/config/toggle-rss-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ feed_id: feedId, enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setEnabledFeeds(new Set(data.enabled_feed_ids));
        toast.success(data.message);
      } else {
        throw new Error('Failed to toggle feed');
      }
    } catch {
      toast.error("Failed to toggle RSS feed");
    }
  };

  const handleTestFeed = async (feedId: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/${feedId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Found ${data.entries_count} entries. Feed is working correctly.`);
      } else {
        toast.error(data.error || "Feed test failed");
      }
    } catch {
      toast.error("Failed to test RSS feed");
    }
  };

  const handleDiscoverFeeds = async () => {
    if (!discoveryUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const response = await fetch(`${apiBaseUrl}/sources/rss/discover?website_url=${encodeURIComponent(discoveryUrl)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setDiscoveredFeeds(data.discovered_feeds || []);
        if (data.discovered_feeds.length === 0) {
          toast.info("No RSS feeds were discovered on this website");
        }
      } else {
        throw new Error(data.message || 'Failed to discover feeds');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to discover RSS feeds");
    }
  };


  const getStatusBadge = (status: string) => {
    const variant = status === 'active' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const toggleFeedExpansion = (feedId: string) => {
    setExpandedFeeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedId)) {
        newSet.delete(feedId);
      } else {
        newSet.add(feedId);
      }
      return newSet;
    });
  };

  const renderFeedCard = (feed: RSSFeed, isSystemFeed: boolean = false) => {
    const isEnabled = enabledFeeds.has(feed.id);
    const isExpanded = expandedFeeds.has(feed.id);
    
    return (
      <div key={feed.id} className="space-y-2">
        {/* Header row - simplified layout like hashtags */}
        <div className="flex items-center justify-between p-3 border rounded">
          <div className="flex items-center gap-2">
            <input 
              className="rounded h-4 w-4 cursor-pointer" 
              type="checkbox" 
              checked={isEnabled}
              onChange={(e) => handleToggleFeed(feed.id, e.target.checked)}
            />
            <span className="text-sm font-medium">{feed.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
              {isEnabled ? "Active" : "Disabled"}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleFeedExpansion(feed.id)}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="ml-6 p-4 border-l-2 border-muted bg-muted/10 space-y-4">
            {/* Feed details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(feed.status)}
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">URL: </span>
                  <a href={feed.url} target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-blue-600 hover:underline break-all">
                    {feed.url}
                  </a>
                </div>

                {feed.feed_url && feed.feed_url !== feed.url && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Feed URL: </span>
                    <a href={feed.feed_url} target="_blank" rel="noopener noreferrer" 
                       className="text-sm text-blue-600 hover:underline break-all">
                      {feed.feed_url}
                    </a>
                  </div>
                )}
                
                {feed.title && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Title: </span>
                    <span className="text-sm">{feed.title}</span>
                  </div>
                )}
                
                {feed.description && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Description: </span>
                    <span className="text-sm text-muted-foreground">{feed.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            {feed.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-background border rounded">
                <div className="text-center">
                  <div className="text-sm font-medium">{feed.stats.total_entries_processed}</div>
                  <div className="text-xs text-muted-foreground">Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{feed.stats.trends_discovered}</div>
                  <div className="text-xs text-muted-foreground">Trends</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{feed.stats.avg_trend_score.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{feed.stats.reliability_score}%</div>
                  <div className="text-xs text-muted-foreground">Reliability</div>
                </div>
              </div>
            )}

            {/* Categories and Tags */}
            {feed.categories.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground mb-2 block">Categories:</span>
                <div className="flex flex-wrap gap-1">
                  {feed.categories.map((category, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {INDUSTRY_LABELS[category] || category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {feed.tags.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground mb-2 block">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {feed.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleTestFeed(feed.id)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test
              </Button>
              
              <a href={feed.url} target="_blank" rel="noopener noreferrer">
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit
                </Button>
              </a>
              
              {!isSystemFeed && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingFeed(feed);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteFeed(feed.id, feed.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RSS Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              RSS Feeds
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Manage RSS feeds to discover trending topics from news sources, blogs, and industry publications.
            </p>
            <div className="flex gap-2">
              <Dialog open={showDiscoverDialog} onOpenChange={setShowDiscoverDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Discover
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Discover RSS Feeds</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="discover-url">Website URL</Label>
                      <Input
                        id="discover-url"
                        value={discoveryUrl}
                        onChange={(e) => setDiscoveryUrl(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                    <Button onClick={handleDiscoverFeeds} className="w-full">
                      Discover Feeds
                    </Button>
                    
                    {discoveredFeeds.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Discovered Feeds:</h4>
                        {discoveredFeeds.map((feed, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{feed.title}</div>
                              <div className="text-sm text-muted-foreground">{feed.url}</div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setAddFormData({
                                  name: feed.title || '',
                                  url: feed.url,
                                  categories: [],
                                  tags: []
                                });
                                setShowDiscoverDialog(false);
                                setShowAddDialog(true);
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add RSS Feed</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feed-name">Name</Label>
                      <Input
                        id="feed-name"
                        value={addFormData.name}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My RSS Feed"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="feed-url">RSS Feed URL</Label>
                      <Input
                        id="feed-url"
                        value={addFormData.url}
                        onChange={(e) => {
                          setAddFormData(prev => ({ ...prev, url: e.target.value }));
                          if (validationResult) setValidationResult(null);
                        }}
                        placeholder="https://example.com/feed.xml"
                      />
                      {addFormData.url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => validateFeed(addFormData.url).then(setValidationResult)}
                          disabled={validating}
                        >
                          {validating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Validate Feed
                        </Button>
                      )}
                      
                      {validationResult && (
                        <div className={`mt-2 p-2 rounded ${validationResult.is_valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {validationResult.is_valid ? (
                            <div>
                              <div className="font-medium">✓ Valid RSS feed</div>
                              {validationResult.title && <div>Title: {validationResult.title}</div>}
                              {validationResult.entries_count && <div>Entries: {validationResult.entries_count}</div>}
                            </div>
                          ) : (
                            <div>✗ {validationResult.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="feed-industries">Industries</Label>
                      <div className="space-y-2">
                        <Select
                          onValueChange={(value) => {
                            if (value && !addFormData.categories.includes(value)) {
                              setAddFormData(prev => ({ 
                                ...prev, 
                                categories: [...prev.categories, value]
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industries to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.filter(industry => !addFormData.categories.includes(industry)).map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {INDUSTRY_LABELS[industry]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {addFormData.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {addFormData.categories.map((category) => (
                              <Badge 
                                key={category} 
                                variant="secondary" 
                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  setAddFormData(prev => ({
                                    ...prev,
                                    categories: prev.categories.filter(c => c !== category)
                                  }));
                                }}
                              >
                                {INDUSTRY_LABELS[category] || category} ×
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddFeed} 
                      className="w-full"
                      disabled={!addFormData.name || !addFormData.url || (validationResult && !validationResult.is_valid) || false}
                    >
                      Add Feed
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 text-sm mb-4">
            <div>
              <span className="font-medium">{enabledFeeds.size}</span> feeds enabled
            </div>
            <div>
              <span className="font-medium">{systemFeeds.length + feeds.length}</span> total feeds
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Feeds */}
      {systemFeeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System RSS Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemFeeds.map(feed => renderFeedCard(feed, true))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Custom Feeds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom RSS Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          {feeds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No custom RSS feeds added yet</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First RSS Feed
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map(feed => renderFeedCard(feed, false))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit RSS Feed</DialogTitle>
          </DialogHeader>
          {editingFeed && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingFeed.name}
                  onChange={(e) => setEditingFeed(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-url">RSS Feed URL</Label>
                <Input
                  id="edit-url"
                  value={editingFeed.url}
                  onChange={(e) => setEditingFeed(prev => prev ? { ...prev, url: e.target.value } : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-industries">Industries</Label>
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) => {
                      if (value && editingFeed && !editingFeed.categories.includes(value)) {
                        setEditingFeed(prev => prev ? {
                          ...prev,
                          categories: [...prev.categories, value]
                        } : null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industries to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.filter(industry => !editingFeed?.categories.includes(industry)).map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {INDUSTRY_LABELS[industry]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {editingFeed && editingFeed.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {editingFeed.categories.map((category) => (
                        <Badge 
                          key={category} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setEditingFeed(prev => prev ? {
                              ...prev,
                              categories: prev.categories.filter(c => c !== category)
                            } : null);
                          }}
                        >
                          {INDUSTRY_LABELS[category] || category} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleEditFeed} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}