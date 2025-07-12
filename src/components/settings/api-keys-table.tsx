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
import { useIsMobile } from "@/hooks/use-mobile"

function MobileApiKeyCard({ apiKey, visibleKeys, operationLoading, onToggleVisibility, onCopyKey, onRevokeKey, onDeleteKey }: {
  apiKey: APIKey
  visibleKeys: Set<string>
  operationLoading: Set<string>
  onToggleVisibility: (keyId: string) => void
  onCopyKey: (key: string) => void
  onRevokeKey: (keyId: string) => void
  onDeleteKey: (keyId: string) => void
}) {
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

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Name and Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">{apiKey.name}</h3>
            {apiKey.expiresAt && (
              <div className="text-xs text-muted-foreground">
                Expires: {formatDate(apiKey.expiresAt)}
              </div>
            )}
          </div>
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
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">API Key</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono flex-1 truncate p-2 bg-muted rounded">
              {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.keyPreview}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(apiKey.id)}
              className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
            >
              {visibleKeys.has(apiKey.id) ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyKey(apiKey.key)}
              className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Permissions</div>
          <div className="flex flex-wrap gap-1">
            {getPermissionBadges(apiKey.permissions).map((badge, index) => (
              <Badge key={index} variant="outline" className={`text-xs ${badge.color} border-current`}>
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Created</div>
            <div>{formatDate(apiKey.createdAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Used</div>
            <div>{formatDate(apiKey.lastUsedAt)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyKey(apiKey.key)}
            className="flex-1 min-h-[44px]"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Key
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={operationLoading.has(apiKey.id)}
                className="min-w-[44px] min-h-[44px]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {apiKey.isActive && !isExpired(apiKey) && (
                <DropdownMenuItem 
                  onClick={() => onRevokeKey(apiKey.id)}
                  className="text-orange-600"
                  disabled={operationLoading.has(apiKey.id)}
                >
                  {operationLoading.has(apiKey.id) ? 'Revoking...' : 'Revoke'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDeleteKey(apiKey.id)}
                className="text-red-600"
                disabled={operationLoading.has(apiKey.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {operationLoading.has(apiKey.id) ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}

export function ApiKeysTable() {
  const isMobile = useIsMobile()
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
              className="gap-2 min-h-[44px] sm:min-h-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
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
            <>
              {isMobile ? (
                /* Mobile Card Layout */
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <MobileApiKeyCard
                      key={apiKey.id}
                      apiKey={apiKey}
                      visibleKeys={visibleKeys}
                      operationLoading={operationLoading}
                      onToggleVisibility={handleToggleVisibility}
                      onCopyKey={handleCopyKey}
                      onRevokeKey={handleRevokeKey}
                      onDeleteKey={handleDeleteKey}
                    />
                  ))}
                </div>
              ) : (
                /* Desktop Table Layout */
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}