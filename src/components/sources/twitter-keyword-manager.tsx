"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "sonner";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Tag,
  Sparkles
} from "lucide-react";

interface TwitterKeywords {
  id: string;
  primary_keywords: string[];
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

interface AddKeywordsFormData {
  primary_keywords: string[];
  industry: string;
  track_sentiment: boolean;
  min_engagement: number;
  exclude_retweets: boolean;
  exclude_replies: boolean;
  language_filter: string;
  include_keywords: string[];
  exclude_keywords: string[];
}

// Default keywords by industry (simplified arrays)
const DEFAULT_KEYWORDS: Record<string, string[]> = {
  "technology": ["ChatGPT", "OpenAI", "AI", "machine learning", "software development", "programming"],
  "healthcare": ["nutrition", "fitness", "wellness", "mental health", "healthcare", "medicine"],
  "finance": ["Bitcoin", "cryptocurrency", "stock market", "investing", "DeFi", "fintech"],
  "marketing": ["digital marketing", "SEO", "social media", "content marketing", "advertising", "branding"],
  "education": ["online learning", "EdTech", "education", "teaching", "e-learning", "students"],
  "entertainment": ["streaming", "Netflix", "gaming", "movies", "music", "entertainment"],
  "sports": ["NFL", "NBA", "soccer", "Olympics", "fitness", "athletics"],
  "business": ["startup", "entrepreneur", "business strategy", "venture capital", "innovation", "leadership"],
  "science": ["research", "climate change", "space", "biotechnology", "scientific discovery", "innovation"],
  "environment": ["climate change", "sustainability", "renewable energy", "carbon neutral", "green tech", "eco-friendly"],
  "politics": ["election", "policy", "government", "democracy", "political news", "legislation"],
  "travel": ["travel", "tourism", "destinations", "vacation", "adventure", "wanderlust"],
  "food": ["food trends", "recipes", "cooking", "restaurant", "culinary", "nutrition"],
  "fashion": ["fashion", "style", "designer", "trends", "clothing", "beauty"],
  "automotive": ["electric vehicles", "Tesla", "automotive", "cars", "EV", "autonomous driving"],
  "real-estate": ["real estate", "housing market", "property", "investment", "mortgage", "homebuying"],
  "cryptocurrency": ["Bitcoin", "Ethereum", "DeFi", "NFT", "crypto", "blockchain"],
  "ai-ml": ["ChatGPT", "OpenAI", "Claude", "artificial intelligence", "machine learning", "AI models"],
  "cybersecurity": ["cybersecurity", "data protection", "privacy", "hacking", "security", "cyber threats"],
  "startups": ["startup", "venture capital", "funding", "innovation", "entrepreneur", "tech startup"]
};

export function TwitterKeywordManager() {
  const [keywords, setKeywords] = useState<TwitterKeywords[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  
  // Form states
  const [addFormData, setAddFormData] = useState<AddKeywordsFormData>({
    primary_keywords: [],
    industry: '',
    track_sentiment: true,
    min_engagement: 50,
    exclude_retweets: true,
    exclude_replies: true,
    language_filter: 'en',
    include_keywords: [],
    exclude_keywords: []
  });
  const [editingKeywords, setEditingKeywords] = useState<TwitterKeywords | null>(null);
  const [bulkAddIndustry, setBulkAddIndustry] = useState('');
  const [selectedDefaultKeywords, setSelectedDefaultKeywords] = useState<Set<string>>(new Set());

  // Expanded industries for viewing keywords
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  // Load keywords on component mount
  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUserKeywords(false); // Get all keywords including disabled
      console.log('Loaded keywords data at', new Date().toISOString(), ':', data);
      
      setKeywords(data);
    } catch (error) {
      console.error('Failed to load keywords:', error);
      toast.error("Failed to load keywords");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeywords = async () => {
    if (addFormData.primary_keywords.length === 0 || !addFormData.industry) {
      toast.error("Primary keywords and industry are required");
      return;
    }

    try {
      await apiClient.addUserKeywords({
        ...addFormData,
        is_custom: true
      });

      toast.success(`Successfully added keywords to ${INDUSTRY_LABELS[addFormData.industry]}`);
      
      setShowAddDialog(false);
      setAddFormData({
        primary_keywords: [],
        industry: '',
        track_sentiment: true,
        min_engagement: 50,
        exclude_retweets: true,
        exclude_replies: true,
        language_filter: 'en',
        include_keywords: [],
        exclude_keywords: []
      });
      await loadKeywords();
      
      // Notify parent component to refresh source configuration
      window.dispatchEvent(new CustomEvent('keyword-config-changed'));
    } catch (error) {
      console.error('Error adding keywords:', error);
      toast.error("Failed to add keywords");
    }
  };

  const handleBulkAddKeywords = async () => {
    if (!bulkAddIndustry || selectedDefaultKeywords.size === 0) {
      toast.error("Please select an industry and at least one keyword set");
      return;
    }

    try {
      // Create keyword arrays from selected defaults
      const keywordsToAdd = Array.from(selectedDefaultKeywords);
      const promises = keywordsToAdd.map(keywordSet =>
        apiClient.addUserKeywords({
          primary_keywords: [keywordSet], // Individual keyword as array
          industry: bulkAddIndustry,
          track_sentiment: true,
          min_engagement: 50,
          exclude_retweets: true,
          exclude_replies: true,
          language_filter: 'en',
          include_keywords: [],
          exclude_keywords: [],
          is_custom: false
        })
      );

      await Promise.all(promises);
      
      toast.success(`Successfully added ${keywordsToAdd.length} keyword sets to ${INDUSTRY_LABELS[bulkAddIndustry]}`);
      
      setShowBulkAddDialog(false);
      setBulkAddIndustry('');
      setSelectedDefaultKeywords(new Set());
      await loadKeywords();
      
      // Notify parent component to refresh source configuration
      window.dispatchEvent(new CustomEvent('keyword-config-changed'));
    } catch (error) {
      console.error('Error bulk adding keywords:', error);
      toast.error("Failed to add keywords");
    }
  };

  const handleEditKeywords = async () => {
    if (!editingKeywords) return;

    try {
      await apiClient.updateUserKeywords(editingKeywords.id, {
        primary_keywords: editingKeywords.primary_keywords,
        track_sentiment: editingKeywords.track_sentiment,
        min_engagement: editingKeywords.min_engagement,
        exclude_retweets: editingKeywords.exclude_retweets,
        exclude_replies: editingKeywords.exclude_replies,
        language_filter: editingKeywords.language_filter,
        include_keywords: editingKeywords.include_keywords,
        exclude_keywords: editingKeywords.exclude_keywords
      });

      toast.success("Keywords updated");
      setShowEditDialog(false);
      setEditingKeywords(null);
      await loadKeywords();
    } catch (error) {
      console.error('Error updating keywords:', error);
      toast.error("Failed to update keywords");
    }
  };

  const handleDeleteKeywords = async (keywordsId: string, keywordsDesc: string) => {
    try {
      await apiClient.deleteUserKeywords(keywordsId);
      toast.success(`Removed ${keywordsDesc}`);
      await loadKeywords();
      
      // Notify parent component to refresh source configuration
      window.dispatchEvent(new CustomEvent('keyword-config-changed'));
    } catch (error) {
      console.error('Error deleting keywords:', error);
      toast.error("Failed to remove keywords");
    }
  };

  const handleToggleKeywords = async (keywordsId: string, enabled: boolean) => {
    // Check if keywords has a valid ID
    if (!keywordsId || keywordsId === 'undefined' || keywordsId === 'null') {
      console.error('Invalid keywords ID:', keywordsId);
      toast.error("Cannot update keywords: Invalid ID. Please refresh the page.");
      return;
    }

    // Optimistically update the UI immediately
    setKeywords(prev => 
      prev.map(keywords => 
        keywords.id === keywordsId 
          ? { ...keywords, enabled }
          : keywords
      )
    );

    try {
      const response = await apiClient.toggleKeywords(keywordsId, enabled);
      console.log('Toggle response:', response);
      toast.success(response.message);
      
      // Update state with the response
      if (response.keywords) {
        setKeywords(prev => 
          prev.map(keywords => 
            keywords.id === response.keywords.id 
              ? { ...keywords, enabled: response.keywords.enabled }
              : keywords
          )
        );
      }
      
      // Notify parent component to refresh source configuration
      window.dispatchEvent(new CustomEvent('keyword-config-changed'));
    } catch (error) {
      console.error('Error toggling keywords:', error);
      toast.error("Failed to update keywords status");
      
      // Revert the optimistic update on error
      setKeywords(prev => 
        prev.map(keywords => 
          keywords.id === keywordsId 
            ? { ...keywords, enabled: !enabled }
            : keywords
        )
      );
    }
  };

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

  const handleOptimizeKeywords = async (keywordsId: string, keywordsDesc: string) => {
    try {
      const response = await apiClient.optimizeKeywords(keywordsId);
      toast.success(
        `🚀 Successfully optimized ${keywordsDesc}!`,
        {
          description: `New keywords: ${response.keywords.primary_keywords.join(', ')}`,
          duration: 5000,
        }
      );
      await loadKeywords();
    } catch (error) {
      console.error('Error optimizing keywords:', error);
      toast.error("Failed to optimize keywords");
    }
  };

  const getKeywordsByIndustry = (industry: string) => {
    return keywords.filter(keywords => keywords.industry === industry);
  };

  const getKeywordsDescription = (keywordsItem: TwitterKeywords) => {
    return keywordsItem.primary_keywords.slice(0, 3).join(', ') + 
           (keywordsItem.primary_keywords.length > 3 ? '...' : '');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twitter/X Keyword Management</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Twitter/X Keyword Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Monitor keywords for trending topics and conversations across industries
          </p>
          <div className="flex gap-2">
            <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Popular Keywords</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-industry">Industry</Label>
                    <Select value={bulkAddIndustry} onValueChange={setBulkAddIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {INDUSTRY_LABELS[industry]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {bulkAddIndustry && (
                    <>
                      <div>
                        <Label>Popular Keywords for {INDUSTRY_LABELS[bulkAddIndustry]}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {DEFAULT_KEYWORDS[bulkAddIndustry]?.map((keyword) => (
                            <div key={keyword} className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedDefaultKeywords.has(keyword)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedDefaultKeywords);
                                  if (checked) {
                                    newSet.add(keyword);
                                  } else {
                                    newSet.delete(keyword);
                                  }
                                  setSelectedDefaultKeywords(newSet);
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{keyword}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedDefaultKeywords.size > 0 && (
                        <div>
                          <Label>Selected Keywords ({selectedDefaultKeywords.size})</Label>
                          <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-md bg-muted/50">
                            {Array.from(selectedDefaultKeywords).map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="text-xs">
                                {keyword}
                                <button
                                  className="ml-1 hover:text-red-500"
                                  onClick={() => {
                                    const newSet = new Set(selectedDefaultKeywords);
                                    newSet.delete(keyword);
                                    setSelectedDefaultKeywords(newSet);
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBulkAddDialog(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAddKeywords} className="w-full sm:w-auto">
                      Add Selected ({selectedDefaultKeywords.size})
                    </Button>
                  </div>
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
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Custom Keywords</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primary-keywords">Primary Keywords</Label>
                    <TagInput
                      value={addFormData.primary_keywords}
                      onChange={(keywords) => setAddFormData(prev => ({ ...prev, primary_keywords: keywords }))}
                      placeholder="Enter keywords (e.g., ChatGPT, artificial intelligence)"
                      suggestions={addFormData.industry ? DEFAULT_KEYWORDS[addFormData.industry] || [] : []}
                      maxTags={10}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={addFormData.industry} onValueChange={(value) => setAddFormData(prev => ({ ...prev, industry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {INDUSTRY_LABELS[industry]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Minimum Engagement</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[addFormData.min_engagement]}
                        onValueChange={([value]) => setAddFormData(prev => ({ ...prev, min_engagement: value }))}
                        min={10}
                        max={1000}
                        step={10}
                      />
                      <div className="text-sm text-muted-foreground">
                        {addFormData.min_engagement} minimum likes/retweets
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={addFormData.track_sentiment}
                        onCheckedChange={(checked) => setAddFormData(prev => ({ ...prev, track_sentiment: checked }))}
                        className="scale-75"
                      />
                      <Label>Track Sentiment</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={addFormData.exclude_retweets}
                        onCheckedChange={(checked) => setAddFormData(prev => ({ ...prev, exclude_retweets: checked }))}
                        className="scale-75"
                      />
                      <Label>Exclude Retweets</Label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button onClick={handleAddKeywords} className="w-full sm:w-auto">
                      Add Keywords
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Industry sections */}
          {INDUSTRIES.filter((industry) => getKeywordsByIndustry(industry).length > 0).map((industry) => {
            const industryKeywords = getKeywordsByIndustry(industry);
            const visibleKeywords = expandedIndustries.has(industry) 
              ? industryKeywords 
              : industryKeywords.slice(0, 5);

            return (
              <div key={industry} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{INDUSTRY_LABELS[industry]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {industryKeywords.length} keyword sets
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {visibleKeywords.map((keywordsItem) => (
                    <div key={keywordsItem.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input 
                          className="rounded h-4 w-4 cursor-pointer" 
                          type="checkbox" 
                          checked={keywordsItem.enabled}
                          onChange={(e) => handleToggleKeywords(keywordsItem.id, e.target.checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{getKeywordsDescription(keywordsItem)}</span>
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Keywords
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {keywordsItem.primary_keywords.slice(0, 3).map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-green-600 border-green-200">
                                {keyword}
                              </Badge>
                            ))}
                            {keywordsItem.primary_keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                +{keywordsItem.primary_keywords.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant={keywordsItem.enabled ? "default" : "secondary"} className="text-xs">
                          {keywordsItem.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingKeywords(keywordsItem);
                              setShowEditDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOptimizeKeywords(keywordsItem.id, getKeywordsDescription(keywordsItem))}
                              className="text-blue-600"
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Optimize Keywords
                            </DropdownMenuItem>
                            {keywordsItem.is_custom && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteKeywords(keywordsItem.id, getKeywordsDescription(keywordsItem))}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                  
                  {industryKeywords.length > 5 && (
                    <button
                      onClick={() => toggleIndustryExpansion(industry)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-2"
                    >
                      {expandedIndustries.has(industry) 
                        ? 'Show less' 
                        : `+${industryKeywords.length - 5} more keyword sets...`
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {keywords.length === 0 && (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No keywords configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding keywords to monitor for trending topics
              </p>
              <Button onClick={() => setShowBulkAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Keywords
              </Button>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Keywords Settings</DialogTitle>
            </DialogHeader>
            {editingKeywords && (
              <div className="space-y-4">
                <div>
                  <Label>Primary Keywords</Label>
                  <TagInput
                    value={editingKeywords.primary_keywords}
                    onChange={(keywords) => setEditingKeywords(prev => prev ? { ...prev, primary_keywords: keywords } : null)}
                    placeholder="Enter keywords"
                    maxTags={10}
                  />
                </div>

                <div>
                  <Label>Include Keywords</Label>
                  <TagInput
                    value={editingKeywords.include_keywords}
                    onChange={(keywords) => setEditingKeywords(prev => prev ? { ...prev, include_keywords: keywords } : null)}
                    placeholder="Additional keywords to include"
                    maxTags={10}
                  />
                </div>

                <div>
                  <Label>Exclude Keywords</Label>
                  <TagInput
                    value={editingKeywords.exclude_keywords}
                    onChange={(keywords) => setEditingKeywords(prev => prev ? { ...prev, exclude_keywords: keywords } : null)}
                    placeholder="Keywords to exclude"
                    maxTags={10}
                  />
                </div>

                <div>
                  <Label>Minimum Engagement</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editingKeywords.min_engagement]}
                      onValueChange={([value]) => setEditingKeywords(prev => prev ? { ...prev, min_engagement: value } : null)}
                      min={10}
                      max={1000}
                      step={10}
                    />
                    <div className="text-sm text-muted-foreground">
                      {editingKeywords.min_engagement} minimum likes/retweets
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingKeywords.track_sentiment}
                      onCheckedChange={(checked) => setEditingKeywords(prev => prev ? { ...prev, track_sentiment: checked } : null)}
                      className="scale-75"
                    />
                    <Label>Track Sentiment</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingKeywords.exclude_retweets}
                      onCheckedChange={(checked) => setEditingKeywords(prev => prev ? { ...prev, exclude_retweets: checked } : null)}
                      className="scale-75"
                    />
                    <Label>Exclude Retweets</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingKeywords.exclude_replies}
                    onCheckedChange={(checked) => setEditingKeywords(prev => prev ? { ...prev, exclude_replies: checked } : null)}
                    className="scale-75"
                  />
                  <Label>Exclude Replies</Label>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleEditKeywords} className="w-full sm:w-auto">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}