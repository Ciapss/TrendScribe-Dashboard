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
import { Eye, Copy, Download, MoreHorizontal, AlertCircle, RefreshCw } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import type { BlogPost } from "@/types"
import { INDUSTRY_LABELS } from "@/lib/constants"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth/auth-provider"
import { useIsMobile } from "@/hooks/use-mobile"

interface PostsTableProps {
  searchQuery?: string
  industryFilter?: string
  sortBy?: string
}

function MobilePostCard({ post, isAdmin, onCopyTitle, onExport }: {
  post: BlogPost
  isAdmin: boolean
  onCopyTitle: (title: string) => void
  onExport: (post: BlogPost) => void
}) {
  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 75) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getSeoColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 80) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Title and Industry */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm leading-tight line-clamp-2">{post.title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {INDUSTRY_LABELS[post.industry] || post.industry}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {post.metadata.readingTime} min read
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">Created</div>
            <div>{post.createdAt.toLocaleDateString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Words</div>
            <div className="font-medium">{post.metadata.wordCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Quality & SEO Scores */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${getQualityColor(post.metadata.qualityScore)} text-xs`}
          >
            Q: {post.metadata.qualityScore.toFixed(0)}/100
          </Badge>
          <Badge 
            variant="outline" 
            className={`${getSeoColor(post.metadata.seoScore)} text-xs`}
          >
            SEO: {post.metadata.seoScore.toFixed(0)}%
          </Badge>
          {isAdmin && post.generationCost !== undefined && (
            <Badge variant="outline" className="text-xs">
              ${post.generationCost.toFixed(2)}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" asChild className="min-h-[44px] flex-1 mr-2">
            <Link href={`/posts/${post.id}`} className="flex items-center justify-center">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopyTitle(post.title)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(post)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}

export function PostsTable({ searchQuery, industryFilter, sortBy }: PostsTableProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isMobile = useIsMobile()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getPosts({
        page,
        limit: pagination.limit,
        search: searchQuery,
        filter: industryFilter,
        sort: sortBy || "date-desc"
      })
      
      // Convert date strings to Date objects
      const postsWithDates = response.posts.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt)
      }))
      
      // Client-side sorting as fallback to ensure correct order
      const sortedPosts = [...postsWithDates].sort((a, b) => {
        const sortOrder = sortBy || "date-desc"
        
        if (sortOrder.startsWith("date")) {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return sortOrder.includes("desc") ? dateB - dateA : dateA - dateB
        }
        
        if (sortOrder.startsWith("quality")) {
          const qualityA = a.metadata.qualityScore
          const qualityB = b.metadata.qualityScore
          return sortOrder.includes("desc") ? qualityB - qualityA : qualityA - qualityB
        }
        
        if (sortOrder.startsWith("title")) {
          const titleA = a.title.toLowerCase()
          const titleB = b.title.toLowerCase()
          return sortOrder.includes("desc") ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB)
        }
        
        // Default to newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      setPosts(sortedPosts)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, industryFilter, sortBy, pagination.limit])

  useEffect(() => {
    fetchPosts(1)
  }, [fetchPosts])

  const handlePageChange = (newPage: number) => {
    fetchPosts(newPage)
  }

  const handleRetry = () => {
    fetchPosts(pagination.page)
  }

  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 75) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getSeoColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 80) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title)
    // TODO: Add toast notification
  }

  const handleExport = (post: BlogPost) => {
    // TODO: Implement export functionality
    console.log('Export post:', post.id)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Posts...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>SEO</TableHead>
                  {isAdmin && <TableHead>Cost</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted rounded animate-pulse w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="h-3 bg-muted rounded animate-pulse w-16" />
                        <div className="h-3 bg-muted rounded animate-pulse w-12" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-12" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted rounded animate-pulse w-12" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted rounded animate-pulse w-12" />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="h-4 bg-muted rounded animate-pulse w-16" />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts (0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {searchQuery || industryFilter 
                ? "No posts found matching your filters." 
                : "No posts have been generated yet."}
            </p>
            {(searchQuery || industryFilter) && (
              <Button variant="outline" onClick={() => fetchPosts(1)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Posts ({pagination.total.toLocaleString()})
          {(searchQuery || industryFilter) && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              • Filtered
            </span>
          )}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleRetry} className="min-h-[44px] sm:min-h-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          /* Mobile Card Layout */
          <div className="space-y-3">
            {posts.map((post) => (
              <MobilePostCard
                key={post.id}
                post={post}
                isAdmin={isAdmin}
                onCopyTitle={handleCopyTitle}
                onExport={handleExport}
              />
            ))}
          </div>
        ) : (
          /* Desktop Table Layout */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>SEO</TableHead>
                  {isAdmin && <TableHead>Cost</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-[300px]">
                      <div className="truncate font-medium">
                        {post.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {post.metadata.readingTime} min read
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {INDUSTRY_LABELS[post.industry] || post.industry}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {post.createdAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {post.createdAt.toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {post.metadata.wordCount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getQualityColor(post.metadata.qualityScore)}
                      >
                        {post.metadata.qualityScore.toFixed(0)}/100
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getSeoColor(post.metadata.seoScore)}
                      >
                        {post.metadata.seoScore.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="text-sm font-medium">
                          {post.generationCost !== undefined 
                            ? `$${post.generationCost.toFixed(2)}` 
                            : "—"}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/posts/${post.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyTitle(post.title)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Title
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(post)}>
                              <Download className="mr-2 h-4 w-4" />
                              Export
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
        )}
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-4 space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} posts
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="min-h-[44px] sm:min-h-auto"
              >
                Previous
              </Button>
              
              {/* Page numbers - simplified for mobile */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(isMobile ? 3 : 5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= (isMobile ? 3 : 5)) {
                    pageNum = i + 1;
                  } else {
                    const start = Math.max(1, pagination.page - (isMobile ? 1 : 2));
                    const end = Math.min(pagination.pages, start + (isMobile ? 2 : 4));
                    pageNum = start + i;
                    if (pageNum > end) return null;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0 sm:w-8 sm:h-8 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="min-h-[44px] sm:min-h-auto"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}