"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, PieChart, Award, Flame, Calendar, Star, Sparkles, BarChart3, TrendingUp, Trophy, Target, Clock, Zap, Medal } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HabitProgressChart } from "./HabitProgressChart"
import { Badge } from "@/components/ui/badge"
import { HabitCalendarHeatmap } from "./HabitCalendarHeatmap"
import { Progress } from "@/components/ui/progress"

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

interface HabitInsightsProps {
  habits: Habit[]
  logs: HabitLog[]
}

export function HabitInsights({ habits, logs }: HabitInsightsProps) {
  // Calculate most consistent habit (highest completion rate)
  const habitsWithStats = habits.map(habit => {
    const habitLogs = logs.filter(log => log.habit_id === habit.id)
    const completionRate = habit.total_days > 0 
      ? (habit.completions / habit.total_days) * 100 
      : habit.completions > 0 ? 100 : 0 // If habit was just created today and completed, give it 100%
    
    return {
      ...habit,
      completionRate,
      // For displaying in UI, we need formatted values
      formattedCompletionRate: `${Math.round(completionRate)}%`
    }
  })
  
  // Sort habits by completion rate, streak, then total completions, and finally by creation date (older first)
  const sortedHabits = [...habitsWithStats].sort((a, b) => {
    // For newly created habits (less than 3 days), prioritize ones with more history
    if (a.total_days < 3 && b.total_days < 3) {
      if (a.total_days !== b.total_days) return b.total_days - a.total_days
    }
    
    // Primary sort: completion rate
    if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
    
    // Secondary sort: current streak
    if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak
    
    // Tertiary sort: total completions
    if (b.completions !== a.completions) return b.completions - a.completions
    
    // If everything else is equal, prefer older habits (they've proven consistency over time)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  
  // Filter out habits with no real history for "most consistent" designation
  const habitsWithHistory = sortedHabits.filter(h => h.completions > 0)
  
  // Find all habits that are tied for most consistent
  // Get the top habit first
  const topHabit = habitsWithHistory.length > 0 ? habitsWithHistory[0] : null
  
  // Then find all habits with identical metrics to the top habit
  const mostConsistentHabits = topHabit 
    ? habitsWithHistory.filter(habit => 
        habit.completionRate === topHabit.completionRate && 
        habit.current_streak === topHabit.current_streak &&
        habit.completions === topHabit.completions
      )
    : []
  
  const leastConsistentHabit = habitsWithHistory.length > 0 ? habitsWithHistory[habitsWithHistory.length - 1] : null
  
  // Calculate habits with longest streak - prioritize actual streaks over 0
  const habitsWithStreaks = [...habitsWithStats].filter(h => h.current_streak > 0)
  
  // Get the top streak habit first
  const topStreakHabit = habitsWithStreaks.length > 0 
    ? habitsWithStreaks.sort((a, b) => {
        // First compare by streak length
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak
        // Then by completion rate (more consistent habit is more impressive)
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
        // Then by age (older habits with maintained streaks are more impressive)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })[0]
    : null
    
  // Find all habits that tie for longest streak
  const habitsWithLongestStreak = topStreakHabit
    ? habitsWithStreaks.filter(habit => 
        habit.current_streak === topStreakHabit.current_streak
      )
    : []
  
  // Get completion by category
  const categoryCompletions: Record<string, { total: number, completed: number }> = {}
  
  habits.forEach(habit => {
    const category = habit.category || 'Uncategorized'
    if (!categoryCompletions[category]) {
      categoryCompletions[category] = { total: 0, completed: 0 }
    }
    
    categoryCompletions[category].total += habit.total_days
    categoryCompletions[category].completed += habit.completions
  })
  
  const categoryData = Object.entries(categoryCompletions).map(([category, data]) => ({
    name: category,
    value: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }))
  
  // Generate suggestions based on data
  const generateSuggestions = () => {
    const suggestions: string[] = []
    
    if (leastConsistentHabit && leastConsistentHabit.completionRate < 50) {
      suggestions.push(`Try to improve your consistency with "${leastConsistentHabit.name}" to build a streak.`)
    }
    
    if (habits.filter(h => h.current_streak > 0).length === 0 && habits.length > 0) {
      suggestions.push("You don't have any active streaks. Try completing a habit today to start building momentum!")
    }
    
    if (mostConsistentHabits.length > 0 && mostConsistentHabits[0].current_streak > 3) {
      suggestions.push(`Great job maintaining your streak with "${mostConsistentHabits[0].name}"! Keep it up!`)
    }
    
    // Add a general suggestion if we don't have specific ones
    if (suggestions.length === 0 && habits.length > 0) {
      suggestions.push("Focus on completing one habit consistently before adding more to your routine.")
    }
    
    return suggestions
  }
  
  const suggestions = generateSuggestions()
  
  // Calculate total completions across all habits
  const totalCompletions = logs.filter(log => log.status === 'completed').length
  
  // Calculate if any habit had a perfect week (all required days completed in the last 7 days)
  const today = new Date()
  const lastWeekStart = new Date(today)
  lastWeekStart.setDate(today.getDate() - 7)
  
  const habitsWithPerfectWeek = habits.filter(habit => {
    // Only consider habits that have been tracked for at least 7 days
    if (habit.total_days < 7) return false
    
    // For daily habits, we expect 7 completions in the last week
    if (habit.frequency === 'daily') {
      const completionsLastWeek = logs.filter(log => 
        log.habit_id === habit.id && 
        log.status === 'completed' &&
        new Date(log.completion_date) >= lastWeekStart
      ).length
      
      return completionsLastWeek >= 7
    }
    
    // For weekly habits with specific days, check if all required days were completed
    if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
      const requiredDaysCount = habit.frequency_days.length
      if (requiredDaysCount === 0) return false
      
      const completionsLastWeek = logs.filter(log => 
        log.habit_id === habit.id && 
        log.status === 'completed' &&
        new Date(log.completion_date) >= lastWeekStart
      ).length
      
      return completionsLastWeek >= requiredDaysCount
    }
    
    return false
  })
  
  // Calculate milestone levels
  const getMilestoneLevel = (count: number) => {
    if (count >= 100) return { level: 3, text: "Gold" }
    if (count >= 50) return { level: 2, text: "Silver" }
    if (count >= 20) return { level: 1, text: "Bronze" }
    return { level: 0, text: "Getting Started" }
  }
  
  const completionMilestone = getMilestoneLevel(totalCompletions)
  
  // Determine longest active habit (tracked for the most days)
  const sortedByAge = [...habits].sort((a, b) => b.total_days - a.total_days)
  const longestActiveHabit = sortedByAge.length > 0 ? sortedByAge[0] : null
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5 text-primary" />
          Habit Insights
        </CardTitle>
        <CardDescription>
          Analytics and suggestions to improve your habits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden border-2">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Most Consistent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {mostConsistentHabits.length > 0 ? (
                <div className="space-y-4">
                  {/* Show each tied habit */}
                  {mostConsistentHabits.map(habit => (
                    <div key={habit.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                      <div className="text-lg font-bold flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        {habit.name}
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3">
                        <div className="bg-primary text-primary-foreground text-xl font-bold rounded-md px-3 py-2 inline-flex items-center">
                          {Math.round(habit.completionRate)}%
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">completion rate</span>
                          <span className="text-xs text-muted-foreground">
                            {habit.completions} completions over {habit.total_days} {habit.total_days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 w-full bg-muted/30 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${habit.completionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Show "tied" message if more than one habit */}
                  {mostConsistentHabits.length > 1 && (
                    <p className="text-xs text-muted-foreground italic">
                      {mostConsistentHabits.length} habits tied for most consistent
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground flex items-center justify-center py-6">
                  <div className="text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p>No habits tracked yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-2">
            <CardHeader className="pb-4 bg-gradient-to-r from-orange-500/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Longest Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {habitsWithLongestStreak.length > 0 ? (
                <div className="space-y-4">
                  {/* Show each tied habit */}
                  {habitsWithLongestStreak.map(habit => (
                    <div key={habit.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                      <div className="text-lg font-bold flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        {habit.name}
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3">
                        <div className="bg-orange-500 text-white text-xl font-bold rounded-md px-3 py-2 inline-flex items-center">
                          {habit.current_streak}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">days in a row</span>
                          <span className="text-xs text-muted-foreground">
                            {habit.completions} completions over {habit.total_days} {habit.total_days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-1">
                        {Array.from({ length: Math.min(7, habit.current_streak) }).map((_, i) => (
                          <div 
                            key={i} 
                            className="h-2 flex-1 bg-orange-500 rounded-full"
                            style={{ 
                              opacity: 0.5 + ((i + 1) / 7) * 0.5 
                            }}
                          />
                        ))}
                        {habit.current_streak > 7 && (
                          <div className="text-xs text-muted-foreground ml-1">+{habit.current_streak - 7}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show "tied" message if more than one habit */}
                  {habitsWithLongestStreak.length > 1 && (
                    <p className="text-xs text-muted-foreground italic">
                      {habitsWithLongestStreak.length} habits tied for longest streak
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground flex items-center justify-center py-6">
                  <div className="text-center">
                    <Flame className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p>No active streaks</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {categoryData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-500" />
                Category Performance
              </CardTitle>
              <CardDescription>See how well you're doing across different habit categories</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid gap-3">
                {categoryData.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" 
                          style={{ 
                            backgroundColor: getCategoryColor(category.name, category.value) 
                          }} 
                        />
                        <div className="font-medium">{category.name}</div>
                      </div>
                      <div className="text-sm font-medium">{category.value}%</div>
                    </div>
                    <Progress 
                      value={category.value} 
                      className="h-2"
                      style={{ 
                        backgroundColor: 'var(--background-muted)',
                        '--progress-background': getCategoryColor(category.name, category.value)
                      } as any}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/10 to-transparent">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              Weekly Habit Patterns
            </CardTitle>
            <CardDescription>See which days you're most consistent</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-6">
              {habits.filter(h => h.completions > 0).map(habit => (
                <div key={habit.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{habit.name}</h4>
                    <Badge variant="outline">{habit.completions} completions</Badge>
                  </div>
                  <div className="flex justify-between">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                      // Calculate how many completions happened on this day of week
                      const dayCompletions = logs.filter(log => 
                        log.habit_id === habit.id && 
                        log.status === 'completed' &&
                        new Date(log.completion_date).getDay() === index
                      ).length;
                      
                      // Calculate strength of color based on completions (max 3 for full color)
                      const strength = Math.min(dayCompletions, 3) / 3;
                      
                      return (
                        <div key={day} className="flex flex-col items-center">
                          <div className="text-xs text-muted-foreground mb-1">{day}</div>
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              dayCompletions > 0 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted/20'
                            }`}
                            style={{
                              opacity: dayCompletions > 0 ? 0.3 + (strength * 0.7) : 0.2
                            }}
                          >
                            {dayCompletions > 0 && dayCompletions}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {habits.filter(h => h.completions > 0).length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  Complete habits to see your patterns
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <HabitCalendarHeatmap 
          logs={logs}
          title="Progress Visualization"
          description="View your habit progress over time"
        />
      </CardContent>
    </Card>
  )
}

// Helper function to get dynamic colors for categories
function getCategoryColor(categoryName: string, value: number): string {
  // Base the color on the completion rate
  if (value >= 80) return 'var(--success)'
  if (value >= 50) return 'var(--primary)'
  if (value >= 30) return 'var(--warning)'
  return 'var(--destructive)'
} 