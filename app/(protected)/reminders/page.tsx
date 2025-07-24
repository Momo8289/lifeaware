'use client';

import { useState, useEffect } from 'react';
import { BellIcon, CalendarDays, CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/utils/supabase/client";
import { format, isPast, isToday, addDays } from "date-fns";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "High" | "Medium" | "Low";
  status: "active" | "completed" | "dismissed";
  habit_id: string | null;
  created_at: string;
}

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Silent error handling for production
        setReminders([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch reminders
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      setReminders(data || []);
    } catch (error) {
      // Silent error handling for production
    } finally {
      setIsLoading(false);
    }
  };

  const updateReminderStatus = async (id: string, status: 'completed' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setReminders(prevReminders => 
        prevReminders.map(reminder => 
          reminder.id === id ? { ...reminder, status } : reminder
        )
      );

      toast({
        title: status === 'completed' ? "Reminder completed" : "Reminder dismissed",
        description: `The reminder has been marked as ${status}`,
        duration: 3000
      });
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Failed to update reminder",
        description: "An error occurred while updating the reminder status",
        variant: "destructive"
      });
    }
  };

  // Filter reminders by status
  const activeReminders = reminders.filter(r => r.status === 'active');
  const completedReminders = reminders.filter(r => r.status === 'completed');
  
  // Calculate statistics
  const dueToday = activeReminders.filter(r => isToday(new Date(r.due_date))).length;
  const overdue = activeReminders.filter(r => isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date))).length;
  const upcoming = activeReminders.filter(r => !isPast(new Date(r.due_date)) || isToday(new Date(r.due_date))).length;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">Manage your reminders and notifications</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard 
          title="Active Reminders" 
          value={activeReminders.length.toString()} 
          icon={<BellIcon className="h-4 w-4 text-blue-500" />} 
        />
        <StatsCard 
          title="Due Today" 
          value={dueToday.toString()} 
          icon={<CalendarDays className="h-4 w-4 text-orange-500" />} 
        />
        <StatsCard 
          title="Completed" 
          value={completedReminders.length.toString()} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} 
        />
        <StatsCard 
          title="Upcoming" 
          value={upcoming.toString()} 
          icon={<Clock className="h-4 w-4 text-purple-500" />} 
        />
      </div>

      <Tabs defaultValue="active" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="active" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading your reminders...
            </div>
          ) : activeReminders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={() => updateReminderStatus(reminder.id, 'completed')}
                  onDismiss={() => updateReminderStatus(reminder.id, 'dismissed')}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center">
                  <BellIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No active reminders</h3>
                  <p className="text-muted-foreground mt-1">
                    You don't have any active reminders. Create reminders from your habits, goals, and other activities to stay on track.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          {completedReminders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id}
                  reminder={reminder}
                  isCompleted={true}
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
                  <h3 className="text-lg font-medium">No completed reminders</h3>
                  <p className="text-muted-foreground mt-1">
                    You haven't completed any reminders yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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

function ReminderCard({ 
  reminder,
  onComplete,
  onDismiss,
  isCompleted = false
}: { 
  reminder: Reminder;
  onComplete?: () => void;
  onDismiss?: () => void;
  isCompleted?: boolean;
}) {
  const priorityColor = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800"
  }[reminder.priority];

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const isPastDue = isPast(new Date(reminder.due_date)) && !isToday(new Date(reminder.due_date));

  return (
    <Card className={isCompleted ? "opacity-70" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{reminder.title}</CardTitle>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
            {reminder.priority}
          </div>
        </div>
        {reminder.description && (
          <CardDescription>{reminder.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 mr-2" />
          <span className={isPastDue && !isCompleted ? "text-red-500 font-medium" : ""}>
            {formatDueDate(reminder.due_date)}
            {isPastDue && !isCompleted && " (Overdue)"}
          </span>
        </div>
        {!isCompleted && (
          <div className="mt-4 flex space-x-2">
            <Button variant="outline" size="sm" onClick={onComplete}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <Clock className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 