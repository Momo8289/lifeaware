import { createBrowserClient } from '@supabase/ssr';
import { getTodayInTimezone, formatDateInTimezone } from './timezone';

export interface Reminder {
  id: string;
  habit_id: string;
  user_id: string;
  title: string;
  message: string;
  scheduled_time: string; // HH:MM format
  scheduled_days: number[]; // 0-6, Sunday to Saturday
  is_active: boolean;
  last_sent_date: string | null;
  created_at: string;
  updated_at: string;
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
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Get all active reminders for this user with their habits
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
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching reminders:', error);
      return { success: false, error: error.message };
    }

    const results = [];
    
    for (const reminder of reminders || []) {
      const shouldSend = await shouldSendReminder(reminder, userTimezone, today, currentTimeStr);
      
      if (shouldSend.send) {
        // Update last_sent_date
        await supabase
          .from('reminders')
          .update({ 
            last_sent_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        results.push({
          id: reminder.id,
          title: reminder.title,
          message: reminder.message,
          habit_id: reminder.habit_id,
          reason: shouldSend.reason
        });
      }
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
 * Determines if a reminder should be sent based on habit frequency and user timezone
 */
async function shouldSendReminder(
  reminder: any, 
  userTimezone: string, 
  today: string, 
  currentTime: string
): Promise<{ send: boolean; reason: string }> {
  
  const habit = reminder.habits;
  if (!habit) {
    return { send: false, reason: 'No habit found' };
  }

  // Check if already sent today
  if (reminder.last_sent_date === today) {
    return { send: false, reason: 'Already sent today' };
  }

  // Check if it's time to send (reminder scheduled time)
  if (currentTime < reminder.scheduled_time) {
    return { send: false, reason: 'Not time yet' };
  }

  // Check if habit was already completed today
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: todayLog } = await supabase
    .from('habit_logs')
    .select('status')
    .eq('habit_id', habit.id)
    .eq('completion_date', today)
    .eq('status', 'completed')
    .single();

  if (todayLog) {
    return { send: false, reason: 'Habit already completed today' };
  }

  // Check based on habit frequency
  const currentDate = new Date(today);
  const currentDay = currentDate.getDay(); // 0 = Sunday

  switch (habit.frequency) {
    case 'daily':
      return { send: true, reason: 'Daily reminder due' };

    case 'weekly':
      // Check if we need to reset for new week
      if (shouldResetForNewPeriod(reminder.last_sent_date, today, 'weekly', userTimezone)) {
        return { send: true, reason: 'New week - weekly reminder due' };
      }
      // Check if habit was completed this week
      const weekStart = getStartOfWeek(currentDate, userTimezone);
      const { data: weekLogs } = await supabase
        .from('habit_logs')
        .select('status')
        .eq('habit_id', habit.id)
        .gte('completion_date', weekStart)
        .eq('status', 'completed');
      
      if (!weekLogs || weekLogs.length === 0) {
        return { send: true, reason: 'Weekly habit not completed this week' };
      }
      return { send: false, reason: 'Weekly habit already completed this week' };

    case 'monthly':
      // Check if we need to reset for new month
      if (shouldResetForNewPeriod(reminder.last_sent_date, today, 'monthly', userTimezone)) {
        return { send: true, reason: 'New month - monthly reminder due' };
      }
      // Check if habit was completed this month
      const monthStart = getStartOfMonth(currentDate, userTimezone);
      const { data: monthLogs } = await supabase
        .from('habit_logs')
        .select('status')
        .eq('habit_id', habit.id)
        .gte('completion_date', monthStart)
        .eq('status', 'completed');
      
      if (!monthLogs || monthLogs.length === 0) {
        return { send: true, reason: 'Monthly habit not completed this month' };
      }
      return { send: false, reason: 'Monthly habit already completed this month' };

    case 'custom':
      // Check if today is a scheduled day
      if (!habit.frequency_days.includes(currentDay)) {
        return { send: false, reason: 'Not a scheduled day for custom habit' };
      }
      return { send: true, reason: 'Custom habit reminder due for scheduled day' };

    default:
      return { send: false, reason: 'Unknown frequency type' };
  }
}

/**
 * Check if we should reset reminders for a new period
 */
function shouldResetForNewPeriod(
  lastSentDate: string | null, 
  today: string, 
  frequency: string,
  userTimezone: string
): boolean {
  if (!lastSentDate) return true;

  const lastDate = new Date(lastSentDate);
  const currentDate = new Date(today);

  switch (frequency) {
    case 'weekly':
      // If we're in a new week
      const lastWeek = getWeekNumber(lastDate);
      const currentWeek = getWeekNumber(currentDate);
      return currentWeek > lastWeek;

    case 'monthly':
      // If we're in a new month
      return currentDate.getMonth() !== lastDate.getMonth() || 
             currentDate.getFullYear() !== lastDate.getFullYear();

    default:
      return false;
  }
}

/**
 * Get start of week in user's timezone (Monday = start)
 */
function getStartOfWeek(date: Date, timezone: string): string {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  start.setDate(diff);
  return formatDateInTimezone(start.toISOString(), timezone);
}

/**
 * Get start of month in user's timezone
 */
function getStartOfMonth(date: Date, timezone: string): string {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return formatDateInTimezone(start.toISOString(), timezone);
}

/**
 * Get week number for comparison
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Mark a habit as completed and update related reminders
 */
export async function markHabitCompleted(habitId: string, userTimezone: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const today = getTodayInTimezone(userTimezone);

  try {
    // Update reminders for this habit to mark as completed today
    await supabase
      .from('reminders')
      .update({ 
        last_sent_date: today, // Prevent sending again today
        updated_at: new Date().toISOString()
      })
      .eq('habit_id', habitId)
      .eq('is_active', true);

    return { success: true };
  } catch (error) {
    console.error('Error updating reminders for completed habit:', error);
    return { success: false, error: (error as Error).message };
  }
} 