import { createBrowserClient } from '@supabase/ssr';
import { getTodayInTimezone, formatDateInTimezone } from './timezone';

export interface Reminder {
  id: string;
  habit_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'active' | 'completed' | 'dismissed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Habit {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_days: number[];
  user_id: string;
}

/**
 * Universal reminder checker - call this whenever user opens the app
 * or navigates to any page. It handles all timezone logic internally.
 */
export async function checkAndUpdateReminders(userTimezone: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const today = getTodayInTimezone(userTimezone);
    const now = new Date();

    // Get active reminders that are due (due_date <= now)
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select(`
        *,
        habits (
          id,
          frequency,
          frequency_days,
          user_id
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lte('due_date', now.toISOString());

    if (error) {
      console.error('Error fetching reminders:', error);
      return { success: false, error: error.message };
    }

    const results = [];
    
    for (const reminder of reminders || []) {
      // For habit-related reminders, check if habit was completed today
      if (reminder.habit_id && reminder.habits) {
        const { data: todayLog } = await supabase
          .from('habit_logs')
          .select('status')
          .eq('habit_id', reminder.habit_id)
          .eq('completion_date', today)
          .eq('status', 'completed')
          .single();

        // If habit is already completed today, don't show reminder
        if (todayLog) {
          continue;
        }
      }

      results.push({
        id: reminder.id,
        title: reminder.title,
        message: reminder.description || reminder.title,
        habit_id: reminder.habit_id,
        due_date: reminder.due_date,
        priority: reminder.priority,
        reason: 'Reminder due'
      });
    }

    return { 
      success: true, 
      reminders: results,
      timezone: userTimezone,
      checked_at: today 
    };

  } catch (error) {
    console.error('Error checking reminders:', error);
    return { success: false, error: 'Failed to check reminders' };
  }
}

/**
 * Mark a habit as completed and update related reminders
 */
export async function markHabitCompleted(habitId: string, userTimezone: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Mark any active reminders for this habit as completed
    const { data: updatedReminders, error } = await supabase
      .from('reminders')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('habit_id', habitId)
      .eq('status', 'active')
      .select();

    if (error) {
      console.error('Error updating reminders:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      updated_reminders: updatedReminders?.length || 0
    };
  } catch (error) {
    console.error('Error updating reminders for completed habit:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Dismiss a reminder (mark as dismissed)
 */
export async function dismissReminder(reminderId: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { error } = await supabase
      .from('reminders')
      .update({ 
        status: 'dismissed',
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId);

    if (error) {
      console.error('Error dismissing reminder:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error dismissing reminder:', error);
    return { success: false, error: (error as Error).message };
  }
} 