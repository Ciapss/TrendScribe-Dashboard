"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, RefreshCw, Zap } from "lucide-react"
import { useCostData } from "@/contexts/DataContext"

export function CostOverview() {
  const { costData, loading, error } = useCostData()

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">--</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500 text-center">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!costData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">No cost data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${costData.today.total_usd.toFixed(4)}
          </div>
          <p className="text-xs text-muted-foreground">
            All services combined (USD)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gemini (AI)</CardTitle>
          <Zap className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${costData.today.gemini_usd.toFixed(4)}
          </div>
          <p className="text-xs text-muted-foreground">
            Content generation costs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Linkup (Research)</CardTitle>
          <RefreshCw className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            €{costData.today.linkup_eur.toFixed(4)}
          </div>
          <p className="text-xs text-muted-foreground">
            Research & fact-checking
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${costData.weekly_summary.avg_daily_cost_usd.toFixed(4)}
          </div>
          <p className="text-xs text-muted-foreground">
            Daily average (7 days)
          </p>
        </CardContent>
      </Card>

      {/* Exchange Rate Info */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cost Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Exchange Rate</h4>
              <div className="text-lg font-bold">
                1 EUR = ${costData.exchange_rate.eur_to_usd.toFixed(4)} USD
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {costData.exchange_rate.last_updated}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  via {costData.exchange_rate.source}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Weekly Summary</h4>
              <div className="text-lg font-bold">
                ${costData.weekly_summary.total_cost_usd.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground">
                {costData.weekly_summary.total_requests} requests total
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Service Breakdown</h4>
              <div className="space-y-1">
                {Object.entries(costData.today.services).map(([service, data]) => (
                  <div key={service} className="flex justify-between text-sm">
                    <span className="capitalize">{service}:</span>
                    <span>
                      {data.currency_symbol}{data.cost.toFixed(4)} 
                      ({data.requests} req)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}