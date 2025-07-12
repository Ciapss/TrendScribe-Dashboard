"use client"

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Eye, Edit, TestTube, MoreHorizontal, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import type { Webhook } from "@/types"
import { INDUSTRY_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
export function WebhooksTable() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingWebhooks, setTestingWebhooks] = useState<Set<string>>(new Set())
  const [togglingWebhooks, setTogglingWebhooks] = useState<Set<string>>(new Set())

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const webhooksData = await apiClient.getWebhooks()
      setWebhooks(webhooksData)
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webhooks'
      setError(errorMessage)
      toast.error('Failed to load webhooks', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const handleToggleEnabled = async (webhookId: string, enabled: boolean) => {
    if (togglingWebhooks.has(webhookId)) return

    setTogglingWebhooks(prev => new Set(prev).add(webhookId))
    
    try {
      await apiClient.updateWebhook(webhookId, { enabled })
      setWebhooks(prev => 
        prev.map(webhook => 
          webhook.id === webhookId 
            ? { ...webhook, enabled }
            : webhook
        )
      )
      toast.success(`Webhook ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Failed to toggle webhook:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update webhook'
      toast.error('Failed to update webhook', {
        description: errorMessage
      })
    } finally {
      setTogglingWebhooks(prev => {
        const next = new Set(prev)
        next.delete(webhookId)
        return next
      })
    }
  }

  const handleTestWebhook = async (webhookId: string) => {
    if (testingWebhooks.has(webhookId)) return

    setTestingWebhooks(prev => new Set(prev).add(webhookId))
    
    try {
      const result = await apiClient.testWebhook(webhookId)
      if (result.success) {
        toast.success('Webhook test successful', {
          description: `Response: ${result.statusCode}`
        })
      } else {
        toast.error('Webhook test failed', {
          description: result.error || 'Unknown error'
        })
      }
    } catch (error) {
      console.error('Failed to test webhook:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to test webhook'
      toast.error('Webhook test failed', {
        description: errorMessage
      })
    } finally {
      setTestingWebhooks(prev => {
        const next = new Set(prev)
        next.delete(webhookId)
        return next
      })
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await apiClient.deleteWebhook(webhookId)
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId))
      toast.success('Webhook deleted successfully')
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete webhook'
      toast.error('Failed to delete webhook', {
        description: errorMessage
      })
    }
  }

  const getStatusColor = (status: "success" | "failed") => {
    return status === "success" 
      ? "text-green-600 bg-green-100" 
      : "text-red-600 bg-red-100"
  }

  const getScheduleText = (schedule: Webhook['schedule']) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && webhooks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load webhooks</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchWebhooks} variant="outline">
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!loading && webhooks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks (0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <TestTube className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first webhook to start receiving blog posts automatically.
            </p>
            <Button asChild>
              <Link href="/webhooks/new">
                Create Webhook
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Webhooks ({webhooks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & URL</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Industries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Delivery</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{webhook.name}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {webhook.url}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {webhook.method}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {webhook.auth.type}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getScheduleText(webhook.schedule)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {webhook.industries.slice(0, 2).map((industry) => (
                        <Badge key={industry} variant="secondary" className="text-xs block w-fit">
                          {INDUSTRY_LABELS[industry]}
                        </Badge>
                      ))}
                      {webhook.industries.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{webhook.industries.length - 2} more
                        </Badge>
                      )}
                      {webhook.industryRotation && (
                        <Badge variant="outline" className="text-xs">
                          Rotating
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {webhook.lastDelivery ? (
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(webhook.lastDelivery.status)} border-current`}
                      >
                        {webhook.lastDelivery.status === "success" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {webhook.lastDelivery.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No deliveries
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {webhook.lastDelivery ? (
                      <div className="text-sm">
                        <div>{webhook.lastDelivery.timestamp.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {webhook.lastDelivery.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={webhook.enabled}
                      disabled={togglingWebhooks.has(webhook.id)}
                      onCheckedChange={(enabled) => handleToggleEnabled(webhook.id, enabled)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/webhooks/${webhook.id}/logs`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={testingWebhooks.has(webhook.id)}
                        onClick={() => handleTestWebhook(webhook.id)}
                      >
                        {testingWebhooks.has(webhook.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/webhooks/${webhook.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}