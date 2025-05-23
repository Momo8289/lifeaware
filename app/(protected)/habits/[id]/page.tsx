'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  Flame, 
  LineChart, 
  Settings, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isYesterday, parseISO, subYears, addMonths, startOfToday } from 'date-fns';
import * as React from 'react';
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HabitProgressChart } from '@/components/habits/HabitProgressChart';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Progress } from '@/components/ui/progress';
import { useUserTimezone } from '@/lib/hooks/useUserTimezone';
import { getTodayInTimezone, formatDateInTimezone } from '@/lib/utils/timezone';

// Custom styles for the heatmap grid
const styles = `
  .grid-cols-52 {
    grid-template-columns: repeat(52, minmax(0, 1fr));
  }
  
  .heatmap-cell {
    width: 12px;
    height: 12px;
  }
  
  .day-label-grid {
    display: grid;
    grid-template-rows: repeat(7, 12px);
    grid-gap: 4px;
    align-items: center;
  }
  
  .grid-rows-7 {
    grid-template-rows: repeat(7, 12px);
    grid-gap: 4px;
  }
`;

interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  frequency: 'daily' | 'weekly' | 'custom';
  frequency_days: number[];
  time_of_day: string | null;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  completion_date: string;
  status: 'completed';
  notes: string | null;
  created_at: string;
}

interface HabitStats {
  current_streak: number;
  longest_streak: number;
  completion_rate: number;
  total_completions: number;
  total_days: number;
}

// Define the tooltip data attributes type
type TooltipDataAttrs = {
  [key: string]: string;
};

export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [id, setId] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<{ [key: string]: string }>({});
  const { timezone, isLoading: timezoneLoading } = useUserTimezone();

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (id && !timezoneLoading) {
      fetchHabitData();
    }
  }, [id, timezone, timezoneLoading]);

  const fetchHabitData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Silent error handling for production
        setHabit(null);
        setIsLoading(false);
        return;
      }

      // Fetch habit data
      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .single();

      if (habitError) throw habitError;
      setHabit(habitData);

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', id)
        .order('completion_date', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Create marked dates object for calendar view
      const marked: { [key: string]: string } = {};
      logsData?.forEach((log: HabitLog) => {
        // Convert to user's timezone for display
        const dateInTimezone = formatDateInTimezone(log.completion_date, timezone);
        marked[dateInTimezone] = log.status;
      });
      setMarkedDates(marked);

      // Fetch stats using timezone-aware API
      try {
        const response = await fetch(`/api/habits/stats?habit_id=${id}&timezone=${encodeURIComponent(timezone)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          const habitStats = result.habits.find((h: any) => h.habit_id === id);
          if (habitStats) {
            setStats({
              current_streak: habitStats.current_streak,
              longest_streak: habitStats.longest_streak,
              completion_rate: habitStats.completion_rate,
              total_completions: habitStats.total_completions,
              total_days: habitStats.total_days
            });
          }
        }
      } catch (error) {
        // Silent error handling
      }

    } catch (error: any) {
      // Silent error handling for production
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to update the breadcrumb title whenever habit changes
  useEffect(() => {
    if (habit && habit.name) {
      sessionStorage.setItem(`breadcrumb_${id}`, habit.name);
    }
  }, [habit, id]);

  const checkInHabit = async (status: 'completed') => {
    // Prevent multiple concurrent calls
    if (isCheckingIn) {
      return;
    }
    
    try {
      setIsCheckingIn(true);
      const today = getTodayInTimezone(timezone);
      
      // Check if already logged for today (using timezone-aware date)
      const existingLog = logs.find(log => {
        const logDateInTimezone = formatDateInTimezone(log.completion_date, timezone);
        return logDateInTimezone === today;
      });
      
      // Check if toggling the same status
      const isToggleOff = existingLog?.status === status;
      
      let result;
      
      if (existingLog && isToggleOff) {
        // Delete the log if toggling off
        result = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', existingLog.id);
          
        if (result.error) throw result.error;
        
        // Remove from UI after successful DB operation
        setLogs(logs.filter(log => log.id !== existingLog.id));
        
        // Remove from marked dates
        const newMarkedDates = { ...markedDates };
        delete newMarkedDates[today];
        setMarkedDates(newMarkedDates);
        
        toast({
          title: "Status cleared",
          description: `Habit status has been reset`
        });
      } else if (existingLog) {
        // Update existing log
        result = await supabase
          .from('habit_logs')
          .update({ status })
          .eq('id', existingLog.id);
          
        if (result.error) throw result.error;
        
        // Update UI after successful DB operation
        setLogs(logs.map(log => log.id === existingLog.id ? { ...log, status } : log));
        
        // Update marked dates
        setMarkedDates({
          ...markedDates,
          [today]: status
        });
        
        toast({
          title: "Success",
          description: `Habit marked as ${status} for today`
        });
      } else {
        // Insert new log
        result = await supabase
          .from('habit_logs')
          .insert({
            habit_id: id,
            completion_date: today,
            status
          });
          
        if (result.error) throw result.error;
        
        // Fetch the newly created log to get its proper UUID
        const { data: newLogData, error: fetchError } = await supabase
          .from('habit_logs')
          .select('*')
          .eq('habit_id', id)
          .eq('completion_date', today)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Update UI with the actual database record
        if (newLogData) {
          setLogs([newLogData, ...logs]);
          
          // Update marked dates
          setMarkedDates({
            ...markedDates,
            [today]: status
          });
          
          toast({
            title: "Success",
            description: `Habit marked as ${status} for today`
          });
        }
      }
      
    } catch (error: any) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: error.message || "Failed to update habit status",
        variant: "destructive"
      });
    } finally {
      // Add a small delay before releasing the lock to prevent rapid clicks
      setTimeout(() => {
        setIsCheckingIn(false);
      }, 500);
    }
  };

  if (isLoading) {
    return <div className="container py-6">Loading habit data...</div>;
  }

  if (!habit) {
    return (
      <div className="container py-6">
        <p>Habit not found</p>
        <Button asChild>
          <Link href="/habits">Back to Habits</Link>
        </Button>
      </div>
    );
  }

  const frequencyText = () => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') return 'Weekly';
    if (habit.frequency === 'custom') {
      const days = habit.frequency_days.map(day => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[day];
      });
      return days.join(', ');
    }
    return '';
  };

  const todayLog = logs.find(log => {
    const today = getTodayInTimezone(timezone);
    const logDateInTimezone = formatDateInTimezone(log.completion_date, timezone);
    return logDateInTimezone === today;
  });

  const formatLogDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <div className="container py-6 space-y-6">
      <style jsx>{styles}</style>
      <div className="flex items-center mb-8">
        <Link href="/habits" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{habit.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-4">
                <Flame className="h-5 w-5 text-orange-500 mr-1" />
                <span className="font-medium">{stats?.current_streak || 0} day streak</span>
              </div>
              <Link href={`/habits/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {habit.category && (
              <Badge variant="outline">{habit.category}</Badge>
            )}
            <Badge variant="secondary">{frequencyText()}</Badge>
            {habit.time_of_day && (
              <Badge variant="outline">{habit.time_of_day}</Badge>
            )}
            <Badge variant={habit.is_active ? "default" : "destructive"}>
              {habit.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {habit.description && (
            <p className="text-muted-foreground mt-2">{habit.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Started on {format(parseISO(habit.start_date), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Stats and History */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard 
              title="Current Streak" 
              value={stats?.current_streak.toString() || "0"} 
              icon={<Flame className="h-4 w-4 text-orange-500" />} 
            />
            <StatCard 
              title="Longest Streak" 
              value={stats?.longest_streak.toString() || "0"} 
              icon={<Flame className="h-4 w-4 text-red-500" />} 
            />
            <StatCard 
              title="Completion Rate" 
              value={`${Math.round(stats?.completion_rate || 0)}%`} 
              icon={<LineChart className="h-4 w-4 text-blue-500" />} 
            />
            <StatCard 
              title="Total Completions" 
              value={stats?.total_completions.toString() || "0"} 
              icon={<Check className="h-4 w-4 text-green-500" />} 
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Progress Visualization</CardTitle>
              <CardDescription>View your habit progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current month completion rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Current Month</h4>
                    <span className="text-sm text-muted-foreground">{Math.round(stats?.completion_rate || 0)}%</span>
                  </div>
                  <Progress value={stats?.completion_rate || 0} className="h-2" />
                </div>

                {/* Calendar heatmap with shadcn styling */}
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-4">Year Activity</h4>
                  
                  {/* Container with relative positioning for month labels */}
                  <div className="relative">
                    <div className="flex text-xs text-muted-foreground h-5 mb-1 overflow-hidden">
                      {/* Month labels - Jan to Dec */}
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => {
                        // Create a date for the first of each month of the current year
                        const date = new Date(new Date().getFullYear(), month, 1);
                        
                        // Calculate position based on month (0-11)
                        // Each month gets approximately 4.33 weeks (52/12)
                        const weekPosition = Math.floor(month * (52 / 12));
                        
                        // Center the label by adding half a month's width
                        const centeredPosition = weekPosition + Math.floor((52 / 12) / 2);
                        
                        // Convert to percentage
                        const leftPosition = `${(centeredPosition / 52) * 100}%`;
                        
                        return (
                          <div 
                            key={month} 
                            className="absolute font-medium" 
                            style={{ left: leftPosition }}
                          >
                            {format(date, 'MMM')}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="grid grid-cols-52 gap-1">
                      {Array.from({ length: 52 }).map((_, weekIndex) => {
                        // For January to December display of current year in user's timezone
                        const currentYear = new Date().getFullYear();
                        const startOfYear = new Date(currentYear, 0, 1);
                        
                        // Adjust start date to previous Sunday
                        const dayOfWeek = startOfYear.getDay();
                        const adjustedStart = new Date(startOfYear);
                        if (dayOfWeek !== 0) {
                          adjustedStart.setDate(adjustedStart.getDate() - dayOfWeek);
                        }
                        
                        // Calculate the start date for this week column
                        const weekStart = new Date(adjustedStart);
                        weekStart.setDate(adjustedStart.getDate() + (weekIndex * 7));
                        
                        return (
                          <div key={weekIndex} className="grid grid-rows-7">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                              // Calculate the date for this cell
                              const date = new Date(weekStart);
                              date.setDate(weekStart.getDate() + dayIndex);
                              const dateStr = formatDateInTimezone(date.toISOString(), timezone);
                              
                              // Check if this date has a log (using timezone-aware comparison)
                              const hasLog = Object.keys(markedDates).includes(dateStr);
                              
                              // Check if this date is in the future (in user's timezone)
                              const today = new Date();
                              const todayStr = formatDateInTimezone(today.toISOString(), timezone);
                              const isFuture = dateStr > todayStr;
                              
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
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
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
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Your habit check-in history</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No check-ins yet</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          log.status === 'completed' 
                            ? 'bg-success' 
                            : ''
                        }`}></div>
                        <span className="font-medium">{formatLogDate(log.completion_date)}</span>
                      </div>
                      <Badge variant={
                        log.status === 'completed' 
                          ? 'default' 
                          : 'warning'
                      }>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2.5 bg-primary/10 border rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 