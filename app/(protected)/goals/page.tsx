'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, Target, Timer, CalendarClock, LineChart, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

// Types
interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  metric: string;
  target_value: number;
  current_value: number;
  deadline: string;
  start_date: string;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GoalWithStats extends Goal {
  progress_percentage: number;
  days_remaining: number;
  milestone_completion_rate: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        
        // Get current user to ensure we're authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Silent error handling for production
          setGoals([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch goals - with RLS, this will only return the user's goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .order('created_at', { ascending: false });

        if (goalsError) throw goalsError;

        if (!goalsData) {
          setGoals([]);
          return;
        }

        // Process goals with stats
        const goalsWithStats: GoalWithStats[] = goalsData.map((goal: Goal) => {
          // Calculate progress percentage
          const progressPercentage = goal.target_value > 0 
            ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) 
            : 0;
          
          // Calculate days remaining
          const deadlineDate = new Date(goal.deadline);
          const today = new Date();
          const timeDiff = deadlineDate.getTime() - today.getTime();
          const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
          
          return {
            ...goal,
            progress_percentage: progressPercentage,
            days_remaining: daysRemaining,
            milestone_completion_rate: 0  // Will be updated with milestone data
          };
        });

        // For each goal, fetch milestone info
        for (const goal of goalsWithStats) {
          const { data: milestonesData, error: milestonesError } = await supabase
            .from('goal_milestones')
            .select('*')
            .eq('goal_id', goal.id);
          
          if (milestonesData && milestonesData.length > 0) {
            const completedMilestones = milestonesData.filter(milestone => milestone.is_completed).length;
            goal.milestone_completion_rate = Math.round((completedMilestones / milestonesData.length) * 100);
          }
        }

        setGoals(goalsWithStats);
      } catch (error) {
        // Silent error handling for production
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const filteredGoals = goals.filter(goal => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return goal.is_active && !goal.is_completed;
    if (activeTab === 'completed') return goal.is_completed;
    return true;
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Track and achieve your long-term goals</p>
        </div>
        <Link href="/goals/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard 
          title="Total Goals" 
          value={goals.length.toString()} 
          icon={<Target className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatsCard 
          title="Active Goals" 
          value={goals.filter(g => g.is_active && !g.is_completed).length.toString()} 
          icon={<Timer className="h-4 w-4 text-blue-500" />} 
        />
        <StatsCard 
          title="Completed Goals" 
          value={goals.filter(g => g.is_completed).length.toString()} 
          icon={<Trophy className="h-4 w-4 text-green-500" />} 
        />
        <StatsCard 
          title="Avg. Progress" 
          value={`${Math.round(goals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / (goals.length || 1))}%`} 
          icon={<LineChart className="h-4 w-4 text-orange-500" />} 
        />
      </div>

      <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">All Goals</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <p>Loading goals...</p>
          ) : filteredGoals.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No goals found</h3>
              <p className="text-muted-foreground">Create your first goal to start tracking your progress</p>
              <Link href="/goals/new">
                <Button className="mt-4">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
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

function GoalCard({ goal }: { goal: GoalWithStats }) {
  const deadlineDate = new Date(goal.deadline);
  const formattedDeadline = new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(deadlineDate);

  const progressColor = () => {
    if (goal.is_completed) return 'bg-green-500';
    if (goal.progress_percentage >= 75) return 'bg-green-500';
    if (goal.progress_percentage >= 50) return 'bg-yellow-500';
    if (goal.progress_percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const statusBadge = () => {
    if (goal.is_completed) {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    if (!goal.is_active) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (goal.days_remaining === 0) {
      return <Badge className="bg-red-500">Due Today</Badge>;
    }
    if (goal.days_remaining <= 7) {
      return <Badge className="bg-orange-500">Due Soon</Badge>;
    }
    return <Badge variant="outline">{goal.days_remaining} days left</Badge>;
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="flex flex-col p-6">
        <div className="flex justify-between mb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{goal.title}</h3>
              {goal.category && (
                <Badge variant="outline" className="ml-2">
                  {goal.category}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge()}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex justify-between items-center text-sm">
            <span>Progress: {goal.progress_percentage}%</span>
            <span>{goal.current_value} / {goal.target_value} {goal.metric}</span>
          </div>
          <Progress value={goal.progress_percentage} className={progressColor()} />
        </div>
        
        <div className="flex justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>Deadline: {formattedDeadline}</span>
          </div>
          <Link href={`/goals/${goal.id}`}>
            <Button variant="outline" size="sm">View Details</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
} 