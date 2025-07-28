'use client';

import { useEffect, useState } from 'react';
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
  deadline: string;
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

interface GoalDetailClientProps {
  goalId: string;
}

export default function GoalDetailClient({ goalId }: GoalDetailClientProps) {
  const router = useRouter();
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
          .eq('id', goalId)
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
          .eq('goal_id', goalId)
          .order('target_date', { ascending: true });

        if (milestonesError) throw milestonesError;

        // Fetch logs
        const { data: logsData, error: logsError } = await supabase
          .from('goal_logs')
          .select('*')
          .eq('goal_id', goalId)
          .order('log_date', { ascending: false });

        if (logsError) throw logsError;

        // Calculate progress percentage
        const progressPercentage = goalData.target_value > 0 
          ? Math.min(100, Math.round((goalData.current_value / goalData.target_value) * 100)) 
          : 0;
        
        // Calculate days remaining
        const deadlineDate = new Date(goalData.deadline);
        const today = new Date();
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        
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
        // Silent error handling for production
        toast({
          title: "Error",
          description: "Failed to load goal details",
          variant: "destructive"
        });
        router.push('/goals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoalData();
  }, [goalId, router]);

  const handleDeleteGoal = async () => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

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
          goal_id: goalId,
          log_date: new Date().toISOString().split('T')[0],
          value: newLogValue,
          notes: newLogNotes || null
        });

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

    if (newMilestone.target_value < 0) {
      toast({
        title: "Error",
        description: "Target value cannot be negative",
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
          goal_id: goalId,
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
      
      // Reset form
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
      const newStatus = !milestone.is_completed;
      
      const { error } = await supabase
        .from('goal_milestones')
        .update({ is_completed: newStatus })
        .eq('id', milestone.id);

      if (error) throw error;
      
      // Update local state
      if (goal) {
        setGoal({
          ...goal,
          milestones: goal.milestones.map(m => 
            m.id === milestone.id ? { ...m, is_completed: newStatus } : m
          )
        });
      }
      
      toast({
        title: "Success",
        description: `Milestone marked as ${newStatus ? 'completed' : 'incomplete'}`
      });
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to update milestone status",
        variant: "destructive"
      });
    }
  };

  const progressColor = () => {
    if (!goal) return 'bg-primary';
    
    if (goal.progress_percentage >= 100 || goal.is_completed) {
      return 'bg-success';
    }
    
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    const isPastDeadline = now > deadlineDate;
    
    if (isPastDeadline) {
      return 'bg-destructive';
    }
    
    // Days remaining is low relative to total duration and progress is behind schedule
    const startDate = new Date(goal.start_date);
    const totalDuration = deadlineDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const elapsedPercentage = (elapsed / totalDuration) * 100;
    
    // If elapsed time > 80% but progress < 60%, show warning color
    if (elapsedPercentage > 80 && goal.progress_percentage < 60) {
      return 'bg-warning';
    }
    
    return 'bg-primary';
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
        <Button variant="outline" onClick={() => router.push('/goals')}>
          Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/goals" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
            {goal.category && (
              <Badge variant="secondary" className="mt-1">
                {goal.category}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/goals/${goalId}/edit`}>
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

      <div className="mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="h-2 relative w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={`h-full ${progressColor()}`} 
                    style={{ width: `${goal.progress_percentage}%` }}
                  />
                </div>
                <div className="text-2xl font-bold">
                  {goal.current_value} / {goal.target_value} {goal.metric}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({goal.progress_percentage}%)
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-bold">
                  {goal.is_completed ? (
                    <span className="text-success flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Completed
                    </span>
                  ) : goal.is_active ? (
                    <span className="text-primary flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      Active
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center">
                      <XCircle className="mr-2 h-5 w-5" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Deadline</div>
                <div className="text-2xl font-bold flex items-center">
                  <CalendarClock className="mr-2 h-5 w-5" />
                  {format(new Date(goal.deadline), 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {goal.days_remaining > 0 
                    ? `${goal.days_remaining} days remaining` 
                    : "Past deadline"}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Started</div>
                <div className="text-2xl font-bold flex items-center">
                  <CalendarClock className="mr-2 h-5 w-5" />
                  {format(new Date(goal.start_date), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs 
        defaultValue="overview" 
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="logs">Progress Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          {goal.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{goal.description}</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Update Progress</CardTitle>
              <CardDescription>
                Log your current progress towards this goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Current Value ({goal.metric})</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newLogValue}
                      onChange={(e) => setNewLogValue(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any comments about your progress"
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmittingLog}>
                  {isSubmittingLog ? "Saving..." : "Log Progress"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="milestones" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Milestones</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {showMilestoneForm ? "Cancel" : "Add Milestone"}
            </Button>
          </div>
          
          {showMilestoneForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Milestone</CardTitle>
                <CardDescription>
                  Create smaller targets to help you reach your goal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMilestoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="milestone-title">Milestone Title *</Label>
                    <Input
                      id="milestone-title"
                      placeholder="e.g., Complete first 10 pages"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="milestone-description">Description (Optional)</Label>
                    <Textarea
                      id="milestone-description"
                      placeholder="Add more details about this milestone"
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="milestone-target-date">Target Date *</Label>
                      <Input
                        id="milestone-target-date"
                        type="date"
                        value={newMilestone.target_date}
                        onChange={(e) => setNewMilestone({...newMilestone, target_date: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="milestone-target-value">
                        Target Value ({goal.metric}) *
                      </Label>
                      <Input
                        id="milestone-target-value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newMilestone.target_value}
                        onChange={(e) => setNewMilestone({
                          ...newMilestone, 
                          target_value: parseFloat(e.target.value) || 0
                        })}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isSubmittingMilestone}>
                    {isSubmittingMilestone ? "Saving..." : "Add Milestone"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {goal.milestones.length > 0 ? (
            <div className="space-y-4">
              {goal.milestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Milestone className="h-5 w-5 mr-2" />
                        {milestone.title}
                      </CardTitle>
                      <Switch
                        checked={milestone.is_completed}
                        onCheckedChange={() => toggleMilestoneStatus(milestone)}
                      />
                    </div>
                    <CardDescription>
                      Target: {milestone.target_value} {goal.metric} by {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  {milestone.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {milestone.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No milestones created yet. Add some milestones to track your progress in smaller steps.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6 mt-6">
          <h3 className="text-lg font-semibold">Progress Logs</h3>
          
          {goal.logs.length > 0 ? (
            <div className="space-y-4">
              {goal.logs.map((log) => (
                <Card key={log.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center">
                        <BarChart4 className="h-5 w-5 mr-2" />
                        {log.value} {goal.metric}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(log.log_date), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  {log.notes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {log.notes}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No progress logs recorded yet. Update your progress to track how you're doing over time.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this goal and all related data, including milestones and progress logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Goal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 