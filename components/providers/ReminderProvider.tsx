'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserTimezone } from 'hooks/useUserTimezone';
import { checkAndUpdateReminders, markHabitCompleted, dismissReminder as dismissReminderUtil, getAllActiveReminders } from 'utils/reminders';
import { toast } from '@/components/ui/use-toast';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReminderContextType {
  reminders: any[]; // Due reminders for popups
  allActiveReminders: any[]; // All active reminders for card display
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
  const [allActiveReminders, setAllActiveReminders] = useState<any[]>([]);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);
  const [isCheckingReminders, setIsCheckingReminders] = useState(false);
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());
  const [activeToasts, setActiveToasts] = useState<Set<string>>(new Set());
  const { timezone, isLoading: timezoneLoading } = useUserTimezone();

  // Use a ref to store the latest state without triggering re-renders
  const remindersRef = React.useRef(reminders);
  const shownRemindersRef = React.useRef(shownReminders);
  
  React.useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);
  
  React.useEffect(() => {
    shownRemindersRef.current = shownReminders;
  }, [shownReminders]);

  // Function to refresh all active reminders for card display
  const refreshAllActiveReminders = React.useCallback(async () => {
    if (timezoneLoading || !timezone) return;
    
    try {
      const result = await getAllActiveReminders();
      if (result.success && result.reminders) {
        setAllActiveReminders(result.reminders);
      }
    } catch (error) {
      console.error('Error refreshing all active reminders:', error);
    }
  }, [timezoneLoading, timezone]);

  const checkReminders = React.useCallback(async () => {
    if (timezoneLoading || !timezone || isCheckingReminders) {
      return;
    }
    
    try {
      setIsCheckingReminders(true);
      
      // Get due reminders for popups
      const result = await checkAndUpdateReminders(timezone);
      
      // Also refresh all active reminders for card display
      await refreshAllActiveReminders();
      
      if (result.success && result.reminders) {
        // Show new reminders that haven't been dismissed
        const currentReminders = remindersRef.current;
        const currentShownReminders = shownRemindersRef.current;
        
        const newReminders = result.reminders.filter(reminder => 
          !currentReminders.some(existing => existing.id === reminder.id)
        );
        
        if (newReminders.length > 0) {
          setReminders(prev => [...prev, ...newReminders]);
          
          // Show toast notifications for new reminders that haven't been shown yet
          newReminders.forEach(reminder => {
            if (!currentShownReminders.has(reminder.id)) {
              showReminderToast(reminder);
              setShownReminders(prev => new Set([...Array.from(prev), reminder.id]));
            }
          });
        }
        
        // If reminders have changed (some may have been filtered out), refresh sidebar count
        if (result.reminders.length !== currentReminders.length) {
          triggerReminderRefresh();
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    } finally {
      setIsCheckingReminders(false);
    }
  }, [timezoneLoading, timezone, isCheckingReminders, refreshAllActiveReminders]);

  const showReminderToast = React.useCallback((reminder: any) => {
    // Track this toast as active
    setActiveToasts(prev => new Set([...Array.from(prev), reminder.id]));
    
    const { dismiss } = toast({
      title: reminder.title,
      description: reminder.message,
      duration: 10000, // 10 seconds
      action: (
        <div className="flex gap-2">
          {reminder.habit_id && (
            <Button
              size="sm"
              onClick={() => {
                completeHabit(reminder.habit_id);
                dismiss(); // Dismiss the toast immediately
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              dismissReminder(reminder.id);
              dismiss(); // Dismiss the toast immediately
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
    
    // Store the dismiss function for this reminder
    return dismiss;
  }, []);

  const dismissReminder = async (reminderId: string) => {
    try {
      // Update in database
      await dismissReminderUtil(reminderId);
      
      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      
      // Remove from all active reminders
      setAllActiveReminders(prev => prev.filter(r => r.id !== reminderId));
      
      // Remove from shown reminders set
      setShownReminders(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(reminderId);
        return newSet;
      });
      
      // Remove from active toasts
      setActiveToasts(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(reminderId);
        return newSet;
      });
      
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
      
      // Remove from all active reminders 
      setAllActiveReminders(prev => prev.filter(r => r.habit_id !== habitId));
      
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

  // Load all active reminders when timezone is available
  useEffect(() => {
    if (!timezoneLoading && timezone) {
      refreshAllActiveReminders();
    }
  }, [timezone, timezoneLoading, refreshAllActiveReminders]);

  // Check reminders periodically (every 15 minutes) - only set interval once
  useEffect(() => {
    if (!timezone) return;
    
    const interval = setInterval(() => {
      checkReminders();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [timezone]);

  // Check reminders when user returns to tab (visibility change)
  useEffect(() => {
    if (!timezone) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkReminders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timezone]);

  const contextValue: ReminderContextType = {
    reminders,
    allActiveReminders,
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