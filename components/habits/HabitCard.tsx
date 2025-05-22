"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Check, Flame, Settings, CalendarDays, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { format, isToday } from "date-fns"

interface HabitCardProps {
  habit: {
    id: string
    name: string
    description: string | null
    category: string | null
    frequency: 'daily' | 'weekly' | 'custom'
    frequency_days: number[]
    time_of_day: string | null
    current_streak: number
    todayStatus?: 'completed' | 'pending'
  }
  onUpdateStatus: (habitId: string, status: 'completed') => Promise<void>
  isUpdating: boolean
}

export function HabitCard({ habit, onUpdateStatus, isUpdating }: HabitCardProps) {
  const frequencyText = () => {
    switch (habit.frequency) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'custom':
        if (habit.frequency_days.length === 0) return 'Custom'
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const days = habit.frequency_days.map(day => dayNames[day]).join(', ')
        return `Custom (${days})`
    }
  }

  const getStatusColor = () => {
    if (habit.todayStatus === 'completed') {
      return 'bg-success text-success-foreground'
    }
    return 'bg-secondary text-secondary-foreground'
  }

  const isScheduledForToday = () => {
    if (habit.frequency === 'daily') return true
    if (habit.frequency === 'weekly') {
      const today = new Date().getDay() // 0-6 (Sunday-Saturday)
      return today === 0 // Assuming weekly habits are for Sunday
    }
    if (habit.frequency === 'custom') {
      const today = new Date().getDay() // 0-6 (Sunday-Saturday)
      return habit.frequency_days.includes(today)
    }
    return true
  }

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      habit.todayStatus === 'completed' ? "border-success/40 bg-success/5" : "",
      !isScheduledForToday() ? "opacity-70" : ""
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{habit.name}</CardTitle>
            {habit.category && (
              <Badge variant="outline" className="mt-1">
                {habit.category}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {habit.time_of_day && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {habit.time_of_day}
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {frequencyText()}
            </Badge>
          </div>
        </div>
        {habit.description && (
          <CardDescription className="mt-2 line-clamp-2">
            {habit.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 text-orange-500 p-1 rounded-full">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current Streak</div>
              <div className="font-bold">{habit.current_streak} {habit.current_streak === 1 ? 'day' : 'days'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded-full", getStatusColor())}>
              <Check className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="font-bold">{habit.todayStatus === 'completed' ? 'Completed' : 'Pending'}</div>
            </div>
          </div>
        </div>

        {!isScheduledForToday() && (
          <div className="flex items-center gap-2 mt-3 text-muted-foreground text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>Not scheduled for today</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
        >
          <Link href={`/habits/${habit.id}`}>
            Details
          </Link>
        </Button>
        <Button
          variant={habit.todayStatus === 'completed' ? 'outline' : 'default'}
          size="sm"
          className={habit.todayStatus === 'completed' ? 'border-success text-success hover:bg-success/10' : ''}
          onClick={() => onUpdateStatus(habit.id, 'completed')}
          disabled={isUpdating}
        >
          {habit.todayStatus === 'completed' ? (
            <>
              <Check className="mr-1 h-4 w-4" /> Completed
            </>
          ) : (
            'Mark Complete'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 