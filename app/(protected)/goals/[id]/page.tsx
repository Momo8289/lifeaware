'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  PencilIcon,
  TrashIcon,
  Target,
  CalendarClock,
  BarChart4,
  Milestone,
  PlusIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  metric: string;
  target_value: number;
  current_value: number;
  target_date: string;
  start_date: string;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_date: string;
  target_value: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface GoalLog {
  id: string;
  goal_id: string;
  log_date: string;
  value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GoalWithExtras extends Goal {
  milestones: GoalMilestone[];
  logs: GoalLog[];
  progress_percentage: number;
  days_remaining: number;
}

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [goal, setGoal] = useState<GoalWithExtras | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // New log form state
  const [newLogValue, setNewLogValue] = useState<number>(0);
  const [newLogNotes, setNewLogNotes] = useState<string>('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // New milestone form state
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    target_date: new Date().toISOString().split('T')[0],
    target_value: 0,
  });
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  useEffect(() => {
    const fetchGoalData = async () => {
      try {
        setIsLoading(true);

        // Fetch the goal
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .select('*')
          .eq('id', id)
          .single();

        if (goalError) throw goalError;

        if (!goalData) {
          router.push('/goals');
          return;
        }

        // Fetch milestones
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('goal_milestones')
          .select('*')
          .eq('goal_id', id)
          .order('target_date', { ascending: true });

        if (milestonesError) throw milestonesError;

        // Fetch logs
        const { data: logsData, error: logsError } = await supabase
          .from('goal_logs')
          .select('*')
          .eq('goal_id', id)
          .order('log_date', { ascending: false });

        if (logsError) throw logsError;
        console.log("goal data", goalData, logsData)
        goalData.current_value = (() => {
          let total = 0;
          for(const log of logsData) total += log.value;
          return total
        })();
        // Calculate progress percentage
        const progressPercentage = goalData.target_value > 0
          ? Math.min(100, Math.round((goalData.current_value / goalData.target_value) * 100))
          : 0;

        // Calculate days remaining
        const deadlineDate = new Date(goalData.deadline)

        const today = new Date();
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        console.log("days", daysRemaining)
        // Initialize form with current value
        setNewLogValue(goalData.current_value);

        setGoal({
          ...goalData,
          milestones: milestonesData || [],
          logs: logsData || [],
          progress_percentage: progressPercentage,
          days_remaining: daysRemaining
        });
      } catch (error) {
        console.error(error)
        toast({
          title: "Error",
          description: "Failed to load goal details",
          variant: "destructive"
        });
        // router.push('/goals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoalData();
  }, [id, router]);

  const handleDeleteGoal = async () => {
    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal deleted successfully"
      });
      router.push('/goals');
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newLogValue < 0) {
      toast({
        title: "Error",
        description: "Value cannot be negative",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmittingLog(true);

      // Insert the log
      const { error } = await supabase
        .from('goal_logs')
        .insert({
          goal_id: id,
          log_date: new Date().toISOString().split('T')[0],
          value: newLogValue,
          notes: newLogNotes || null
        });

      const { error: goalError } = await supabase
          .from('goals').update({'current_value': (goal?.current_value || 0) + newLogValue}).eq('id', goal?.id)

      if(goalError) throw goalError;
      if (error) throw error;

      toast({
        title: "Success",
        description: "Progress logged successfully!"
      });

      // Refresh the page to update data
      window.location.reload();
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to log progress",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMilestone.title) {
      toast({
        title: "Error",
        description: "Milestone title is required",
        variant: "destructive"
      });
      return;
    }

    if (newMilestone.target_value <= 0) {
      toast({
        title: "Error",
        description: "Target value must be greater than zero",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmittingMilestone(true);

      // Insert the milestone
      const { error } = await supabase
        .from('goal_milestones')
        .insert({
          goal_id: id,
          title: newMilestone.title,
          description: newMilestone.description || null,
          target_date: newMilestone.target_date,
          target_value: newMilestone.target_value,
          is_completed: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Milestone added successfully!"
      });

      // Reset form and hide it
      setNewMilestone({
        title: '',
        description: '',
        target_date: new Date().toISOString().split('T')[0],
        target_value: 0,
      });
      setShowMilestoneForm(false);

      // Refresh the page to update data
      window.location.reload();
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to add milestone",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingMilestone(false);
    }
  };

  const toggleMilestoneStatus = async (milestone: GoalMilestone) => {
    try {
      const { error } = await supabase
        .from('goal_milestones')
        .update({ is_completed: !milestone.is_completed })
        .eq('id', milestone.id);

      if (error) throw error;

      // Update the local state without a full refresh
      if (goal) {
        const updatedMilestones = goal.milestones.map(m =>
          m.id === milestone.id ? { ...m, is_completed: !m.is_completed } : m
        );
        setGoal({ ...goal, milestones: updatedMilestones });
      }

      toast({
        title: "Success",
        description: `Milestone marked as ${milestone.is_completed ? 'incomplete' : 'complete'}`
      });
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Loading goal details...</p>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container py-8">
        <p>Goal not found</p>
        <Button
          onClick={() => router.push('/goals')}
          className="mt-4"
        >
          Back to Goals
        </Button>
      </div>
    );
  }

  const progressColor = () => {
    if (goal.is_completed) return 'bg-green-500';
    if (goal.progress_percentage >= 75) return 'bg-green-500';
    if (goal.progress_percentage >= 50) return 'bg-yellow-500';
    if (goal.progress_percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const deadlineDate = new Date(goal.target_date);
  const startDate = new Date(goal.start_date);

  const formattedDeadline = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(deadlineDate);

  const formattedStartDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(startDate);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/goals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
              {goal.category && (
                <Badge className="text-xs font-normal">
                  {goal.category}
                </Badge>
              )}
              {goal.is_completed && (
                <Badge className="bg-green-500 text-white">
                  Completed
                </Badge>
              )}
              {!goal.is_active && !goal.is_completed && (
                <Badge variant="outline">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{goal.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/goals/${goal.id}/edit`}>
            <Button variant="outline" size="sm">
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Target className="h-4 w-4 mr-2 text-primary" />
              Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goal.target_value} {goal.metric}</div>
            <p className="text-muted-foreground text-sm">Current: {goal.current_value} {goal.metric}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <CalendarClock className="h-4 w-4 mr-2 text-primary" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goal.days_remaining} days left</div>
            <p className="text-muted-foreground text-sm">Deadline: {formattedDeadline}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <BarChart4 className="h-4 w-4 mr-2 text-primary" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goal.progress_percentage}%</div>
            <Progress value={goal.progress_percentage} className={`mt-2 ${progressColor()}`} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Progress Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Progress</CardTitle>
              <CardDescription>Log your current progress towards this goal</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-value">Current Value ({goal.metric})</Label>
                  <Input
                    id="current-value"
                    type="number"
                    step="0.01"
                    value={newLogValue}
                    onChange={(e) => setNewLogValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any thoughts on your progress?"
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSubmittingLog}>
                  {isSubmittingLog ? "Saving..." : "Log Progress"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Start Date</h4>
                  <p>{formattedStartDate}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Deadline</h4>
                  <p>{formattedDeadline}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Metric</h4>
                  <p>{goal.metric}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <p>{goal.is_completed ? "Completed" : goal.is_active ? "Active" : "Inactive"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Progress</h4>
                {goal.logs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No progress logged yet</p>
                ) : (
                  <div className="space-y-2">
                    {goal.logs.slice(0, 3).map((log) => (
                      <div key={log.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{log.value} {goal.metric}</p>
                          {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.log_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {goal.logs.length > 3 && (
                      <Button
                        variant="link"
                        onClick={() => setActiveTab('logs')}
                        className="p-0 h-auto"
                      >
                        View all {goal.logs.length} log entries
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Logs</CardTitle>
              <CardDescription>Track your progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              {goal.logs.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart4 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No progress logs yet</h3>
                  <p className="text-muted-foreground">
                    Start logging your progress to track your journey toward your goal
                  </p>
                  <Button
                    onClick={() => setActiveTab('overview')}
                    className="mt-4"
                  >
                    Log Your Progress
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {goal.logs.map((log) => (
                    <div key={log.id} className="flex justify-between items-start border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.value} {goal.metric}</span>
                          {log.value > (goal.logs[goal.logs.indexOf(log) + 1]?.value || 0) && (
                            <Badge className="bg-green-500">+{(log.value - (goal.logs[goal.logs.indexOf(log) + 1]?.value || 0)).toFixed(2)}</Badge>
                          )}
                        </div>
                        {log.notes && <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.log_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActiveTab('overview')}
              >
                Update Progress
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All goal progress and milestones will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 