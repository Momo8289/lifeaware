"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award, Star, Medal, Target, Zap, Clock, Calendar, Flame, CheckCircle2, Crown, Sparkles, Rocket, BarChart3, BookOpen } from "lucide-react"

import {concatClasses} from "@/utils/helpers";

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
  total_days?: number
  category?: string | null
  is_active: boolean
}

interface HabitGamificationProps {
  habits: Habit[]
  logs: HabitLog[]
}

export function HabitGamification({ habits, logs }: HabitGamificationProps) {
  // Filter to only include active habits for gamification
  const activeHabits = habits.filter(habit => habit.is_active)
  
  // Filter logs to only include logs from active habits
  const activeHabitIds = new Set(activeHabits.map(habit => habit.id))
  const activeLogs = logs.filter(log => activeHabitIds.has(log.habit_id))
  
  // Calculate points based on completions
  const completionPoints = activeLogs.length * 10
  
  // Calculate streak points (extra points for maintaining streaks)
  const streakPoints = activeHabits.reduce((total, habit) => {
    return total + (habit.current_streak * 5)
  }, 0)
  
  // Calculate category diversity bonus (extra points for having habits in different categories)
  const uniqueCategories = new Set(activeHabits.map(h => h.category || 'Uncategorized')).size
  const categoryDiversityPoints = uniqueCategories * 15
  
  // Calculate consistency bonus (extra points for habits with high completion rates)
  const consistencyBonus = activeHabits.reduce((total, habit) => {
    const completionRate = habit.total_days && habit.total_days > 0 
      ? (habit.completions / habit.total_days) * 100 
      : 0
    
    // Bonus points for habits with >80% completion rate
    return total + (completionRate >= 80 ? 20 : 0)
  }, 0)
  
  // Total points
  const totalPoints = completionPoints + streakPoints + categoryDiversityPoints + consistencyBonus
  
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
    
    threeCategories: 3, // Habits in 3 different categories
    fiveCategories: 5, // Habits in 5 different categories
    
    perfectWeek: 7, // 7 consecutive days with at least one completion
  }
  
  // Find the longest streak
  const longestStreak = activeHabits.reduce((max, habit) => 
    Math.max(max, habit.current_streak), 0)
  
  // Check for a perfect week (at least one completion every day for the past 7 days)
  const lastWeekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
  
  const perfectWeek = lastWeekDates.every(date => 
    activeLogs.some(log => log.completion_date.split('T')[0] === date)
  )
  
  // Get counts for different milestones
  const habitsWithLongStreaks = activeHabits.filter(h => h.current_streak >= 7).length
  const totalCompletionsThisMonth = activeLogs.filter(log => {
    const logDate = new Date(log.completion_date)
    const now = new Date()
    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()
  }).length
  
  // Calculate earned badges
  const badges = [
    {
      name: "First Log",
      description: "Logged your first habit",
      icon: <Clock className="h-4 w-4" />,
      earned: activeLogs.length >= badgeThresholds.firstLog,
      progress: Math.min(activeLogs.length / badgeThresholds.firstLog, 1) * 100,
      color: "primary"
    },
    {
      name: "Habit Collector",
      description: "Created 3 habits",
      icon: <Star className="h-4 w-4" />,
      earned: activeHabits.length >= badgeThresholds.threeHabits,
      progress: Math.min(activeHabits.length / badgeThresholds.threeHabits, 1) * 100,
      color: "warning"
    },
    {
      name: "Triple Streak",
      description: "Maintained a 3-day streak",
      icon: <Zap className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.threeStreak,
      progress: Math.min(longestStreak / badgeThresholds.threeStreak, 1) * 100,
      color: "orange"
    },
    {
      name: "Week Warrior",
      description: "Maintained a 7-day streak",
      icon: <Target className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.sevenStreak,
      progress: Math.min(longestStreak / badgeThresholds.sevenStreak, 1) * 100,
      color: "green"
    },
    {
      name: "10 Log Milestone",
      description: "Completed 10 habit logs",
      icon: <Calendar className="h-4 w-4" />,
      earned: activeLogs.length >= badgeThresholds.tenLogs,
      progress: Math.min(activeLogs.length / badgeThresholds.tenLogs, 1) * 100,
      color: "violet"
    },
    {
      name: "Habit Master",
      description: "Created 5 habits",
      icon: <Medal className="h-4 w-4" />,
      earned: activeHabits.length >= badgeThresholds.fiveHabits,
      progress: Math.min(activeHabits.length / badgeThresholds.fiveHabits, 1) * 100,
      color: "yellow"
    },
    {
      name: "Monthly Mastery",
      description: "Maintained a 30-day streak",
      icon: <Trophy className="h-4 w-4" />,
      earned: longestStreak >= badgeThresholds.thirtyStreak,
      progress: Math.min(longestStreak / badgeThresholds.thirtyStreak, 1) * 100,
      color: "amber"
    },
    {
      name: "50 Log Champion",
      description: "Completed 50 habit logs",
      icon: <Award className="h-4 w-4" />,
      earned: activeLogs.length >= badgeThresholds.fiftyLogs,
      progress: Math.min(activeLogs.length / badgeThresholds.fiftyLogs, 1) * 100,
      color: "blue"
    },
    {
      name: "Perfect Week",
      description: "Complete at least one habit every day for a week",
      icon: <CheckCircle2 className="h-4 w-4" />,
      earned: perfectWeek,
      progress: perfectWeek ? 100 : lastWeekDates.filter(date => 
        activeLogs.some(log => log.completion_date.split('T')[0] === date)
      ).length / 7 * 100,
      color: "emerald"
    },
    {
      name: "Streak Master",
      description: "Have 3+ habits with active streaks of 7+ days",
      icon: <Flame className="h-4 w-4" />,
      earned: habitsWithLongStreaks >= 3,
      progress: Math.min(habitsWithLongStreaks / 3, 1) * 100,
      color: "red"
    },
    {
      name: "Diversifier",
      description: "Create habits in 3+ different categories",
      icon: <BarChart3 className="h-4 w-4" />,
      earned: uniqueCategories >= badgeThresholds.threeCategories,
      progress: Math.min(uniqueCategories / badgeThresholds.threeCategories, 1) * 100,
      color: "accent"
    },
    {
      name: "Centurion",
      description: "Complete 100 habit logs",
      icon: <Crown className="h-4 w-4" />,
      earned: activeLogs.length >= badgeThresholds.hundredLogs,
      progress: Math.min(activeLogs.length / badgeThresholds.hundredLogs, 1) * 100,
      color: "purple"
    }
  ]
  
  // Count earned badges
  const earnedBadges = badges.filter(badge => badge.earned).length
  
  // Next level progress
  const levels = [100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]
  const currentLevel = levels.findIndex(threshold => totalPoints < threshold) + 1
  const currentLevelPoints = currentLevel > 1 ? levels[currentLevel - 2] : 0
  const nextLevelPoints = levels[currentLevel - 1]
  const levelProgress = ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
  
  // Get color based on level
  const getLevelColor = (level: number) => {
    if (level >= 8) return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
    if (level >= 6) return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
    if (level >= 4) return "bg-gradient-to-r from-green-500 to-teal-500 text-white"
    if (level >= 2) return "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
    return "bg-gradient-to-r from-gray-500 to-slate-500 text-white"
  }
  
  // Get badge background color
  const getBadgeColor = (color: string, earned: boolean) => {
    // All badges should use consistent shadcn theme variables
    return earned ? "bg-card" : "bg-muted/30" 
  }
  
  // Get icon color
  const getIconColor = (color: string, earned: boolean) => {
    if (!earned) return "text-muted-foreground"
    
    // Use the consistent shadcn theme variables
    switch (color) {
      case "primary": return "text-primary"
      case "warning": return "text-warning"
      case "success": return "text-success"
      case "destructive": return "text-destructive"
      case "accent": return "text-accent"
      default: return "text-primary"
    }
  }
  
  // Get progress bar color
  const getProgressBarColor = (color: string) => {
    // Always use primary for progress bar
    return "bg-primary"
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Rewards & Progress</CardTitle>
        <CardDescription>Earn points and badges by building your habits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="overflow-hidden border-2">
            <CardHeader className="p-3 pb-1 bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Total Points
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-muted-foreground mt-1">
                From completions, streaks, and bonuses
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-2">
            <CardHeader className={`p-3 pb-1 ${getLevelColor(currentLevel)}`}>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Level {currentLevel}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex justify-between text-xs mb-1">
                <span>{currentLevelPoints}</span>
                <span>{nextLevelPoints}</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {nextLevelPoints - totalPoints} points to Level {currentLevel + 1}
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-2">
            <CardHeader className="p-3 pb-1 bg-gradient-to-r from-green-500/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Medal className="h-4 w-4 text-green-500" />
                Badges Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{earnedBadges} / {badges.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {badges.length - earnedBadges} more badges to collect
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-2">
            <CardHeader className="p-3 pb-1 bg-gradient-to-r from-amber-500/10 to-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-2xl font-bold">{totalCompletionsThisMonth}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Habit completions this month
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Badges & Achievements</h3>
            <Badge variant="outline" className="bg-primary/5">
              {earnedBadges} Earned
            </Badge>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge, index) => (
              <Card 
                key={index} 
                className={`border ${badge.earned ? "border-success/30 bg-success/5" : ""}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        badge.earned 
                          ? "bg-success/20 text-success" 
                          : "bg-muted text-muted-foreground"
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
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{Math.round(badge.progress)}%</span>
                          </div>
                          <div 
                            aria-valuemax={100} 
                            aria-valuemin={0} 
                            role="progressbar" 
                            data-state="indeterminate" 
                            data-max="100" 
                            className="relative w-full overflow-hidden rounded-full bg-muted h-1"
                          >
                            <div 
                              data-state="indeterminate" 
                              data-max="100" 
                              className="h-full w-full flex-1 bg-primary transition-all" 
                              style={{ transform: `translateX(-${100 - badge.progress}%)` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-5 w-5 text-purple-500" />
              Points Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex justify-between text-sm">
                <span className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Habit Completions
                </span>
                <span className="font-medium">{completionPoints} points</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="flex items-center">
                  <Flame className="h-4 w-4 mr-2 text-orange-500" />
                  Active Streaks
                </span>
                <span className="font-medium">{streakPoints} points</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-blue-500" />
                  Category Diversity
                </span>
                <span className="font-medium">{categoryDiversityPoints} points</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-amber-500" />
                  Consistency Bonus
                </span>
                <span className="font-medium">{consistencyBonus} points</span>
              </li>
              <li className="flex justify-between text-sm pt-2 border-t">
                <span className="flex items-center font-medium">
                  <Trophy className="h-4 w-4 mr-2 text-primary" />
                  Total
                </span>
                <span className="font-bold">{totalPoints} points</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
} 