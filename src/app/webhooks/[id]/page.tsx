"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, X, Loader2, TestTube, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import type { Webhook } from "@/types"
import Link from "next/link"

const INDUSTRY_OPTIONS = [
  { value: "technology", label: "Technology" },
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

export default function WebhookDetailPage() {
  const router = useRouter()
  const params = useParams()
  const webhookId = params.id as string
  
  const [webhook, setWebhook] = useState<Webhook | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTag, setNewTag] = useState("")
  const [newIndustry, setNewIndustry] = useState("")

  useEffect(() => {
    if (webhookId) {
      fetchWebhook()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookId])

  const fetchWebhook = async () => {
    try {
      setLoading(true)
      setError(null)
      const webhookData = await apiClient.getWebhook(webhookId)
      setWebhook(webhookData)
    } catch (error) {
      console.error("Failed to fetch webhook:", error)
      setError("Failed to load webhook")
      toast.error("Failed to load webhook")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhook) return

    setSaving(true)
    try {
      await apiClient.updateWebhook(webhookId, webhook)
      toast.success("Webhook updated successfully")
    } catch (error) {
      console.error("Failed to update webhook:", error)
      toast.error("Failed to update webhook")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await apiClient.testWebhook(webhookId)
      if (result.success) {
        toast.success("Webhook test successful", {
          description: `Response: ${result.statusCode}`
        })
      } else {
        toast.error("Webhook test failed", {
          description: result.error || "Unknown error"
        })
      }
    } catch (error) {
      console.error("Failed to test webhook:", error)
      toast.error("Webhook test failed")
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!webhook || !confirm(`Are you sure you want to delete "${webhook.name}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      await apiClient.deleteWebhook(webhookId)
      toast.success("Webhook deleted successfully")
      router.push("/webhooks")
    } catch (error) {
      console.error("Failed to delete webhook:", error)
      toast.error("Failed to delete webhook")
    } finally {
      setDeleting(false)
    }
  }

  const addTag = () => {
    if (!webhook || !newTag.trim() || webhook.tags.includes(newTag.trim())) return
    
    setWebhook(prev => prev ? {
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    } : null)
    setNewTag("")
  }

  const removeTag = (tag: string) => {
    if (!webhook) return
    
    setWebhook(prev => prev ? {
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    } : null)
  }

  const addIndustry = () => {
    if (!webhook || !newIndustry || webhook.industries.includes(newIndustry)) return
    
    setWebhook(prev => prev ? {
      ...prev,
      industries: [...prev.industries, newIndustry]
    } : null)
    setNewIndustry("")
  }

  const removeIndustry = (industry: string) => {
    if (!webhook) return
    
    setWebhook(prev => prev ? {
      ...prev,
      industries: prev.industries.filter(i => i !== industry)
    } : null)
  }

  const updateAuthConfig = (key: string, value: string) => {
    if (!webhook) return
    
    setWebhook(prev => prev ? {
      ...prev,
      auth: {
        ...prev.auth,
        config: {
          ...prev.auth.config,
          [key]: value
        }
      }
    } : null)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !webhook) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/webhooks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Webhooks
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Webhook not found</h3>
              <p className="text-muted-foreground mb-4">
                {error || "The requested webhook could not be found."}
              </p>
              <Button asChild>
                <Link href="/webhooks">Return to Webhooks</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderAuthFields = () => {
    switch (webhook.auth.type) {
      case "bearer":
        return (
          <div className="space-y-2">
            <Label htmlFor="token">Bearer Token</Label>
            <Input
              id="token"
              type="password"
              value={webhook.auth.config.token || ""}
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
                value={webhook.auth.config.key_name || ""}
                onChange={(e) => updateAuthConfig("key_name", e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={webhook.auth.config.api_key || ""}
                onChange={(e) => updateAuthConfig("api_key", e.target.value)}
                placeholder="Enter API key"
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderScheduleFields = () => {
    if (webhook.schedule.frequency === "immediate") {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="time">Delivery Time</Label>
          <Input
            id="time"
            type="time"
            value={webhook.schedule.time}
            onChange={(e) => setWebhook(prev => prev ? {
              ...prev,
              schedule: { ...prev.schedule, time: e.target.value }
            } : null)}
          />
        </div>
        
        {webhook.schedule.frequency === "weekly" && (
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={webhook.schedule.dayOfWeek?.toString()}
              onValueChange={(value) => setWebhook(prev => prev ? {
                ...prev,
                schedule: { ...prev.schedule, dayOfWeek: parseInt(value) }
              } : null)}
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
        
        {webhook.schedule.frequency === "monthly" && (
          <div className="space-y-2">
            <Label htmlFor="day_of_month">Day of Month</Label>
            <Input
              id="day_of_month"
              type="number"
              min="1"
              max="31"
              value={webhook.schedule.dayOfMonth || ""}
              onChange={(e) => setWebhook(prev => prev ? {
                ...prev,
                schedule: { ...prev.schedule, dayOfMonth: parseInt(e.target.value) }
              } : null)}
              placeholder="1-31"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/webhooks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Webhooks
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{webhook.name}</h1>
            <p className="text-muted-foreground">
              Edit webhook configuration and settings.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Test Webhook
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

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
                  value={webhook.name}
                  onChange={(e) => setWebhook(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="My Webhook"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <Select
                  value={webhook.method}
                  onValueChange={(value: "POST" | "PUT") => setWebhook(prev => prev ? { ...prev, method: value } : null)}
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
                value={webhook.url}
                onChange={(e) => setWebhook(prev => prev ? { ...prev, url: e.target.value } : null)}
                placeholder="https://api.example.com/webhooks/trendscribe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={webhook.description || ""}
                onChange={(e) => setWebhook(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Describe what this webhook is used for..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={webhook.enabled}
                onCheckedChange={(checked) => setWebhook(prev => prev ? { ...prev, enabled: checked } : null)}
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
                value={webhook.auth.type}
                onValueChange={(value: "bearer" | "api_key" | "basic" | "custom") => 
                  setWebhook(prev => prev ? {
                    ...prev,
                    auth: { type: value, config: {} }
                  } : null)
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
                value={webhook.schedule.frequency}
                onValueChange={(value: "immediate" | "daily" | "weekly" | "monthly") => 
                  setWebhook(prev => prev ? {
                    ...prev,
                    schedule: { ...prev.schedule, frequency: value }
                  } : null)
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
                {webhook.industries.map(industry => (
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
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="industry_rotation"
                checked={webhook.industryRotation}
                onCheckedChange={(checked) => setWebhook(prev => prev ? { ...prev, industryRotation: checked } : null)}
              />
              <Label htmlFor="industry_rotation">Rotate between industries</Label>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
                {webhook.tags.map(tag => (
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
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}