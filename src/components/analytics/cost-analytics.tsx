"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingDown, TrendingUp, Zap, RefreshCw, Calendar, BarChart3, CalendarDays, TrendingUp as TrendUp } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

interface CostData {
  today: {
    total_usd: number
    gemini_usd: number
    linkup_eur: number
    services: Record<string, {
      cost: number
      currency: string
      currency_symbol: string
      cost_usd: number
      requests: number
      avg_cost_per_request: number
    }>
  }
  exchange_rate: {
    eur_to_usd: number
    last_updated: string
    source: string
  }
  weekly_summary: {
    total_cost_usd: number
    total_requests: number
    avg_daily_cost_usd: number
  }
}

interface MonthlyCostData {
  month: number
  year: number
  days_in_month: number
  current_day: number
  monthly_totals: {
    total_usd: number
    total_requests: number
    services: Record<string, {
      cost_usd: number
      requests: number
    }>
    avg_daily_usd: number
    projected_month_usd: number
  }
  daily_breakdown: Array<{
    date: string
    day: number
    total_usd: number
    total_requests: number
    services: Record<string, {
      cost: number
      cost_usd: number
      requests: number
    }>
    is_future: boolean
  }>
}

export function CostAnalytics() {
  const [costData, setCostData] = useState<CostData | null>(null)
  const [monthlyCostData, setMonthlyCostData] = useState<MonthlyCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCostData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getDetailedCosts()
      setCostData(data)
    } catch (error) {
      console.error('Failed to fetch cost data:', error)
      setError('Failed to load cost information')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchMonthlyCostData = async () => {
    try {
      setMonthlyLoading(true)
      setError(null)
      const data = await apiClient.getMonthlyCosts()
      setMonthlyCostData(data)
    } catch (error) {
      console.error('Failed to fetch monthly cost data:', error)
      setError('Failed to load monthly cost information')
    } finally {
      setMonthlyLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchCostData(), fetchMonthlyCostData()])
  }

  useEffect(() => {
    fetchCostData()
    fetchMonthlyCostData()
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchCostData()
      fetchMonthlyCostData()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading cost analytics...</div>
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500 text-center">{error}</div>
          <Button onClick={handleRefresh} className="mt-4 mx-auto block">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!costData) {
    return <div className="text-center p-8">No cost data available</div>
  }

  const totalServices = Object.keys(costData.today.services).length
  const totalRequests = Object.values(costData.today.services).reduce((sum, service) => sum + service.requests, 0)
  const weeklyTrend = costData.weekly_summary.avg_daily_cost_usd > costData.today.total_usd ? "down" : "up"
  const monthlyEstimate = costData.weekly_summary.avg_daily_cost_usd * 30

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cost Analytics</h2>
          <p className="text-muted-foreground">
            Monitor API usage costs and service performance
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costData.today.total_usd.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {totalRequests} requests across {totalServices} services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costData.weekly_summary.avg_daily_cost_usd.toFixed(4)}</div>
            <div className="flex items-center text-xs">
              {weeklyTrend === "up" ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              <span className={weeklyTrend === "up" ? "text-red-500" : "text-green-500"}>
                vs today
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Estimate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyEstimate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on 7-day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exchange Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costData.exchange_rate.eur_to_usd.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              EUR/USD • {costData.exchange_rate.last_updated}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service Breakdown</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
          <TabsTrigger value="currency">Currency View</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(costData.today.services).map(([service, data]) => (
              <Card key={service}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">{service}</CardTitle>
                  {service === 'gemini' ? (
                    <Zap className="h-4 w-4 text-blue-500" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.currency_symbol}{data.cost.toFixed(4)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>USD equivalent:</span>
                      <span>${data.cost_usd.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Requests:</span>
                      <span>{data.requests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg per request:</span>
                      <span>{data.currency_symbol}{data.avg_cost_per_request.toFixed(6)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          {monthlyLoading ? (
            <div className="flex items-center justify-center p-8">Loading daily breakdown...</div>
          ) : monthlyCostData ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today&apos;s Cost</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${monthlyCostData.daily_breakdown.find(d => d.day === monthlyCostData.current_day)?.total_usd.toFixed(4) || '0.0000'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Day {monthlyCostData.current_day} of {monthlyCostData.days_in_month}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Daily</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${monthlyCostData.monthly_totals.avg_daily_usd.toFixed(4)}</div>
                    <p className="text-xs text-muted-foreground">This month average</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
                    <TrendUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${Math.max(...monthlyCostData.daily_breakdown.map(d => d.total_usd)).toFixed(4)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Day {monthlyCostData.daily_breakdown.find(d => d.total_usd === Math.max(...monthlyCostData.daily_breakdown.map(d => d.total_usd)))?.day}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Days</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monthlyCostData.daily_breakdown.filter(d => d.total_usd > 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Days with API usage
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Daily Cost Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {/* Calendar headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {monthlyCostData.daily_breakdown.map(dayData => {
                      const isToday = dayData.day === monthlyCostData.current_day
                      const hasCost = dayData.total_usd > 0
                      
                      return (
                        <div
                          key={dayData.day}
                          className={`p-2 text-center border rounded ${
                            isToday 
                              ? 'bg-primary text-primary-foreground' 
                              : hasCost 
                                ? 'bg-green-50 hover:bg-green-100' 
                                : dayData.is_future 
                                  ? 'bg-gray-50 text-gray-400' 
                                  : 'hover:bg-gray-50'
                          }`}
                          title={`${dayData.date}: $${dayData.total_usd.toFixed(4)}`}
                        >
                          <div className="font-medium">{dayData.day}</div>
                          {hasCost && (
                            <div className="text-xs text-green-600">
                              ${dayData.total_usd.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center p-8">No daily breakdown data available</div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {monthlyLoading ? (
            <div className="flex items-center justify-center p-8">Loading monthly analysis...</div>
          ) : monthlyCostData ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Month Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${monthlyCostData.monthly_totals.total_usd.toFixed(4)}</div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(0, monthlyCostData.month - 1).toLocaleDateString('en', { month: 'long' })} {monthlyCostData.year}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projected Total</CardTitle>
                    <TrendUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${monthlyCostData.monthly_totals.projected_month_usd.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Based on current trend</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthlyCostData.monthly_totals.total_requests.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">API calls this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Progress</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round((monthlyCostData.current_day / monthlyCostData.days_in_month) * 100)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Day {monthlyCostData.current_day} of {monthlyCostData.days_in_month}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Monthly Service Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(monthlyCostData.monthly_totals.services).map(([service, data]) => (
                        <div key={service} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {service === 'gemini' ? (
                              <Zap className="h-4 w-4 text-blue-500" />
                            ) : (
                              <RefreshCw className="h-4 w-4 text-green-500" />
                            )}
                            <span className="capitalize font-medium">{service}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${data.cost_usd.toFixed(4)}</div>
                            <div className="text-xs text-muted-foreground">{data.requests} requests</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Cost Trend Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Current pace:</span>
                        <span className="font-medium">${monthlyCostData.monthly_totals.avg_daily_usd.toFixed(4)}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Month projection:</span>
                        <span className="font-medium">${monthlyCostData.monthly_totals.projected_month_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efficiency:</span>
                        <span className="font-medium">
                          ${(monthlyCostData.monthly_totals.total_usd / Math.max(monthlyCostData.monthly_totals.total_requests, 1)).toFixed(6)}/req
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">No monthly analysis data available</div>
          )}
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">USD Costs (Gemini)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  ${costData.today.gemini_usd.toFixed(4)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  AI content generation and processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">EUR Costs (Linkup)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  €{costData.today.linkup_eur.toFixed(4)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Research and fact-checking services
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Exchange Rate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-2xl font-bold">
                    {costData.exchange_rate.eur_to_usd.toFixed(4)}
                  </div>
                  <p className="text-sm text-muted-foreground">EUR to USD rate</p>
                </div>
                <div>
                  <Badge variant="outline">{costData.exchange_rate.last_updated}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">Last updated</p>
                </div>
                <div>
                  <Badge variant="secondary">{costData.exchange_rate.source}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">Data source</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(costData.today.total_usd / Math.max(totalRequests, 1)).toFixed(6)}
                </div>
                <p className="text-sm text-muted-foreground">Average cost per request</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costData.weekly_summary.total_requests.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total requests (7 days)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(costData.weekly_summary.total_requests / 7)}
                </div>
                <p className="text-sm text-muted-foreground">Requests per day</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}