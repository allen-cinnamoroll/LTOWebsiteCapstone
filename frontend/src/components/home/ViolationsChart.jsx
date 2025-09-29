"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import apiClient from "@/api/axios"
import { useAuth } from "@/context/AuthContext"

const chartConfig = {
  views: {
    label: "Page Views",
  },
  violations: {
    label: "Violations",
    color: "hsl(var(--chart-1))",
  },
  accidents: {
    label: "Accidents",
    color: "hsl(var(--chart-2))",
  },
}

export function ViolationsChart() {
  const [activeChart, setActiveChart] = React.useState("violations")
  const [timePeriod, setTimePeriod] = React.useState("all")
  const [chartData, setChartData] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const auth = useAuth();
  const { token } = auth || {};

  // Fetch chart data when time period changes
  React.useEffect(() => {
    fetchChartData()
  }, [timePeriod])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await apiClient.get(`/dashboard/chart?period=${timePeriod}`, {
        headers: {
          Authorization: token,
        },
      })
      
      if (data.success) {
        // Transform API data to chart format
        const transformedData = data.data.chartData.map(item => {
          let dateString = ''
          
          if (timePeriod === 'week') {
            dateString = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
          } else if (timePeriod === 'years') {
            dateString = `${item.year}-01-01`
          } else {
            // For all other periods (3months, 6months, months, year, all), use month-year format
            dateString = `${item.year}-${String(item.month).padStart(2, '0')}-01`
          }
          
          return {
            date: dateString,
            violations: item.violations || 0,
            accidents: item.accidents || 0
          }
        })
        
        setChartData(transformedData)
      }
    } catch (err) {
      console.error("Error fetching chart data:", err)
      setError("Failed to load chart data")
    } finally {
      setLoading(false)
    }
  }

  const total = React.useMemo(
    () => ({
      violations: chartData.reduce((acc, curr) => acc + curr.violations, 0),
      accidents: chartData.reduce((acc, curr) => acc + curr.accidents, 0),
    }),
    [chartData],
  )

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'Last Week'
      case '3months': return 'Last 3 Months'
      case '6months': return 'Last 6 Months'
      case 'months': return 'Last 12 Months'
      case 'year': return 'Last Year'
      case 'years': return 'Last 5 Years'
      case 'all': return 'All Time'
      default: return 'All Time'
    }
  }

  return (
    <Card className="md:shadow-none border">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Violation & Accidents Overview</CardTitle>
          <CardDescription>
            Showing violation and accident frequency for {getPeriodLabel(timePeriod)}
          </CardDescription>
          <div className="mt-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="months">Last 12 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="years">Last 5 Years</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex">
          {["violations", "accidents"].map((key) => {
            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-xs text-muted-foreground">{chartConfig[key].label}</span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {loading ? "..." : total[key].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-red-500">{error}</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">No data available for the selected period</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  if (timePeriod === 'week') {
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  } else if (timePeriod === 'years') {
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                    })
                  } else {
                    // For all other periods (3months, 6months, months, year, all), use month-year format
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  }
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="views"
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      if (timePeriod === 'week') {
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      } else if (timePeriod === 'years') {
                        return date.toLocaleDateString("en-US", {
                          year: "numeric",
                        })
                      } else {
                        // For all other periods (3months, 6months, months, year, all), use month-year format
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      }
                    }}
                  />
                }
              />
              <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

