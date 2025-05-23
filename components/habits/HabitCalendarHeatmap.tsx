"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format, subWeeks, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns"
import * as React from "react"
import { Calendar, BarChart3, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface HabitLog {
  id: string
  habit_id: string
  completion_date: string
  status: 'completed'
  notes: string | null
  created_at: string
}

interface Habit {
  id: string
  name: string
  description: string | null
  category: string | null
  frequency: 'daily' | 'weekly' | 'custom'
  frequency_days: number[]
  current_streak: number
  completions: number
  total_days: number
  created_at: string
  updated_at: string
}

interface HabitCalendarHeatmapProps {
  logs: HabitLog[]
  habits?: Habit[]
  title?: string
  description?: string
}

// Custom styles for the heatmap grid
const styles = `
  .grid-cols-52 {
    grid-template-columns: repeat(52, minmax(0, 1fr));
  }
  
  .heatmap-cell {
    width: 12px;
    height: 12px;
  }
  
  .grid-rows-7 {
    grid-template-rows: repeat(7, 12px);
    grid-gap: 4px;
  }
`

export function HabitCalendarHeatmap({ 
  logs, 
  habits = [],
  title = "Progress Visualization", 
  description = "View your habit progress over time" 
}: HabitCalendarHeatmapProps) {
  const [selectedView, setSelectedView] = React.useState('intensity')

  // Calculate completion intensity for each date (how many habits completed)
  const getCompletionIntensity = (dateStr: string) => {
    const dayLogs = logs.filter(log => log.completion_date.split('T')[0] === dateStr)
    const uniqueHabits = new Set(dayLogs.map(log => log.habit_id))
    return uniqueHabits.size
  }

  // Get max possible completions per day (number of active habits on any given day)
  const maxPossibleCompletions = habits.length

  // Process logs into weekly data for bar chart
  const processWeeklyData = () => {
    const now = new Date()
    const startDate = subWeeks(now, 11) // Last 12 weeks
    const weeks = eachWeekOfInterval({ start: startDate, end: now })
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart)
      const weekLabel = format(weekStart, 'MMM d')
      
      const weekData: any = {
        week: weekLabel,
        weekStart: weekStart.toISOString(),
      }
      
      // For each habit, count completions in this week
      habits.forEach((habit, index) => {
        const weekLogs = logs.filter(log => {
          const logDate = new Date(log.completion_date)
          return log.habit_id === habit.id && 
                 logDate >= weekStart && 
                 logDate <= weekEnd &&
                 log.status === 'completed'
        })
        
        weekData[habit.id] = weekLogs.length
      })
      
      return weekData
    })
  }

  // Generate calendar grid
  const renderCalendarGrid = () => {
    return (
      <div className="grid grid-cols-52 gap-1">
        {Array.from({ length: 52 }).map((_, weekIndex) => {
          const currentYear = new Date().getFullYear()
          const startOfYear = new Date(currentYear, 0, 1)
          
          // Adjust start date to previous Sunday
          const dayOfWeek = startOfYear.getDay()
          const adjustedStart = new Date(startOfYear)
          if (dayOfWeek !== 0) {
            adjustedStart.setDate(adjustedStart.getDate() - dayOfWeek)
          }
          
          // Calculate the start date for this week column
          const weekStart = new Date(adjustedStart)
          weekStart.setDate(adjustedStart.getDate() + (weekIndex * 7))
          
          return (
            <div key={weekIndex} className="grid grid-rows-7">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                // Calculate the date for this cell
                const date = new Date(weekStart)
                date.setDate(weekStart.getDate() + dayIndex)
                const dateStr = date.toISOString().split('T')[0]
                
                // Check if this date is in the future
                const isFuture = date > new Date()
                
                // Show completion intensity (how many habits completed)
                const intensity = getCompletionIntensity(dateStr)
                const intensityPercent = maxPossibleCompletions > 0 ? (intensity / maxPossibleCompletions) : 0
                
                let cellClass = 'heatmap-cell rounded-sm '
                let tooltipText = `${dateStr}: `
                
                if (isFuture) {
                  cellClass += 'bg-muted/10'
                  tooltipText += 'Future date'
                } else if (intensity === 0) {
                  cellClass += 'bg-muted/20 hover:bg-muted/30'
                  tooltipText += 'No habits completed'
                } else {
                  // Use different colors based on completion percentage
                  if (intensityPercent >= 1.0) {
                    // 100% completion - full green
                    cellClass += 'bg-green-500 hover:bg-green-500/80'
                  } else {
                    // Partial completion - yellow
                    cellClass += 'bg-yellow-500 hover:bg-yellow-500/80'
                  }
                  tooltipText += `${intensity}/${maxPossibleCompletions} habits completed`
                }
                
                return (
                  <div
                    key={dayIndex}
                    className={cellClass}
                    title={tooltipText}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <style jsx>{styles}</style>
      <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/10 to-transparent">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs value={selectedView} onValueChange={setSelectedView} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="intensity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Completion Intensity
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              All Habits Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intensity" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Daily Habit Completion Intensity</h4>
                <Badge variant="outline">
                  {maxPossibleCompletions} total habits
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Green shows full completion, yellow shows partial completion
              </p>
              
              {/* Container with relative positioning for month labels */}
              <div className="relative">
                <div className="flex text-xs text-muted-foreground h-5 mb-1 overflow-hidden">
                  {/* Month labels - Jan to Dec */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => {
                    const date = new Date(new Date().getFullYear(), month, 1)
                    const weekPosition = Math.floor(month * (52 / 12))
                    const centeredPosition = weekPosition + Math.floor((52 / 12) / 2)
                    const leftPosition = `${(centeredPosition / 52) * 100}%`
                    
                    return (
                      <div 
                        key={month} 
                        className="absolute font-medium" 
                        style={{ left: leftPosition }}
                      >
                        {format(date, 'MMM')}
                      </div>
                    )
                  })}
                </div>
                
                {renderCalendarGrid()}
              </div>
              
              <div className="flex justify-start gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="text-xs text-muted-foreground">All habits completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                  <span className="text-xs text-muted-foreground">Some habits completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-muted/40 rounded-sm border border-border"></div>
                  <span className="text-xs text-muted-foreground">No habits completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-muted/20 rounded-sm border border-border"></div>
                  <span className="text-xs text-muted-foreground">Future</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Weekly Habit Completions</h4>
                <Badge variant="outline">
                  Last 12 weeks
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Compare all habits' completion patterns over time with stacked completions
              </p>
              
              {habits.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processWeeklyData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="week" 
                        className="text-muted-foreground text-xs" 
                        stroke="hsl(var(--muted-foreground))" 
                        tickLine={false}
                      />
                      <YAxis 
                        className="text-muted-foreground text-xs" 
                        stroke="hsl(var(--muted-foreground))" 
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))", 
                          color: "hsl(var(--foreground))" 
                        }}
                        formatter={(value, name) => {
                          const habit = habits.find(h => h.id === name)
                          return [
                            `${value} completions`,
                            habit?.name || 'Unknown Habit'
                          ]
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const habit = habits.find(h => h.id === value)
                          return habit?.name || 'Unknown Habit'
                        }}
                      />
                      {(() => {
                        // Define a consistent color palette prioritizing shadcn chart colors
                        const colorPalette = [
                          'hsl(var(--chart-1))',
                          'hsl(var(--chart-2))',
                          'hsl(var(--chart-3))',
                          'hsl(var(--chart-4))',
                          'hsl(var(--chart-5))',
                          'hsl(var(--primary))',
                          '#10b981', // emerald-500
                          '#f59e0b', // amber-500
                          '#8b5cf6', // violet-500
                          '#ec4899', // pink-500
                          '#06b6d4', // cyan-500
                          '#84cc16', // lime-500
                        ];
                        
                        return habits.map((habit, index) => (
                          <Bar 
                            key={habit.id}
                            dataKey={habit.id}
                            stackId="habits"
                            fill={colorPalette[index % colorPalette.length]}
                            radius={index === habits.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                          />
                        ));
                      })()}
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                    {(() => {
                      // Use the same color palette as the chart
                      const colorPalette = [
                        'hsl(var(--chart-1))',
                        'hsl(var(--chart-2))',
                        'hsl(var(--chart-3))',
                        'hsl(var(--chart-4))',
                        'hsl(var(--chart-5))',
                        'hsl(var(--primary))',
                        '#10b981', // emerald-500
                        '#f59e0b', // amber-500
                        '#8b5cf6', // violet-500
                        '#ec4899', // pink-500
                        '#06b6d4', // cyan-500
                        '#84cc16', // lime-500
                      ];
                      
                      return habits.map((habit, index) => (
                        <div 
                          key={habit.id}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/20"
                        >
                          <div 
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
                          />
                          <span className="text-xs font-medium truncate">{habit.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {habit.completions}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p>No habits to display</p>
                  <p className="text-xs mt-1">Create some habits to see their progress</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 