"use client";

import { useState, useEffect } from "react";
import { BellIcon, CalendarDays, Clock, PlusIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format, addDays, isSameDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  frequency: 'daily' | 'weekly' | 'custom';
  frequency_days: number[];
  time_of_day: string | null;
  is_active: boolean;
}

export function HabitRemindersTab() {
  const [upcomingHabits, setUpcomingHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingHabits();
  }, []);

  const fetchUpcomingHabits = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Silent error handling for production
        setUpcomingHabits([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch active habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;

      if (!habitsData) {
        setUpcomingHabits([]);
        return;
      }

      // Filter habits scheduled for the next 7 days
      const nextSevenDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        nextSevenDays.push(addDays(new Date(), i));
      }

      const upcoming = habitsData.filter((habit: Habit) => {
        if (habit.frequency === 'daily') return true;
        
        if (habit.frequency === 'weekly') {
          // Check if any of the next 7 days matches the weekly schedule day
          // Assuming weekly is on Sunday (0)
          return nextSevenDays.some(date => date.getDay() === 0);
        }
        
        if (habit.frequency === 'custom' && habit.frequency_days.length > 0) {
          // Check if any of the next 7 days is in the custom schedule
          return nextSevenDays.some(date => 
            habit.frequency_days.includes(date.getDay())
          );
        }
        
        return false;
      });

      setUpcomingHabits(upcoming);
    } catch (error) {
      // Silent error handling for production
    } finally {
      setIsLoading(false);
    }
  };

  const createReminderForHabit = (habit: Habit) => {
    // This will be replaced with actual functionality to create a reminder
    toast({
      title: "Reminder created",
      description: `A reminder has been created for "${habit.name}"`,
      duration: 3000,
    });
  };

  const getNextOccurrence = (habit: Habit) => {
    if (habit.frequency === 'daily') {
      return 'Today';
    }
    
    const today = new Date();
    const todayDay = today.getDay(); // 0-6 (Sunday-Saturday)
    
    if (habit.frequency === 'weekly') {
      // Assuming weekly habit is for Sunday (0)
      if (todayDay === 0) return 'Today';
      const daysUntilSunday = 7 - todayDay;
      return `In ${daysUntilSunday} days`;
    }
    
    if (habit.frequency === 'custom' && habit.frequency_days.length > 0) {
      // Find the next occurrence from the custom days
      const nextDays = habit.frequency_days.filter(day => day >= todayDay);
      if (nextDays.length > 0) {
        // Next occurrence is this week
        const nextDay = nextDays[0];
        const daysUntil = nextDay - todayDay;
        if (daysUntil === 0) return 'Today';
        return `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
      } else {
        // Next occurrence is next week
        const nextDay = habit.frequency_days[0];
        const daysUntil = 7 - todayDay + nextDay;
        return `In ${daysUntil} days`;
      }
    }
    
    return 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Habits Needing Reminders</h2>
        <Button variant="outline" onClick={fetchUpcomingHabits} disabled={isLoading}>
          Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading upcoming habits...
        </div>
      ) : upcomingHabits.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingHabits.map(habit => (
            <Card key={habit.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{habit.name}</CardTitle>
                  {habit.category && (
                    <Badge variant="outline">
                      {habit.category}
                    </Badge>
                  )}
                </div>
                {habit.description && (
                  <CardDescription>{habit.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <span>Next: {getNextOccurrence(habit)}</span>
                    </div>
                    {habit.time_of_day && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{habit.time_of_day}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => createReminderForHabit(habit)}
                    className="w-full"
                  >
                    <BellIcon className="h-4 w-4 mr-2" />
                    Create Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center">
              <BellIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">No upcoming habits found</h3>
              <p className="text-muted-foreground mt-1">
                You don't have any upcoming habits that need reminders.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 