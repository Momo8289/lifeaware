"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award, Star, Medal, Target, Zap, Clock, Calendar } from "lucide-react"

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
  current_streak: number
  completions: number
}

interface HabitGamificationProps {
  habits: Habit[]
  logs: HabitLog[]
}

export function HabitGamification({ habits, logs }: HabitGamificationProps) {
  // Calculate points based on completions
  const completionPoints = logs.length * 10
  
  // Calculate streak points (extra points for maintaining streaks)
  const streakPoints = habits.reduce((total, habit) => {
    return total + (habit.current_streak * 5)
  }, 0)
  
  // Total points
  const totalPoints = completionPoints + streakPoints
  
  // Calculate badge progress
  const badgeThresholds = {
    firstLog: 1, // First log
    tenLogs: 10, // 10 total logs
    fiftyLogs: 50, // 50 total logs
    hundredLogs: 100, // 100 total logs
    
    threeStreak: 3, // 3-day streak
    sevenStreak: 7, // 7-day streak
    thirtyStreak: 30, // 30-day streak
    ninetyStreak: 90, // 90-day streak
    
    threeHabits: 3, // Create 3 habits
    fiveHabits: 5, // Create 5 habits
    tenHabits: 10, // Create 10 habits
  }
  
  // Find the longest streak
  const longestStreak = habits.reduce((max, habit) => 
    Math.max(max, habit.current_streak), 0)
  
  // Calculate earned badges
  const badges = [
    {
      name: "First Log",
      description: "Logged your first habit",
      icon: <Clock className="h-4 w-4" />,
      earned: logs.length >= badgeThresholds.firstLog,
      progress: Math.min(logs.length / badgeThresholds.firstLog, 1) * 100
    },
    {
      name: "Habit Collector",
      description: "Created 3 habits",
      icon: <Star className="h-4 w-4" />,
      earned: habits.length >= badgeThresholds.threeHabits,
      progress: Math.min(habits.length / badgeThresholds.threeHabits, 1) * 100
    },
    {
      name: "Triple Streak",
      description: "Maintained a 3-day streak",
      icon: <Zap className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.threeStreak,
      progress: Math.min(longestStreak / badgeThresholds.threeStreak, 1) * 100
    },
    {
      name: "Week Warrior",
      description: "Maintained a 7-day streak",
      icon: <Target className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.sevenStreak,
      progress: Math.min(longestStreak / badgeThresholds.sevenStreak, 1) * 100
    },
    {
      name: "10 Log Milestone",
      description: "Completed 10 habit logs",
      icon: <Calendar className="h-4 w-4" />,
      earned: logs.length >= badgeThresholds.tenLogs,
      progress: Math.min(logs.length / badgeThresholds.tenLogs, 1) * 100
    },
    {
      name: "Habit Master",
      description: "Created 5 habits",
      icon: <Medal className="h-4 w-4" />,
      earned: habits.length >= badgeThresholds.fiveHabits,
      progress: Math.min(habits.length / badgeThresholds.fiveHabits, 1) * 100
    },
    {
      name: "Monthly Mastery",
      description: "Maintained a 30-day streak",
      icon: <Trophy className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.thirtyStreak,
      progress: Math.min(longestStreak / badgeThresholds.thirtyStreak, 1) * 100
    },
    {
      name: "50 Log Champion",
      description: "Completed 50 habit logs",
      icon: <Award className="h-4 w-4" />,
      earned: logs.length >= badgeThresholds.fiftyLogs,
      progress: Math.min(logs.length / badgeThresholds.fiftyLogs, 1) * 100
    }
  ]
  
  // Count earned badges
  const earnedBadges = badges.filter(badge => badge.earned).length
  
  // Next level progress
  const levels = [100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]
  const currentLevel = levels.findIndex(threshold => totalPoints < threshold)
  const currentLevelPoints = currentLevel > 0 ? levels[currentLevel - 1] : 0
  const nextLevelPoints = levels[currentLevel]
  const levelProgress = ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Rewards & Progress</CardTitle>
        <CardDescription>Earn points and badges by building your habits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-none">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{totalPoints}</div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-none">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-medium">Level</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{currentLevel}</div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-none">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{earnedBadges} / {badges.length}</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div>Level {currentLevel}</div>
            <div>{totalPoints} / {nextLevelPoints} points to Level {currentLevel + 1}</div>
          </div>
          <Progress value={levelProgress} className="h-3" />
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Badges</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge, index) => (
              <Card 
                key={index} 
                className={`border ${badge.earned ? 'bg-primary/10 border-primary/20' : 'bg-muted/30'}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        badge.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {badge.icon}
                    </div>
                    <div className="grid gap-1">
                      <div className="font-semibold leading-none tracking-tight">
                        {badge.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {badge.description}
                      </div>
                      {!badge.earned && (
                        <Progress value={badge.progress} className="h-1 mt-1" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 