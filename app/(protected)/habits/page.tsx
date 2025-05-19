'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, CheckCircle2, Flame, Calendar, LineChart, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

interface HabitWithStats extends Habit {
  current_streak: number;
  streak_goal?: number;
  todayStatus?: 'completed' | 'pending' | 'missed';
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        setIsLoading(true);
        
        // Get current user to ensure we're authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('User not authenticated');
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

        // Fetch today's logs to determine habit status
        const today = new Date().toISOString().split('T')[0];
        const { data: logsData, error: logsError } = await supabase
          .from('habit_logs')
          .select('habit_id, status')
          .eq('completion_date', today);

        if (logsError) throw logsError;

        // Process habits with stats
        const habitsWithStats: HabitWithStats[] = habitsData.map((habit: Habit) => {
          const todayLog = logsData?.find((log: any) => log.habit_id === habit.id);
          return {
            ...habit,
            current_streak: 0, // Will be updated from streak calculation
            todayStatus: todayLog ? todayLog.status as 'completed' | 'pending' | 'missed' : 'pending'
          };
        });

        // For each habit, fetch streak info
        for (const habit of habitsWithStats) {
          const { data: streakData } = await supabase
            .rpc('get_habit_streak', { habit_uuid: habit.id });
          
          habit.current_streak = streakData || 0;
        }

        setHabits(habitsWithStats);
      } catch (error) {
        console.error('Error fetching habits:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabits();
  }, []);

  const filteredHabits = habits.filter(habit => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return habit.is_active;
    if (activeTab === 'inactive') return !habit.is_active;
    return true;
  });

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

      <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">All Habits</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <p>Loading habits...</p>
          ) : filteredHabits.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No habits found</h3>
              <p className="text-muted-foreground">Create your first habit to start tracking your progress</p>
              <Link href="/habits/new">
                <Button className="mt-4">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Habit
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHabits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
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

function HabitCard({ habit }: { habit: HabitWithStats }) {
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

  const todayStatusColor = () => {
    if (habit.todayStatus === 'completed') return 'bg-green-500';
    if (habit.todayStatus === 'missed') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="flex justify-between p-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            {habit.category && (
              <Badge variant="outline" className="ml-2">
                {habit.category}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{habit.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{frequencyText()}</Badge>
            {habit.time_of_day && (
              <Badge variant="outline">{habit.time_of_day}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${todayStatusColor()}`} />
            <span className="text-sm font-medium">
              {habit.todayStatus === 'completed' 
                ? 'Completed' 
                : habit.todayStatus === 'missed' 
                  ? 'Missed' 
                  : 'Pending'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Streak: {habit.current_streak}</span>
          </div>
          <Link href={`/habits/${habit.id}`}>
            <Button variant="ghost" size="sm" className="mt-2">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
} 