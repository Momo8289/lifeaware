"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import * as React from "react"
import { Calendar } from "lucide-react"

interface HabitLog {
  id: string
  habit_id: string
  completion_date: string
  status: 'completed'
  notes: string | null
  created_at: string
}

interface HabitCalendarHeatmapProps {
  logs: HabitLog[]
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
  title = "Progress Visualization", 
  description = "View your habit progress over time" 
}: HabitCalendarHeatmapProps) {
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
        <div className="space-y-6">
          {/* Container with relative positioning for month labels */}
          <div className="relative">
            <div className="flex text-xs text-muted-foreground h-5 mb-1 overflow-hidden">
              {/* Month labels - Jan to Dec */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => {
                // Create a date for the first of each month of the current year
                const date = new Date(new Date().getFullYear(), month, 1)
                
                // Calculate position based on month (0-11)
                // Each month gets approximately 4.33 weeks (52/12)
                const weekPosition = Math.floor(month * (52 / 12))
                
                // Center the label by adding half a month's width
                const centeredPosition = weekPosition + Math.floor((52 / 12) / 2)
                
                // Convert to percentage
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
            
            <div className="grid grid-cols-52 gap-1">
              {Array.from({ length: 52 }).map((_, weekIndex) => {
                // For January to December display of current year
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
                      
                      // Check if this date has a log
                      const hasLog = logs.some(log => log.completion_date.split('T')[0] === dateStr)
                      
                      // Check if this date is in the future
                      const isFuture = date > new Date()
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`heatmap-cell rounded-sm ${
                            isFuture 
                              ? 'bg-muted/10' 
                              : hasLog
                                ? 'bg-success hover:bg-success/80'
                                : 'bg-muted/20 hover:bg-muted/30'
                          }`}
                          title={`${dateStr}: ${hasLog ? 'Completed' : 'No data'}`}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="flex justify-start gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="heatmap-cell bg-success rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="heatmap-cell bg-muted/20 rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Not completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="heatmap-cell bg-muted/10 rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Future</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 