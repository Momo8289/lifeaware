"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import * as React from "react"
import { Calendar, BarChart3, Users, TrendingUp } from "lucide-react"

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

// Generate distinct colors for habits
const HABIT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-red-500', 'bg-yellow-500', 'bg-cyan-500'
]

export function HabitCalendarHeatmap({ 
  logs, 
  habits = [],
  title = "Progress Visualization", 
  description = "View your habit progress over time" 
}: HabitCalendarHeatmapProps) {
  const [selectedView, setSelectedView] = React.useState('intensity')
  const [selectedHabit, setSelectedHabit] = React.useState<string | null>(null)

  // Calculate completion intensity for each date (how many habits completed)
  const getCompletionIntensity = (dateStr: string) => {
    const dayLogs = logs.filter(log => log.completion_date.split('T')[0] === dateStr)
    const uniqueHabits = new Set(dayLogs.map(log => log.habit_id))
    return uniqueHabits.size
  }

  // Get max possible completions per day (number of active habits on any given day)
  const maxPossibleCompletions = habits.length

  // Check if a specific habit was completed on a date
  const isHabitCompleted = (dateStr: string, habitId: string) => {
    return logs.some(log => 
      log.completion_date.split('T')[0] === dateStr && 
      log.habit_id === habitId
    )
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
                
                if (selectedView === 'intensity') {
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
                } else if (selectedView === 'individual' && selectedHabit) {
                  // Show individual habit completion
                  const isCompleted = isHabitCompleted(dateStr, selectedHabit)
                  
                  let cellClass = 'heatmap-cell rounded-sm '
                  let tooltipText = `${dateStr}: `
                  
                  if (isFuture) {
                    cellClass += 'bg-muted/10'
                    tooltipText += 'Future date'
                  } else {
                    cellClass += isCompleted 
                      ? 'bg-success hover:bg-success/80' 
                      : 'bg-muted/20 hover:bg-muted/30'
                    tooltipText += isCompleted ? 'Completed' : 'Not completed'
                  }
                  
                  return (
                    <div
                      key={dayIndex}
                      className={cellClass}
                      title={tooltipText}
                    />
                  )
                }
                
                // Default fallback
                return (
                  <div
                    key={dayIndex}
                    className="heatmap-cell rounded-sm bg-muted/10"
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
              <Users className="h-4 w-4" />
              Individual Habits
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
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Select a habit to view</h4>
                <div className="flex flex-wrap gap-2">
                  {habits.map((habit, index) => (
                    <button
                      key={habit.id}
                      onClick={() => setSelectedHabit(habit.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedHabit === habit.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${HABIT_COLORS[index % HABIT_COLORS.length]}`}
                        />
                        {habit.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedHabit ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex text-xs text-muted-foreground h-5 mb-1 overflow-hidden">
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
                      <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-muted/40 rounded-sm border border-border"></div>
                      <span className="text-xs text-muted-foreground">Not completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-muted/20 rounded-sm border border-border"></div>
                      <span className="text-xs text-muted-foreground">Future</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p>Select a habit to view its progress</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 