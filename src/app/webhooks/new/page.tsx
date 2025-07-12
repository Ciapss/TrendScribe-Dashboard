"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

const INDUSTRY_OPTIONS = [
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "marketing", label: "Marketing" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "entertainment", label: "Entertainment" },
]

const AUTH_TYPES = [
  { value: "bearer", label: "Bearer Token" },
  { value: "api_key", label: "API Key" },
  { value: "basic", label: "Basic Auth" },
  { value: "custom", label: "Custom Headers" },
]

const FREQUENCIES = [
  { value: "immediate", label: "Immediate" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export default function NewWebhookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "POST" as "POST" | "PUT",
    enabled: true,
    auth: {
      type: "bearer" as "bearer" | "api_key" | "basic" | "custom",
      config: {} as Record<string, string>,
    },
    schedule: {
      frequency: "immediate" as "immediate" | "daily" | "weekly" | "monthly",
      time: "09:00",
      timezone: "UTC",
      dayOfWeek: undefined as number | undefined,
      dayOfMonth: undefined as number | undefined,
    },
    industries: [] as string[],
    industryRotation: false,
    retryConfig: {
      maxAttempts: 3,
      backoffMultiplier: 2.0,
    },
    description: "",
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState("")
  const [newIndustry, setNewIndustry] = useState("")

  const applyWebsitePreset = () => {
    setFormData({
      name: "Maciej.ai Website",
      url: "https://maciej.ai/api/webhook/blog",
      method: "POST" as "POST" | "PUT",
      enabled: true,
      auth: {
        type: "bearer" as "bearer" | "api_key" | "basic" | "custom",
        config: {
          token: "your_secure_webhook_secret_here"
        },
      },
      schedule: {
        frequency: "immediate" as "immediate" | "daily" | "weekly" | "monthly",
        time: "09:00",
        timezone: "UTC",
        dayOfWeek: undefined as number | undefined,
        dayOfMonth: undefined as number | undefined,
      },
      industries: ["technology", "business", "science", "health"],
      industryRotation: false,
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2.0,
      },
      description: "Publishes blog posts to maciej.ai website via webhook endpoint with Bearer token authentication",
      tags: ["maciej-website", "production", "manual-trigger"],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await apiClient.createWebhook(formData)
      toast.success("Webhook created successfully")
      router.push("/webhooks")
    } catch (error) {
      console.error("Failed to create webhook:", error)
      toast.error("Failed to create webhook")
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addIndustry = () => {
    if (newIndustry && !formData.industries.includes(newIndustry)) {
      setFormData(prev => ({
        ...prev,
        industries: [...prev.industries, newIndustry]
      }))
      setNewIndustry("")
    }
  }

  const removeIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.filter(i => i !== industry)
    }))
  }

  const updateAuthConfig = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        config: {
          ...prev.auth.config,
          [key]: value
        }
      }
    }))
  }

  const renderAuthFields = () => {
    switch (formData.auth.type) {
      case "bearer":
        return (
          <div className="space-y-2">
            <Label htmlFor="token">Bearer Token</Label>
            <Input
              id="token"
              type="password"
              value={formData.auth.config.token || ""}
              onChange={(e) => updateAuthConfig("token", e.target.value)}
              placeholder="Enter bearer token"
            />
          </div>
        )
      case "api_key":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key_name">Header Name</Label>
              <Input
                id="key_name"
                value={formData.auth.config.key_name || ""}
                onChange={(e) => updateAuthConfig("key_name", e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={formData.auth.config.api_key || ""}
                onChange={(e) => updateAuthConfig("api_key", e.target.value)}
                placeholder="Enter API key"
              />
            </div>
          </div>
        )
      case "basic":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.auth.config.username || ""}
                onChange={(e) => updateAuthConfig("username", e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.auth.config.password || ""}
                onChange={(e) => updateAuthConfig("password", e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>
        )
      case "custom":
        return (
          <div className="space-y-2">
            <Label>Custom Headers (JSON)</Label>
            <Textarea
              value={formData.auth.config.headers || ""}
              onChange={(e) => updateAuthConfig("headers", e.target.value)}
              placeholder='{"Authorization": "Custom token", "X-Custom-Header": "value"}'
              rows={3}
            />
          </div>
        )
      default:
        return null
    }
  }

  const renderScheduleFields = () => {
    if (formData.schedule.frequency === "immediate") {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="time">Delivery Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.schedule.time}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              schedule: { ...prev.schedule, time: e.target.value }
            }))}
          />
        </div>
        
        {formData.schedule.frequency === "weekly" && (
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={formData.schedule.dayOfWeek?.toString()}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                schedule: { ...prev.schedule, dayOfWeek: parseInt(value) }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {formData.schedule.frequency === "monthly" && (
          <div className="space-y-2">
            <Label htmlFor="day_of_month">Day of Month</Label>
            <Input
              id="day_of_month"
              type="number"
              min="1"
              max="31"
              value={formData.schedule.dayOfMonth || ""}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                schedule: { ...prev.schedule, dayOfMonth: parseInt(e.target.value) }
              }))}
              placeholder="1-31"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/webhooks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Webhooks
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Webhook</h1>
          <p className="text-muted-foreground">
            Set up automated delivery of blog posts to external systems.
          </p>
        </div>
      </div>

      {/* Quick Setup Presets */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🚀 Quick Setup
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
            >
              {showPresets ? "Hide" : "Show"} Presets
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a preset to quickly configure common webhook setups
          </p>
        </CardHeader>
        {showPresets && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-medium">Website Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure webhook for maciej.ai website with Bearer token authentication
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={applyWebsitePreset}
                  className="w-full"
                >
                  Apply Website Preset
                </Button>
              </div>
              <div className="border rounded-lg p-4 space-y-2 opacity-50">
                <h3 className="font-medium">Custom API</h3>
                <p className="text-sm text-muted-foreground">
                  Start with a blank template for custom integrations
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled
                  className="w-full"
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Webhook Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Webhook"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value: "POST" | "PUT") => setFormData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/webhooks/trendscribe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this webhook is used for..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Enable webhook</Label>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Authentication Type</Label>
              <Select
                value={formData.auth.type}
                onValueChange={(value: "bearer" | "api_key" | "basic" | "custom") => 
                  setFormData(prev => ({
                    ...prev,
                    auth: { type: value, config: {} }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renderAuthFields()}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.schedule.frequency}
                onValueChange={(value: "immediate" | "daily" | "weekly" | "monthly") => 
                  setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, frequency: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renderScheduleFields()}
          </CardContent>
        </Card>

        {/* Industry Filtering */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Filtering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Industries</Label>
              <div className="flex gap-2">
                <Select value={newIndustry} onValueChange={setNewIndustry}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(industry => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addIndustry} disabled={!newIndustry}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.industries.map(industry => (
                  <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                    {INDUSTRY_OPTIONS.find(i => i.value === industry)?.label || industry}
                    <button
                      type="button"
                      onClick={() => removeIndustry(industry)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Leave empty to receive posts from all industries
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="industry_rotation"
                checked={formData.industryRotation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, industryRotation: checked }))}
              />
              <Label htmlFor="industry_rotation">Rotate between industries</Label>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_attempts">Max Retry Attempts</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.retryConfig.maxAttempts}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    retryConfig: { ...prev.retryConfig, maxAttempts: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backoff_multiplier">Backoff Multiplier</Label>
                <Input
                  id="backoff_multiplier"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={formData.retryConfig.backoffMultiplier}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    retryConfig: { ...prev.retryConfig, backoffMultiplier: parseFloat(e.target.value) }
                  }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/webhooks">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Webhook"}
          </Button>
        </div>
      </form>
    </div>
  )
}