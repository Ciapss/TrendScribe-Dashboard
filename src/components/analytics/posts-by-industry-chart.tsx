"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useEffect, useState } from "react"
import { INDUSTRY_LABELS } from "@/lib/constants"
import { apiClient } from "@/lib/api-client"


const COLORS = [
  '#0088FE',
  '#00C49F', 
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658'
]

type IndustryData = { industry: string; count: number; percentage: number };

export function PostsByIndustryChart() {
  const [data, setData] = useState<IndustryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const stats = await apiClient.getDashboardStats()
        
        // Calculate percentages and transform data
        const total = stats.postsByIndustry.reduce((sum, item) => sum + item.count, 0)
        const transformedData: IndustryData[] = stats.postsByIndustry
          .map(item => ({
            industry: item.industry,
            count: item.count,
            percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0
          }))
          .sort((a, b) => b.count - a.count) // Sort by count descending
        
        setData(transformedData)
      } catch (error) {
        console.error('Failed to fetch posts by industry data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch industry data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: IndustryData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-md">
          <p className="font-medium">{INDUSTRY_LABELS[data.industry]}</p>
          <p className="text-sm text-muted-foreground">
            {data.count} posts ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts by Industry</CardTitle>
        <CardDescription>
          Distribution of your generated content across different industries
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
              <p className="text-sm">Failed to load industry data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No industry data available</p>
              <p className="text-xs mt-1">Generate some posts to see the distribution</p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }: { percentage: number }) => `${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="mt-4 space-y-2">
              {data.slice(0, 5).map((item, index) => (
                <div key={item.industry} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm">{INDUSTRY_LABELS[item.industry] || item.industry}</span>
                  </div>
                  <span className="text-sm font-medium">{item.count} posts</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}