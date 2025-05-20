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
import { format, isToday, isYesterday, parseISO, subYears, addMonths } from 'date-fns';
import * as React from 'react';
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HabitProgressChart } from '@/components/habits/HabitProgressChart';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

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
  status: 'completed' | 'missed' | 'skipped';
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
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, 'completed' | 'missed' | 'skipped'>>({});

  useEffect(() => {
    const fetchHabitData = async () => {
      try {
        setIsLoading(true);
        
        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('User not authenticated');
          setHabit(null);
          setIsLoading(false);
          return;
        }
        
        // Fetch habit details
        const { data: habitData, error: habitError } = await supabase
          .from('habits')
          .select('*')
          .eq('id', id)
          .single();

        if (habitError) throw habitError;
        setHabit(habitData);
        
        // Store the habit name for breadcrumb
        if (habitData && habitData.name) {
          // Update the localStorage or sessionStorage with id -> name mapping
          const pathname = window.location.pathname;
          const currentSegment = pathname.split('/').pop();
          if (currentSegment === id) {
            sessionStorage.setItem(`breadcrumb_${id}`, habitData.name);
          }
        }

        // Fetch habit logs
        const { data: logsData, error: logsError } = await supabase
          .from('habit_logs')
          .select('*')
          .eq('habit_id', id)
          .order('completion_date', { ascending: false });

        if (logsError) throw logsError;
        setLogs(logsData || []);

        // Create marked dates for calendar
        const dates: Record<string, 'completed' | 'missed' | 'skipped'> = {};
        logsData?.forEach((log: HabitLog) => {
          // Format dates consistently as YYYY-MM-DD
          const dateStr = log.completion_date.split('T')[0];
          dates[dateStr] = log.status;
        });
        setMarkedDates(dates);
        
        // Fetch stats
        const { data: statsData } = await supabase
          .rpc('get_habit_streak', { habit_uuid: id });
          
        const currentStreak = statsData || 0;
        
        // Calculate other stats manually
        const completed = logsData?.filter(log => log.status === 'completed').length || 0;
        const totalDays = logsData?.length || 0;
        const completionRate = totalDays > 0 ? (completed / totalDays) * 100 : 0;
        
        // For simplicity, we'll use current_streak as longest_streak for now
        // In a real app, you would calculate this properly
        setStats({
          current_streak: currentStreak,
          longest_streak: currentStreak, // This should be calculated properly
          completion_rate: completionRate,
          total_completions: completed,
          total_days: totalDays
        });
      } catch (error) {
        console.error('Error fetching habit data:', error);
        toast({
          title: "Error",
          description: "Failed to load habit data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabitData();
  }, [id]);

  const checkInHabit = async (status: 'completed' | 'missed' | 'skipped') => {
    // Prevent multiple concurrent calls
    if (isCheckingIn) {
      return;
    }
    
    try {
      setIsCheckingIn(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already logged for today
      const existingLog = logs.find(log => log.completion_date.split('T')[0] === today);
      
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
      console.error('Error checking in habit:', error);
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
    return log.completion_date.split('T')[0] === new Date().toISOString().split('T')[0];
  });

  const formatLogDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center mb-8">
        <Link href="/habits" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{habit.name}</h1>
            <Link href={`/habits/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
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
        </div>
      </div>

      {/* Check-in section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Today's Progress</CardTitle>
          <CardDescription>Check in your habit for today</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Started on {format(parseISO(habit.start_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Current streak: {stats?.current_streak || 0} days</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              className="flex-1" 
              variant={todayLog?.status === 'completed' ? "secondary" : "outline"}
              onClick={() => checkInHabit('completed')}
              disabled={isCheckingIn}
            >
              <Check className="h-4 w-4 mr-2" />
              Completed
            </Button>
            <Button 
              className="flex-1" 
              variant={todayLog?.status === 'missed' ? "secondary" : "outline"}
              onClick={() => checkInHabit('missed')}
              disabled={isCheckingIn}
            >
              <X className="h-4 w-4 mr-2" />
              Missed
            </Button>
            <Button 
              className="flex-1" 
              variant={todayLog?.status === 'skipped' ? "secondary" : "outline"}
              onClick={() => checkInHabit('skipped')}
              disabled={isCheckingIn}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats and History */}
      <Tabs defaultValue="stats" className="w-full mt-8">
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
                <CalendarHeatmap
                  startDate={subYears(new Date(), 1)}
                  endDate={new Date()}
                  values={logs.map(log => ({
                    date: log.completion_date.split('T')[0],
                    count: log.status === 'completed' ? 1 : 0,
                    status: log.status
                  }))}
                  classForValue={(value) => {
                    if (!value || value.count === 0) {
                      return value && value.status === 'skipped' 
                        ? 'color-scale-skip' 
                        : value && value.status === 'missed'
                          ? 'color-scale-miss'
                          : 'color-empty';
                    }
                    return 'color-scale-complete';
                  }}
                  tooltipDataAttrs={(value) => {
                    if (!value || !value.date) return {} as TooltipDataAttrs;
                    return {
                      'data-tip': `${value.date}: ${value.status || 'No data'}`,
                    } as TooltipDataAttrs;
                  }}
                />
                
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-destructive rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Missed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--warning))" }}></div>
                    <span className="text-xs text-muted-foreground">Skipped</span>
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
                            : log.status === 'missed' 
                              ? 'bg-destructive' 
                              : ''
                        }`} style={log.status === 'skipped' ? { backgroundColor: "hsl(var(--warning))" } : undefined}></div>
                        <span className="font-medium">{formatLogDate(log.completion_date)}</span>
                      </div>
                      <Badge variant={
                        log.status === 'completed' 
                          ? 'default' 
                          : log.status === 'missed' 
                            ? 'destructive' 
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
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className="p-2 bg-background border rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 