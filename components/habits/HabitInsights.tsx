"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, PieChart } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HabitProgressChart } from "./HabitProgressChart"
import { Badge } from "@/components/ui/badge"
import { HabitCalendarHeatmap } from "./HabitCalendarHeatmap"

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
      : 0
    
    return {
      ...habit,
      completionRate
    }
  })
  
  // Sort habits by completion rate, streak, then total completions
  const sortedHabits = [...habitsWithStats].sort((a, b) => {
    if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
    if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak
    return b.completions - a.completions
  })
  
  const mostConsistentHabit = sortedHabits.length > 0 ? sortedHabits[0] : null
  const leastConsistentHabit = sortedHabits.length > 0 ? sortedHabits[sortedHabits.length - 1] : null
  
  // Calculate habit with longest streak
  const habitWithLongestStreak = [...habitsWithStats].sort((a, b) => b.current_streak - a.current_streak)[0]
  
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
    
    if (mostConsistentHabit && mostConsistentHabit.current_streak > 3) {
      suggestions.push(`Great job maintaining your streak with "${mostConsistentHabit.name}"! Keep it up!`)
    }
    
    // Add a general suggestion if we don't have specific ones
    if (suggestions.length === 0 && habits.length > 0) {
      suggestions.push("Focus on completing one habit consistently before adding more to your routine.")
    }
    
    return suggestions
  }
  
  const suggestions = generateSuggestions()
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Habit Insights</CardTitle>
        <CardDescription>
          Analytics and suggestions to improve your habits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Most Consistent Habit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mostConsistentHabit ? (
                    <div className="space-y-2">
                      <div className="text-xl font-bold">{mostConsistentHabit.name}</div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {Math.round(mostConsistentHabit.completionRate)}% completion rate
                        </Badge>
                        <Badge variant="outline">
                          {mostConsistentHabit.current_streak} day streak
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No habits tracked yet</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Longest Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {habitWithLongestStreak && habitWithLongestStreak.current_streak > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xl font-bold">{habitWithLongestStreak.name}</div>
                      <Badge variant="secondary">
                        {habitWithLongestStreak.current_streak} day streak
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No active streaks</div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {categoryData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Category Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {categoryData.map((category) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-40 truncate font-medium">{category.name}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-32 bg-secondary rounded-full h-2 mr-2 overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full" 
                              style={{ width: `${category.value}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium w-12 text-right">{category.value}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="trends" className="pt-4 space-y-6">
            <HabitProgressChart 
              logs={logs} 
              habits={habits}
              showIndividualHabits={true}
              type="bar" 
              title="Completion History" 
              description="Your habit completion by habit over time"
            />
            
            <HabitCalendarHeatmap 
              logs={logs}
              title="Progress Visualization"
              description="View your habit progress over time"
            />
          </TabsContent>
          
          <TabsContent value="suggestions" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
                <CardDescription>Personalized suggestions to improve your habits</CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.length > 0 ? (
                  <ul className="space-y-2">
                    {suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start">
                        <div className="bg-primary rounded-full w-6 h-6 flex items-center justify-center text-white mr-2 mt-0.5 flex-shrink-0">
                          {i + 1}
                        </div>
                        <p>{suggestion}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Start tracking more habits to get personalized suggestions.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 