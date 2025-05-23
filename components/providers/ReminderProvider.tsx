'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserTimezone } from '@/lib/hooks/useUserTimezone';
import { checkAndUpdateReminders, markHabitCompleted, dismissReminder as dismissReminderUtil } from '@/lib/utils/reminders';
import { toast } from '@/components/ui/use-toast';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReminderContextType {
  reminders: any[];
  checkReminders: () => Promise<void>;
  dismissReminder: (reminderId: string) => void;
  completeHabit: (habitId: string) => Promise<void>;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
}

interface ReminderProviderProps {
  children: React.ReactNode;
}

/**
 * Helper function to trigger reminder count refresh in sidebar
 */
function triggerReminderRefresh() {
  // Trigger the custom event that the sidebar listens for
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refresh-reminders'));
  }
}

export function ReminderProvider({ children }: ReminderProviderProps) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);
  const { timezone, isLoading: timezoneLoading } = useUserTimezone();

  const checkReminders = async () => {
    if (timezoneLoading || !timezone) return;
    
    try {
      const result = await checkAndUpdateReminders(timezone);
      
      if (result.success && result.reminders) {
        // Show new reminders that haven't been dismissed
        const newReminders = result.reminders.filter(reminder => 
          !reminders.some(existing => existing.id === reminder.id)
        );
        
        if (newReminders.length > 0) {
          setReminders(prev => [...prev, ...newReminders]);
          
          // Show toast notifications for new reminders
          newReminders.forEach(reminder => {
            showReminderToast(reminder);
          });
        }
        
        // If reminders have changed (some may have been filtered out), refresh sidebar count
        if (result.reminders.length !== reminders.length) {
          triggerReminderRefresh();
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  };

  const showReminderToast = (reminder: any) => {
    toast({
      title: reminder.title,
      description: reminder.message,
      duration: 10000, // 10 seconds
      action: (
        <div className="flex gap-2">
          {reminder.habit_id && (
            <Button
              size="sm"
              onClick={() => completeHabit(reminder.habit_id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => dismissReminder(reminder.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  };

  const dismissReminder = async (reminderId: string) => {
    try {
      // Update in database
      await dismissReminderUtil(reminderId);
      
      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      
      // Trigger sidebar refresh
      triggerReminderRefresh();
      
      toast({
        title: "Reminder dismissed",
        description: "The reminder has been dismissed",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss reminder",
        variant: "destructive",
      });
    }
  };

  const completeHabit = async (habitId: string) => {
    if (!habitId) return;
    
    try {
      // Mark as completed in database via existing API route
      const response = await fetch('/api/habits/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habit_id: habitId,
          status: 'completed',
          timezone
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete habit');
      }

      // Also mark related reminders as completed
      await markHabitCompleted(habitId, timezone);
      
      // Remove related reminders from UI
      setReminders(prev => prev.filter(r => r.habit_id !== habitId));
      
      // Trigger sidebar refresh to update reminder count
      triggerReminderRefresh();
      
      // Also trigger a fresh reminder check to catch any newly completed habits
      setTimeout(() => {
        checkReminders();
      }, 1000);
      
      toast({
        title: "Habit completed!",
        description: "Great job staying on track!",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error completing habit:', error);
      toast({
        title: "Error",
        description: "Failed to mark habit as completed",
        variant: "destructive",
      });
    }
  };

  // Check reminders when app loads and timezone is available
  useEffect(() => {
    if (!timezoneLoading && timezone && !hasCheckedToday) {
      checkReminders();
      setHasCheckedToday(true);
    }
  }, [timezone, timezoneLoading, hasCheckedToday]);

  // Check reminders periodically (every 15 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkReminders();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [timezone, timezoneLoading]);

  // Check reminders when user returns to tab (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timezone) {
        checkReminders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timezone]);

  const contextValue: ReminderContextType = {
    reminders,
    checkReminders,
    dismissReminder,
    completeHabit,
  };

  return (
    <ReminderContext.Provider value={contextValue}>
      {children}
    </ReminderContext.Provider>
  );
} 