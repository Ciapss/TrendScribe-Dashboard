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
import { MoreHorizontal, Copy, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import type { APIKey } from "@/types"
import { apiClient } from "@/lib/api-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"


export function ApiKeysTable() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [operationLoading, setOperationLoading] = useState<Set<string>>(new Set())

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      setError(null)
      const keys = await apiClient.getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    // TODO: Add toast notification
  }

  const handleToggleVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      setOperationLoading(prev => new Set(prev).add(keyId))
      setError(null)
      await apiClient.revokeApiKey(keyId)
      setApiKeys(prev => 
        prev.map(key => 
          key.id === keyId 
            ? { ...key, isActive: false }
            : key
        )
      )
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      setError(error instanceof Error ? error.message : 'Failed to revoke API key')
    } finally {
      setOperationLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(keyId)
        return newSet
      })
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    try {
      setOperationLoading(prev => new Set(prev).add(keyId))
      setError(null)
      await apiClient.deleteApiKey(keyId)
      setApiKeys(prev => prev.filter(key => key.id !== keyId))
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete API key')
    } finally {
      setOperationLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(keyId)
        return newSet
      })
    }
  }

  const getPermissionBadges = (permissions: APIKey['permissions']) => {
    const badges = []
    if (permissions.readPosts) badges.push({ label: "Read", color: "bg-blue-100 text-blue-800" })
    if (permissions.generatePosts) badges.push({ label: "Generate", color: "bg-green-100 text-green-800" })
    if (permissions.manageWebhooks) badges.push({ label: "Webhooks", color: "bg-purple-100 text-purple-800" })
    return badges
  }

  const isExpired = (key: APIKey) => {
    if (!key.expiresAt) return false
    const expiryDate = typeof key.expiresAt === 'string' ? new Date(key.expiresAt) : key.expiresAt
    return expiryDate < new Date()
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Never"
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
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

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Keep your API keys secure. Never share them publicly or commit them to version control.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                Error loading API keys: {error}
              </AlertDescription>
            </Alert>
            <Button 
              className="mt-4" 
              onClick={fetchApiKeys}
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Keep your API keys secure. Never share them publicly or commit them to version control.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Keys ({apiKeys.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApiKeys}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <div className="text-4xl mb-2">🔑</div>
                <div className="text-lg font-medium">No API keys found</div>
                <div className="text-sm">Create your first API key to get started.</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div className="font-medium">{apiKey.name}</div>
                      {apiKey.expiresAt && (
                        <div className="text-xs text-muted-foreground">
                          Expires: {formatDate(apiKey.expiresAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 max-w-[200px]">
                        <code className="text-xs font-mono truncate">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.keyPreview}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKey(apiKey.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getPermissionBadges(apiKey.permissions).map((badge, index) => (
                          <Badge key={index} variant="outline" className={`text-xs ${badge.color} border-current`}>
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(apiKey.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(apiKey.lastUsedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          isExpired(apiKey)
                            ? "text-red-700 border-red-200 bg-red-50"
                            : apiKey.isActive 
                            ? "text-green-700 border-green-200 bg-green-50" 
                            : "text-gray-700 border-gray-200 bg-gray-50"
                        }
                      >
                        {isExpired(apiKey) ? "Expired" : apiKey.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={operationLoading.has(apiKey.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Key
                          </DropdownMenuItem>
                          {apiKey.isActive && !isExpired(apiKey) && (
                            <DropdownMenuItem 
                              onClick={() => handleRevokeKey(apiKey.id)}
                              className="text-orange-600"
                              disabled={operationLoading.has(apiKey.id)}
                            >
                              {operationLoading.has(apiKey.id) ? 'Revoking...' : 'Revoke'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteKey(apiKey.id)}
                            className="text-red-600"
                            disabled={operationLoading.has(apiKey.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {operationLoading.has(apiKey.id) ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}