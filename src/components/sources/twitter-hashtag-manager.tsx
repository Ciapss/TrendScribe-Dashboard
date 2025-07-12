"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Hash
} from "lucide-react";

interface TwitterHashtag {
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

interface AddHashtagFormData {
  hashtag: string;
  industry: string;
  track_sentiment: boolean;
  min_engagement: number;
  exclude_retweets: boolean;
  exclude_replies: boolean;
  language_filter: string;
  include_keywords: string[];
  exclude_keywords: string[];
}

// Default hashtags by industry (predefined popular hashtags)
const DEFAULT_HASHTAGS: Record<string, string[]> = {
  "technology": ["#Tech", "#Innovation", "#TechNews", "#Programming", "#Software", "#Developer"],
  "healthcare": ["#Health", "#Healthcare", "#Wellness", "#Medicine", "#Fitness", "#Nutrition"],
  "finance": ["#Finance", "#Investing", "#PersonalFinance", "#Money", "#Economics", "#Trading"],
  "marketing": ["#Marketing", "#DigitalMarketing", "#SEO", "#SocialMedia", "#ContentMarketing", "#Advertising"],
  "education": ["#Education", "#Learning", "#Teaching", "#Students", "#EdTech", "#OnlineLearning"],
  "entertainment": ["#Entertainment", "#Movies", "#Music", "#Gaming", "#TV", "#Streaming"],
  "sports": ["#Sports", "#Fitness", "#Athletics", "#NFL", "#Soccer", "#Basketball"],
  "business": ["#Business", "#Entrepreneurship", "#Startup", "#Leadership", "#Management", "#Strategy"],
  "science": ["#Science", "#Research", "#Innovation", "#STEM", "#Biology", "#Physics"],
  "environment": ["#Environment", "#Climate", "#Sustainability", "#GreenTech", "#ClimateChange", "#Renewable"],
  "politics": ["#Politics", "#Policy", "#Government", "#Election", "#Democracy", "#News"],
  "travel": ["#Travel", "#Tourism", "#Adventure", "#Explore", "#Wanderlust", "#Vacation"],
  "food": ["#Food", "#Cooking", "#Recipe", "#Foodie", "#Culinary", "#Nutrition"],
  "fashion": ["#Fashion", "#Style", "#OOTD", "#Designer", "#Trend", "#Beauty"],
  "automotive": ["#Cars", "#Automotive", "#Tesla", "#ElectricVehicles", "#Racing", "#Motorcycles"],
  "real-estate": ["#RealEstate", "#Property", "#Housing", "#Investment", "#Mortgage", "#Homebuying"],
  "cryptocurrency": ["#Crypto", "#Bitcoin", "#Ethereum", "#Blockchain", "#DeFi", "#NFT"],
  "ai-ml": ["#AI", "#MachineLearning", "#ArtificialIntelligence", "#DeepLearning", "#DataScience", "#ML"],
  "cybersecurity": ["#Cybersecurity", "#InfoSec", "#Privacy", "#DataProtection", "#Hacking", "#Security"],
  "startups": ["#Startup", "#Entrepreneur", "#Innovation", "#VC", "#Funding", "#TechStartup"]
};

export function TwitterHashtagManager() {
  const [hashtags, setHashtags] = useState<TwitterHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  
  // Form states
  const [addFormData, setAddFormData] = useState<AddHashtagFormData>({
    hashtag: '',
    industry: '',
    track_sentiment: true,
    min_engagement: 50,
    exclude_retweets: true,
    exclude_replies: true,
    language_filter: 'en',
    include_keywords: [],
    exclude_keywords: []
  });
  const [editingHashtag, setEditingHashtag] = useState<TwitterHashtag | null>(null);
  const [bulkAddIndustry, setBulkAddIndustry] = useState('');
  const [selectedDefaultHashtags, setSelectedDefaultHashtags] = useState<Set<string>>(new Set());

  // Expanded industries for viewing hashtags
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  // Load hashtags on component mount
  useEffect(() => {
    loadHashtags();
  }, []);

  const loadHashtags = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUserHashtags(false); // Get all hashtags including disabled
      console.log('Loaded hashtags data:', data);
      
      // Debug: Check for hashtags with undefined IDs
      const hashtagsWithoutIds = data.filter(h => !h.id || h.id === 'undefined');
      if (hashtagsWithoutIds.length > 0) {
        console.warn('Found hashtags without valid IDs:', hashtagsWithoutIds);
      }
      
      setHashtags(data);
    } catch (error) {
      console.error('Failed to load hashtags:', error);
      toast.error("Failed to load hashtags");
    } finally {
      setLoading(false);
    }
  };


  const handleAddHashtag = async () => {
    if (!addFormData.hashtag || !addFormData.industry) {
      toast.error("Hashtag and industry are required");
      return;
    }

    // Ensure hashtag starts with #
    const cleanHashtag = addFormData.hashtag.startsWith('#') 
      ? addFormData.hashtag 
      : `#${addFormData.hashtag}`;

    try {
      await apiClient.addUserHashtag({
        ...addFormData,
        hashtag: cleanHashtag,
        is_custom: true
      });

      toast.success(`Successfully added ${cleanHashtag} to ${INDUSTRY_LABELS[addFormData.industry]}`);
      
      setShowAddDialog(false);
      setAddFormData({
        hashtag: '',
        industry: '',
        track_sentiment: true,
        min_engagement: 50,
        exclude_retweets: true,
        exclude_replies: true,
        language_filter: 'en',
        include_keywords: [],
        exclude_keywords: []
      });
      await loadHashtags();
    } catch (error) {
      console.error('Error adding hashtag:', error);
      toast.error("Failed to add hashtag");
    }
  };

  const handleBulkAddHashtags = async () => {
    if (!bulkAddIndustry || selectedDefaultHashtags.size === 0) {
      toast.error("Please select an industry and at least one hashtag");
      return;
    }

    try {
      const hashtagsToAdd = Array.from(selectedDefaultHashtags);
      const promises = hashtagsToAdd.map(hashtag =>
        apiClient.addUserHashtag({
          hashtag,
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
      
      toast.success(`Successfully added ${hashtagsToAdd.length} hashtags to ${INDUSTRY_LABELS[bulkAddIndustry]}`);
      
      setShowBulkAddDialog(false);
      setBulkAddIndustry('');
      setSelectedDefaultHashtags(new Set());
      await loadHashtags();
    } catch (error) {
      console.error('Error bulk adding hashtags:', error);
      toast.error("Failed to add hashtags");
    }
  };

  const handleEditHashtag = async () => {
    if (!editingHashtag) return;

    try {
      await apiClient.updateUserHashtag(editingHashtag.id, {
        track_sentiment: editingHashtag.track_sentiment,
        min_engagement: editingHashtag.min_engagement,
        exclude_retweets: editingHashtag.exclude_retweets,
        exclude_replies: editingHashtag.exclude_replies,
        language_filter: editingHashtag.language_filter,
        include_keywords: editingHashtag.include_keywords,
        exclude_keywords: editingHashtag.exclude_keywords
      });

      toast.success("Hashtag settings updated");
      setShowEditDialog(false);
      setEditingHashtag(null);
      await loadHashtags();
    } catch (error) {
      console.error('Error updating hashtag:', error);
      toast.error("Failed to update hashtag");
    }
  };

  const handleDeleteHashtag = async (hashtagId: string, hashtag: string) => {
    try {
      await apiClient.deleteUserHashtag(hashtagId);
      toast.success(`Removed ${hashtag}`);
      await loadHashtags();
    } catch (error) {
      console.error('Error deleting hashtag:', error);
      toast.error("Failed to remove hashtag");
    }
  };

  const handleToggleHashtag = async (hashtagId: string, enabled: boolean) => {
    // Check if hashtag has a valid ID
    if (!hashtagId || hashtagId === 'undefined' || hashtagId === 'null') {
      console.error('Invalid hashtag ID:', hashtagId);
      toast.error("Cannot update hashtag: Invalid ID. Please refresh the page.");
      return;
    }

    try {
      await apiClient.updateUserHashtag(hashtagId, { enabled });
      await loadHashtags();
    } catch (error) {
      console.error('Error toggling hashtag:', error);
      toast.error("Failed to update hashtag status");
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

  const getHashtagsByIndustry = (industry: string) => {
    return hashtags.filter(hashtag => hashtag.industry === industry);
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twitter/X Hashtag Management</CardTitle>
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
            <Hash className="h-5 w-5" />
            Twitter/X Hashtag Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Monitor hashtags for trending topics and conversations across industries
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
                  <DialogTitle>Add Popular Hashtags</DialogTitle>
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
                        <Label>Add Custom Hashtag</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="#customhashtag"
                            value={addFormData.hashtag}
                            onChange={(e) => setAddFormData(prev => ({ ...prev, hashtag: e.target.value }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const hashtag = addFormData.hashtag.startsWith('#') 
                                  ? addFormData.hashtag 
                                  : `#${addFormData.hashtag}`;
                                if (hashtag.length > 1) {
                                  const newSet = new Set(selectedDefaultHashtags);
                                  newSet.add(hashtag);
                                  setSelectedDefaultHashtags(newSet);
                                  setAddFormData(prev => ({ ...prev, hashtag: '' }));
                                }
                              }
                            }}
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const hashtag = addFormData.hashtag.startsWith('#') 
                                ? addFormData.hashtag 
                                : `#${addFormData.hashtag}`;
                              if (hashtag.length > 1) {
                                const newSet = new Set(selectedDefaultHashtags);
                                newSet.add(hashtag);
                                setSelectedDefaultHashtags(newSet);
                                setAddFormData(prev => ({ ...prev, hashtag: '' }));
                              }
                            }}
                            disabled={!addFormData.hashtag.trim()}
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Type a hashtag and press Enter or click Add
                        </p>
                      </div>

                      <div>
                        <Label>Popular Hashtags for {INDUSTRY_LABELS[bulkAddIndustry]}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {DEFAULT_HASHTAGS[bulkAddIndustry]?.map((hashtag) => (
                            <div key={hashtag} className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedDefaultHashtags.has(hashtag)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedDefaultHashtags);
                                  if (checked) {
                                    newSet.add(hashtag);
                                  } else {
                                    newSet.delete(hashtag);
                                  }
                                  setSelectedDefaultHashtags(newSet);
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{hashtag}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedDefaultHashtags.size > 0 && (
                        <div>
                          <Label>Selected Hashtags ({selectedDefaultHashtags.size})</Label>
                          <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-md bg-muted/50">
                            {Array.from(selectedDefaultHashtags).map((hashtag) => (
                              <Badge key={hashtag} variant="secondary" className="text-xs">
                                {hashtag}
                                <button
                                  className="ml-1 hover:text-red-500"
                                  onClick={() => {
                                    const newSet = new Set(selectedDefaultHashtags);
                                    newSet.delete(hashtag);
                                    setSelectedDefaultHashtags(newSet);
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
                    <Button onClick={handleBulkAddHashtags} className="w-full sm:w-auto">
                      Add Selected ({selectedDefaultHashtags.size})
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
                  <DialogTitle>Add Custom Hashtag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hashtag">Hashtag</Label>
                    <Input
                      id="hashtag"
                      placeholder="#example"
                      value={addFormData.hashtag}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, hashtag: e.target.value }))}
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
                    <Button onClick={handleAddHashtag} className="w-full sm:w-auto">
                      Add Hashtag
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
          {INDUSTRIES.filter((industry) => getHashtagsByIndustry(industry).length > 0).map((industry) => {
            const industryHashtags = getHashtagsByIndustry(industry);
            const visibleHashtags = expandedIndustries.has(industry) 
              ? industryHashtags 
              : industryHashtags.slice(0, 5);

            return (
              <div key={industry} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{INDUSTRY_LABELS[industry]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {industryHashtags.length} hashtags
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {visibleHashtags.map((hashtag) => (
                    <div key={hashtag.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <input 
                          className="rounded h-4 w-4" 
                          type="checkbox" 
                          checked={hashtag.enabled}
                          onChange={(e) => handleToggleHashtag(hashtag.id, e.target.checked)}
                        />
                        <span className="text-sm font-medium">{hashtag.hashtag}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={hashtag.enabled ? "default" : "secondary"} className="text-xs">
                          {hashtag.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingHashtag(hashtag);
                              setShowEditDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Settings
                            </DropdownMenuItem>
                            {hashtag.is_custom && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteHashtag(hashtag.id, hashtag.hashtag)}
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
                  
                  {industryHashtags.length > 5 && (
                    <button
                      onClick={() => toggleIndustryExpansion(industry)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-2"
                    >
                      {expandedIndustries.has(industry) 
                        ? 'Show less' 
                        : `+${industryHashtags.length - 5} more hashtags...`
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hashtags.length === 0 && (
            <div className="text-center py-8">
              <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No hashtags configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding hashtags to monitor for trending topics
              </p>
              <Button onClick={() => setShowBulkAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Hashtags
              </Button>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Hashtag Settings</DialogTitle>
            </DialogHeader>
            {editingHashtag && (
              <div className="space-y-4">
                <div>
                  <Label>Hashtag</Label>
                  <Input value={editingHashtag.hashtag} disabled />
                </div>

                <div>
                  <Label>Minimum Engagement</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editingHashtag.min_engagement]}
                      onValueChange={([value]) => setEditingHashtag(prev => prev ? { ...prev, min_engagement: value } : null)}
                      min={10}
                      max={1000}
                      step={10}
                    />
                    <div className="text-sm text-muted-foreground">
                      {editingHashtag.min_engagement} minimum likes/retweets
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingHashtag.track_sentiment}
                      onCheckedChange={(checked) => setEditingHashtag(prev => prev ? { ...prev, track_sentiment: checked } : null)}
                      className="scale-75"
                    />
                    <Label>Track Sentiment</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingHashtag.exclude_retweets}
                      onCheckedChange={(checked) => setEditingHashtag(prev => prev ? { ...prev, exclude_retweets: checked } : null)}
                      className="scale-75"
                    />
                    <Label>Exclude Retweets</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingHashtag.exclude_replies}
                    onCheckedChange={(checked) => setEditingHashtag(prev => prev ? { ...prev, exclude_replies: checked } : null)}
                    className="scale-75"
                  />
                  <Label>Exclude Replies</Label>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleEditHashtag} className="w-full sm:w-auto">
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