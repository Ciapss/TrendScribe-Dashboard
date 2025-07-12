"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient } from "@/lib/api-client"
import { Industry } from "@/types"
import { Search, Edit, Trash2, Building2, Factory, Tag, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IndustryEditForm } from "./industry-edit-form"

interface IndustryListProps {
  onIndustryUpdated?: () => void
}

export function IndustryList({ onIndustryUpdated }: IndustryListProps) {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)

  useEffect(() => {
    fetchIndustries()
  }, [])

  const fetchIndustries = async () => {
    try {
      const data = await apiClient.getIndustries()
      setIndustries(data)
    } catch (error) {
      console.error("Failed to fetch industries:", error)
      toast.error("Failed to load industries")
      setIndustries([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIndustry = async (industryId: string, industryName: string) => {
    if (!confirm(`Are you sure you want to delete "${industryName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteCustomIndustry(industryId)
      toast.success("Industry deleted successfully")
      fetchIndustries()
      onIndustryUpdated?.()
    } catch (error) {
      console.error("Failed to delete industry:", error)
      toast.error("Failed to delete industry")
    }
  }

  const handleEditIndustry = (industry: Industry) => {
    setSelectedIndustry(industry)
    setEditDialogOpen(true)
  }

  const handleIndustryEdited = () => {
    setEditDialogOpen(false)
    setSelectedIndustry(null)
    fetchIndustries()
    onIndustryUpdated?.()
  }

  const filteredIndustries = industries.filter(industry =>
    industry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    industry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    industry.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const builtInIndustries = filteredIndustries.filter(industry => industry.is_built_in)
  const customIndustries = filteredIndustries.filter(industry => !industry.is_built_in)

  const IndustryCard = ({ industry }: { industry: Industry }) => {
    const [expandedKeywords, setExpandedKeywords] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState(false)
    const [expandedSources, setExpandedSources] = useState(false)

    return (
      <Card key={industry.id} className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {industry.is_built_in ? (
                  <Building2 className="h-4 w-4 text-blue-500" />
                ) : (
                  <Factory className="h-4 w-4 text-green-500" />
                )}
                {industry.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={industry.is_built_in ? "default" : "secondary"}>
                  {industry.is_built_in ? "Built-in" : "Custom"}
                </Badge>
                {industry.usage_count !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {industry.usage_count} uses
                  </Badge>
                )}
              </div>
            </div>
            {!industry.is_built_in && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditIndustry(industry)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteIndustry(industry.id, industry.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>{industry.description}</CardDescription>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Keywords ({industry.keywords.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {(expandedKeywords ? industry.keywords : industry.keywords.slice(0, 5)).map((keyword) => (
                  <Badge key={`${industry.id}-keyword-${keyword}`} variant="outline" className="text-xs h-6">
                    {keyword}
                  </Badge>
                ))}
                {industry.keywords.length > 5 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs h-6 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setExpandedKeywords(!expandedKeywords)}
                  >
                    {expandedKeywords 
                      ? "Show less" 
                      : `+${industry.keywords.length - 5} more`
                    }
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Categories ({industry.common_categories.length})</h4>
              <div className="flex flex-wrap gap-1">
                {(expandedCategories ? industry.common_categories : industry.common_categories.slice(0, 3)).map((category) => (
                  <Badge key={`${industry.id}-category-${category}`} variant="secondary" className="text-xs h-6">
                    {category}
                  </Badge>
                ))}
                {industry.common_categories.length > 3 && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs h-6 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setExpandedCategories(!expandedCategories)}
                  >
                    {expandedCategories 
                      ? "Show less" 
                      : `+${industry.common_categories.length - 3} more`
                    }
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Sources ({industry.default_subreddits.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {(expandedSources ? industry.default_subreddits : industry.default_subreddits.slice(0, 3)).map((subreddit) => (
                  <Badge key={`${industry.id}-subreddit-${subreddit}`} variant="outline" className="text-xs h-6">
                    r/{subreddit}
                  </Badge>
                ))}
                {industry.default_subreddits.length > 3 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs h-6 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setExpandedSources(!expandedSources)}
                  >
                    {expandedSources 
                      ? "Show less" 
                      : `+${industry.default_subreddits.length - 3} more`
                    }
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industries</CardTitle>
          <CardDescription>Loading industries...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={`loading-industry-${i}`} className="h-48 animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Industries</CardTitle>
              <CardDescription>
                Manage built-in and custom industries for content generation
              </CardDescription>
            </div>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search industries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({filteredIndustries.length})</TabsTrigger>
              <TabsTrigger value="builtin">Built-in ({builtInIndustries.length})</TabsTrigger>
              <TabsTrigger value="custom">Custom ({customIndustries.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIndustries.map((industry) => (
                  <IndustryCard key={industry.id} industry={industry} />
                ))}
              </div>
              {filteredIndustries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No industries found matching your search.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="builtin" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {builtInIndustries.map((industry) => (
                  <IndustryCard key={industry.id} industry={industry} />
                ))}
              </div>
              {builtInIndustries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No built-in industries found matching your search.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="custom" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customIndustries.map((industry) => (
                  <IndustryCard key={industry.id} industry={industry} />
                ))}
              </div>
              {customIndustries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No custom industries found matching your search." : "No custom industries created yet."}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Industry</DialogTitle>
            <DialogDescription>
              Update the industry details, keywords, and configuration.
            </DialogDescription>
          </DialogHeader>
          {selectedIndustry && (
            <IndustryEditForm
              industry={selectedIndustry}
              onSuccess={handleIndustryEdited}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}