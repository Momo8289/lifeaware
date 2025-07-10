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
import { NewHabitModal } from '@/components/habits/NewHabitModal';
import { createBrowserClient } from '@supabase/ssr';
import { useUserTimezone } from '@/lib/hooks/useUserTimezone';
import { getTodayInTimezone } from '@/lib/utils/timezone';
import { useReminders } from '@/components/providers/ReminderProvider';
import {getURL} from "@/utils/helpers";

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
  const [habitListTab, setHabitListTab] = useState('active');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showNewHabitModal, setShowNewHabitModal] = useState(false);
  const { timezone, isLoading: timezoneLoading } = useUserTimezone();
  const { reminders, checkReminders } = useReminders();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log("ENV:", getURL())

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
            todayStatus: (() => {
              // Check if habit has started
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(habit.start_date);
              startDate.setHours(0, 0, 0, 0);
              
              // If habit hasn't started yet, don't assign any today status
              if (startDate > today) {
                return undefined;
              }
              
              // If habit has started, return the actual status or default to pending
              return todayLog ? todayLog.status as 'completed' | 'pending' : 'pending';
            })()
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

  const filteredHabits = habits.filter(habit => {
    if (habitListTab === 'all') return true;
    if (habitListTab === 'active') return habit.is_active;
    if (habitListTab === 'inactive') return !habit.is_active;
    return true;
  });

  // Sort habits so that pending habits appear first and completed habits appear last
  const sortedHabits = [...filteredHabits].sort((a, b) => {
    // Check if habits have started
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aStarted = new Date(a.start_date) <= today;
    const bStarted = new Date(b.start_date) <= today;
    
    // Future habits go to the end
    if (!aStarted && bStarted) return 1;
    if (aStarted && !bStarted) return -1;
    if (!aStarted && !bStarted) return 0; // Both future, maintain order
    
    // For started habits, define priority order: pending > completed
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
      
      // Prevent updating inactive habits
      if (currentHabit && !currentHabit.is_active) {
        toast({
          title: "Cannot update inactive habit",
          description: "This habit is inactive and cannot be completed.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Prevent updating habits that haven't started yet
      if (currentHabit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(currentHabit.start_date);
        startDate.setHours(0, 0, 0, 0);
        
        if (startDate > today) {
          toast({
            title: "Cannot update future habit",
            description: `This habit starts on ${startDate.toLocaleDateString()}.`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }
      
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
      
      // Trigger reminder count refresh in sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refresh-reminders'));
      }
      
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

  const handleHabitCreated = () => {
    fetchHabits(); // Refresh the habits list
  };

  const handleNewHabitClick = () => {
    setShowNewHabitModal(true);
  };

  return (
    <div className="container py-6 space-y-6">
      <p>{getURL()}</p>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground">Track and manage your daily habits</p>
        </div>
        <Button onClick={handleNewHabitClick}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Habit
        </Button>
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
          value={habits.filter(h => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(h.start_date);
            startDate.setHours(0, 0, 0, 0);
            return startDate <= today && h.todayStatus === 'completed';
          }).length.toString()} 
          icon={<Calendar className="h-4 w-4 text-green-500" />} 
        />
        <StatsCard 
          title="Completion Rate" 
          value={(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startedHabits = habits.filter(h => {
              const startDate = new Date(h.start_date);
              startDate.setHours(0, 0, 0, 0);
              return startDate <= today;
            });
            const completedToday = startedHabits.filter(h => h.todayStatus === 'completed').length;
            const rate = startedHabits.length > 0 ? Math.round((completedToday / startedHabits.length) * 100) : 0;
            return `${rate}%`;
          })()} 
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
            <Tabs value={habitListTab} onValueChange={setHabitListTab}>
              <TabsList>
                <TabsTrigger value="active">
                  Active
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        
        <TabsContent value="habits" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading your habits...
            </div>
          ) : sortedHabits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  <h3 className="text-lg font-medium">
                    {habitListTab === 'inactive' ? 'No inactive habits' : 'No habits found'}
                  </h3>
                  {habitListTab !== 'inactive' && (
                    <p className="text-muted-foreground mt-1">
                      You haven't created any habits yet. Add your first habit to get started.
                    </p>
                  )}
                </div>
                {habitListTab !== 'inactive' && (
                  <Button onClick={handleNewHabitClick} className="mt-2">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create First Habit
                  </Button>
                )}
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

      <NewHabitModal 
        open={showNewHabitModal} 
        onOpenChange={setShowNewHabitModal}
        onHabitCreated={handleHabitCreated}
      />
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