"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import type { BlogPost } from "@/types"
import { INDUSTRY_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

export function TopPerformingPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch posts sorted by performance (combination of quality and SEO scores)
        const response = await apiClient.getPosts({ 
          limit: 10, // Get top 10 to have some buffer
          sort: 'quality_desc' // Assuming the API supports this sort option
        })
        
        // Sort by performance metric and take top 5
        const sortedPosts = response.posts
          .sort((a, b) => {
            const aPerformance = (a.metadata.seoScore + a.metadata.qualityScore * 10) / 2
            const bPerformance = (b.metadata.seoScore + b.metadata.qualityScore * 10) / 2
            return bPerformance - aPerformance
          })
          .slice(0, 5)
        
        setPosts(sortedPosts)
      } catch (error) {
        console.error('Failed to fetch top performing posts:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch top posts')
      } finally {
        setLoading(false)
      }
    }

    fetchTopPosts()
  }, [])

  const getPerformanceMetric = (post: BlogPost) => {
    // Combine SEO and quality scores for overall performance
    return ((post.metadata.seoScore + post.metadata.qualityScore * 10) / 2).toFixed(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Posts</CardTitle>
        <CardDescription>
          Your highest quality and best SEO optimized content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Failed to load top performing posts</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No posts available yet</p>
            <p className="text-xs mt-1">Generate some posts to see your top performers</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => {
              // Format the creation date properly
              const createdDate = new Date(post.createdAt)
              
              return (
                <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </span>
                      <h4 className="font-medium leading-none truncate">
                        {post.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">
                        {INDUSTRY_LABELS[post.industry] || post.industry}
                      </Badge>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Quality: {post.metadata.qualityScore}/100</span>
                        <span>•</span>
                        <span>SEO: {post.metadata.seoScore}%</span>
                        <span>•</span>
                        <span>Trend: {post.metadata.trendScore}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{createdDate.toLocaleDateString()}</span>
                      <span>{post.metadata.wordCount.toLocaleString()} words</span>
                      <span>{post.metadata.readingTime} min read</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                        {getPerformanceMetric(post)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Performance
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/posts/${post.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}