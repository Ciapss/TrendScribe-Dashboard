"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"
import type { BlogPost } from "@/types"
import { INDUSTRY_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

interface RecentPostsProps {
  className?: string
}

export function RecentPosts({ className }: RecentPostsProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getPosts({ 
          limit: 5, 
          sort: 'date-desc' 
        })
        
        // Client-side sorting to ensure newest posts are first
        const sortedPosts = [...response.posts].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        
        setPosts(sortedPosts)
      } catch (error) {
        console.error('Failed to fetch recent posts:', error)
        setError('Failed to load recent posts')
      } finally {
        setLoading(false)
      }
    }

    fetchRecentPosts()
  }, [])

  const getQualityColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800"
    if (score >= 75) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <Card className={`${className} min-w-0`}>
      <CardHeader>
        <CardTitle>Recent Posts</CardTitle>
        <CardDescription>
          Your latest generated blog posts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : posts.length === 0 ? (
          <div className="text-muted-foreground text-sm">No posts found</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="cursor-pointer flex items-start space-x-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {INDUSTRY_LABELS[post.industry]}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getQualityColor(post.metadata.qualityScore)}`}
                    >
                      {post.metadata.qualityScore}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()} • {post.metadata.wordCount} words
                  </p>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/posts/${post.id}`}>
                      <Eye className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/posts">
              View All Posts
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}