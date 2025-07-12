"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type QualityRange = {
  range: string;
  count: number;
  label: string;
};

export function QualityDistributionChart() {
  const [data, setData] = useState<QualityRange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [averageScore, setAverageScore] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch all posts to calculate quality distribution
        const response = await apiClient.getPosts({ limit: 1000 }) // Get enough posts to analyze
        const posts = response.posts
        
        if (posts.length === 0) {
          setData([])
          setAverageScore(0)
          return
        }
        
        // Calculate average quality score
        const totalScore = posts.reduce((sum, post) => sum + post.metadata.qualityScore, 0)
        const avgScore = totalScore / posts.length
        setAverageScore(avgScore)
        
        // Group posts by quality score ranges
        const ranges = [
          { range: '6.0-6.9', label: '6.0-6.9', min: 6.0, max: 6.9 },
          { range: '7.0-7.9', label: '7.0-7.9', min: 7.0, max: 7.9 },
          { range: '8.0-8.9', label: '8.0-8.9', min: 8.0, max: 8.9 },
          { range: '9.0-9.9', label: '9.0-9.9', min: 9.0, max: 9.9 },
          { range: '10.0', label: '10.0', min: 10.0, max: 10.0 },
        ]
        
        const distributionData = ranges.map(range => {
          const count = posts.filter(post => {
            const score = post.metadata.qualityScore
            if (range.range === '10.0') {
              return score === 10.0
            }
            return score >= range.min && score <= range.max
          }).length
          
          return {
            range: range.range,
            count,
            label: range.label
          }
        })
        
        setData(distributionData)
      } catch (error) {
        console.error('Failed to fetch quality distribution data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch quality data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-md">
          <p className="font-medium">Quality Score: {label}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} posts
          </p>
        </div>
      )
    }
    return null
  }

  const totalPosts = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Score Distribution</CardTitle>
        <CardDescription>
          Distribution of quality scores across {totalPosts} posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Failed to load quality data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        ) : data.length === 0 || data.every(d => d.count === 0) ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No quality data available</p>
              <p className="text-xs mt-1">Generate some posts to see quality distribution</p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Average Score</div>
                <div className="text-2xl font-bold">{averageScore.toFixed(1)}/100</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">High Quality (8.0+)</div>
                <div className="text-2xl font-bold">{
                  data.filter(d => d.range !== '6.0-6.9' && d.range !== '7.0-7.9')
                      .reduce((sum, d) => sum + d.count, 0)
                }</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}