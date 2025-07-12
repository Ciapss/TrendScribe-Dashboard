"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { CustomIndustryCreate } from "@/types"
import { toast } from "sonner"
import { X, Plus } from "lucide-react"

interface IndustryCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function IndustryCreateForm({ onSuccess, onCancel }: IndustryCreateFormProps) {
  const [formData, setFormData] = useState<CustomIndustryCreate>({
    industry_id: "",
    name: "",
    description: "",
    keywords: [],
    common_categories: [],
    default_subreddits: []
  })
  const [loading, setLoading] = useState(false)
  const [keywordInput, setKeywordInput] = useState("")
  const [categoryInput, setCategoryInput] = useState("")
  const [subredditInput, setSubredditInput] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.industry_id.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.keywords.length === 0) {
      toast.error("Please add at least one keyword")
      return
    }

    setLoading(true)
    try {
      await apiClient.createCustomIndustry(formData)
      toast.success("Industry created successfully")
      onSuccess()
    } catch (error) {
      console.error("Failed to create industry:", error)
      toast.error("Failed to create industry")
    } finally {
      setLoading(false)
    }
  }

  const generateIndustryId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50)
  }

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      industry_id: generateIndustryId(value)
    }))
  }

  const addKeyword = () => {
    const keyword = keywordInput.trim()
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword]
      }))
      setKeywordInput("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }))
  }

  const addCategory = () => {
    const category = categoryInput.trim()
    if (category && !formData.common_categories.includes(category)) {
      setFormData(prev => ({
        ...prev,
        common_categories: [...prev.common_categories, category]
      }))
      setCategoryInput("")
    }
  }

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      common_categories: prev.common_categories.filter(c => c !== category)
    }))
  }

  const addSubreddit = () => {
    const subreddit = subredditInput.trim().replace(/^r\//, "")
    if (subreddit && !formData.default_subreddits.includes(subreddit)) {
      setFormData(prev => ({
        ...prev,
        default_subreddits: [...prev.default_subreddits, subreddit]
      }))
      setSubredditInput("")
    }
  }

  const removeSubreddit = (subreddit: string) => {
    setFormData(prev => ({
      ...prev,
      default_subreddits: prev.default_subreddits.filter(s => s !== subreddit)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Industry Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Renewable Energy"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry_id">Industry ID *</Label>
          <Input
            id="industry_id"
            value={formData.industry_id}
            onChange={(e) => setFormData(prev => ({ ...prev, industry_id: e.target.value }))}
            placeholder="Auto-generated from name"
            required
          />
          <p className="text-xs text-muted-foreground">
            Unique identifier for the industry (auto-generated from name)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this industry covers and its scope..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Keywords *</Label>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Add keyword..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            />
            <Button type="button" onClick={addKeyword} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.keywords.map((keyword) => (
              <Badge key={`keyword-${keyword}`} variant="default" className="text-xs">
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {formData.keywords.length === 0 && (
            <p className="text-xs text-muted-foreground">Add keywords that define this industry</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Common Categories</Label>
          <div className="flex gap-2">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Add category..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
            />
            <Button type="button" onClick={addCategory} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.common_categories.map((category) => (
              <Badge key={`category-${category}`} variant="secondary" className="text-xs">
                {category}
                <button
                  type="button"
                  onClick={() => removeCategory(category)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            RSS feed categories that should map to this industry
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default Subreddits</Label>
          <div className="flex gap-2">
            <Input
              value={subredditInput}
              onChange={(e) => setSubredditInput(e.target.value)}
              placeholder="Add subreddit (without r/)..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubreddit())}
            />
            <Button type="button" onClick={addSubreddit} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.default_subreddits.map((subreddit) => (
              <Badge key={`subreddit-${subreddit}`} variant="outline" className="text-xs">
                r/{subreddit}
                <button
                  type="button"
                  onClick={() => removeSubreddit(subreddit)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Subreddits to monitor for trending topics in this industry
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Industry"}
        </Button>
      </div>
    </form>
  )
}