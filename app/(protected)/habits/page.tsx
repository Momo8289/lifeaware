'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, CheckCircle2, Flame, Calendar, LineChart, Settings, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitInsights } from '@/components/habits/HabitInsights';
import { HabitGamification } from '@/components/habits/HabitGamification';
import { createBrowserClient } from '@supabase/ssr';
import { useUserTimezone } from '@/lib/hooks/useUserTimezone';
import { getTodayInTimezone } from '@/lib/utils/timezone';
import { useReminders } from '@/components/providers/ReminderProvider';

// Types
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

interface HabitWithStats extends Habit {
  current_streak: number;
  completions: number;
  total_days: number;
  todayStatus?: 'completed' | 'pending';
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('habits');
  const [habitListTab, setHabitListTab] = useState('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { timezone, isLoading: timezoneLoading } = useUserTimezone();
  const { reminders, checkReminders } = useReminders();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchHabits = async () => {
    if (timezoneLoading) return; // Wait for timezone to load
    
    try {
      setIsLoading(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Silent error handling for production
        setHabits([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch habits - with RLS, this will only return the user's habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;

      if (!habitsData) {
        setHabits([]);
        return;
      }

      // Fetch all logs for stats calculation
      const { data: allLogsData, error: allLogsError } = await supabase
        .from('habit_logs')
        .select('*')
        .order('completion_date', { ascending: false });

      if (allLogsError) throw allLogsError;
      
      setLogs(allLogsData || []);

      // Fetch today's logs to determine habit status (using user's timezone)
      const today = getTodayInTimezone(timezone);
      const { data: todayLogsData, error: todayLogsError } = await supabase
        .from('habit_logs')
        .select('habit_id, status')
        .eq('completion_date', today);

      if (todayLogsError) throw todayLogsError;

      // Process habits with stats
      const habitsWithStats: HabitWithStats[] = await Promise.all(
        habitsData.map(async (habit: Habit) => {
          const habitLogs = allLogsData?.filter((log: HabitLog) => log.habit_id === habit.id) || [];
          const todayLog = todayLogsData?.find((log: any) => log.habit_id === habit.id);
          
          // Get streak info using timezone-aware API route
          let streakData = 0;
          try {
            const response = await fetch('/api/habits/streak', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                habit_uuid: habit.id,
                timezone 
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              streakData = result.streak || 0;
            }
          } catch (error) {
            // Silent error handling, use default value of 0
          }
          
          // Calculate total days since habit creation
          const startDate = new Date(habit.start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...habit,
            current_streak: streakData,
            completions: habitLogs.length,
            total_days: diffDays,
            todayStatus: todayLog ? todayLog.status as 'completed' | 'pending' : 'pending'
          };
        })
      );

      setHabits(habitsWithStats);
    } catch (error) {
      // Silent error handling for production
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [timezone, timezoneLoading]);

  // Example: Refresh reminders when habits are loaded
  useEffect(() => {
    if (timezone) {
      checkReminders();
    }
  }, [timezone, checkReminders]);

  const filteredHabits = habits.filter(habit => {
    if (habitListTab === 'all') return true;
    if (habitListTab === 'active') return habit.is_active;
    if (habitListTab === 'inactive') return !habit.is_active;
    return true;
  });

  // Sort habits so that pending habits appear first and completed habits appear last
  const sortedHabits = [...filteredHabits].sort((a, b) => {
    // Define priority order: pending > completed
    const priority = {
      'pending': 0,
      'completed': 1
    };
    
    // Compare by priority (lower number = higher priority)
    return (priority[a.todayStatus || 'pending'] - priority[b.todayStatus || 'pending']);
  });

  const updateHabitStatus = async (habitId: string, status: 'completed') => {
    try {
      setIsUpdating(habitId);
      
      // Get current habit from state
      const currentHabit = habits.find(h => h.id === habitId);
      
      // Check if we're toggling off the current status (same status clicked twice)
      const isToggleOff = currentHabit?.todayStatus === status;
      
      // Use timezone-aware completion API
      const response = await fetch('/api/habits/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habit_id: habitId,
          status,
          timezone
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update habit status');
      }

      const result = await response.json();
      
      // Update local state
      setHabits(prevHabits => 
        prevHabits.map(habit => 
          habit.id === habitId 
            ? { 
                ...habit, 
                todayStatus: result.action === 'removed' ? 'pending' : status,
                // If completing, increment streak, otherwise reset it
                current_streak: result.action === 'removed' ? Math.max(0, habit.current_streak - 1) : habit.current_streak + 1,
                completions: result.action === 'removed' ? habit.completions - 1 : habit.completions + 1
              } 
            : habit
        )
      );
      
      // Refresh habits to get updated streak info
      fetchHabits();
      
      toast({
        title: result.action === 'removed' ? "Status cleared" : "Habit updated",
        description: result.action === 'removed' 
          ? `Habit marked as pending` 
          : `Habit marked as ${status}`,
        duration: 3000,
      });
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Update failed",
        description: "Failed to update habit status",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground">Track and manage your daily habits</p>
        </div>
        <Link href="/habits/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Habit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard 
          title="Total Habits" 
          value={habits.length.toString()} 
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatsCard 
          title="Active Streaks" 
          value={habits.filter(h => h.current_streak > 0).length.toString()} 
          icon={<Flame className="h-4 w-4 text-orange-500" />} 
        />
        <StatsCard 
          title="Completed Today" 
          value={habits.filter(h => h.todayStatus === 'completed').length.toString()} 
          icon={<Calendar className="h-4 w-4 text-green-500" />} 
        />
        <StatsCard 
          title="Completion Rate" 
          value={`${Math.round((habits.filter(h => h.todayStatus === 'completed').length / (habits.length || 1)) * 100)}%`} 
          icon={<LineChart className="h-4 w-4 text-blue-500" />} 
        />
      </div>

      <Tabs defaultValue="habits" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="habits">Habits</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>
          
          {activeTab === 'habits' && (
            <TabsList>
              <TabsTrigger 
                value="all" 
                onClick={() => setHabitListTab('all')}
                data-state={habitListTab === 'all' ? 'active' : ''}
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="active" 
                onClick={() => setHabitListTab('active')}
                data-state={habitListTab === 'active' ? 'active' : ''}
              >
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="inactive" 
                onClick={() => setHabitListTab('inactive')}
                data-state={habitListTab === 'inactive' ? 'active' : ''}
              >
                Inactive
              </TabsTrigger>
            </TabsList>
          )}
        </div>
        
        <TabsContent value="habits" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading your habits...
            </div>
          ) : sortedHabits.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedHabits.map(habit => (
                <HabitCard 
                  key={habit.id} 
                  habit={habit} 
                  onUpdateStatus={updateHabitStatus}
                  isUpdating={isUpdating === habit.id}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No habits found</h3>
                  <p className="text-muted-foreground mt-1">
                    You haven't created any habits yet. Add your first habit to get started.
                  </p>
                </div>
                <Button asChild className="mt-2">
                  <Link href="/habits/new">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create First Habit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="insights" className="mt-6">
          <HabitInsights habits={habits} logs={logs} />
        </TabsContent>
        
        <TabsContent value="rewards" className="mt-6">
          <HabitGamification habits={habits} logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
        <div className="p-2 bg-muted rounded-full">
          {icon}
        </div>
        <CardTitle className="text-xl">{value}</CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardContent>
    </Card>
  );
} 