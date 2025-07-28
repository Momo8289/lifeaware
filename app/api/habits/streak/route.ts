import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { formatDateInTimezone, daysDifferenceInTimezone } from 'utils/timezone';

export async function POST(request: NextRequest) {
  try {
    const { habit_uuid, timezone = 'UTC' } = await request.json();

    if (!habit_uuid) {
      return NextResponse.json({ error: 'habit_uuid is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get habit details
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('frequency, frequency_days, user_id')
      .eq('id', habit_uuid)
      .eq('user_id', user.id)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Get the last completed log
    const { data: lastLog, error: logError } = await supabase
      .from('habit_logs')
      .select('completion_date')
      .eq('habit_id', habit_uuid)
      .eq('status', 'completed')
      .order('completion_date', { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Error fetching habit logs' }, { status: 500 });
    }

    // If no completed logs, return 0
    if (!lastLog) {
      return NextResponse.json({ streak: 0 });
    }

    const lastCompletedDate = new Date(lastLog.completion_date);
    const currentDate = new Date();
    const daysDiff = daysDifferenceInTimezone(currentDate, lastCompletedDate, timezone);

    let streak = 0;

    if (habit.frequency === 'daily') {
      // For daily habits, streak is broken if there's a gap of more than 1 day in user's timezone
      if (daysDiff <= 1) {
        // Count consecutive days from the last completed date backwards
        const { data: logs, error: logsError } = await supabase
          .from('habit_logs')
          .select('completion_date')
          .eq('habit_id', habit_uuid)
          .eq('status', 'completed')
          .order('completion_date', { ascending: false })
          .limit(30); // Limit to last 30 days for performance

        if (!logsError && logs) {
          // Convert all dates to user's timezone for comparison
          const sortedDates = logs
            .map(log => formatDateInTimezone(log.completion_date, timezone))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          streak = 1; // Start with the last completed day
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diff === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    } else if (habit.frequency === 'weekly') {
      // For weekly habits, check if completed in current or previous week
      const currentWeek = getWeekNumber(currentDate, timezone);
      const lastCompletedWeek = getWeekNumber(lastCompletedDate, timezone);
      
      if (currentWeek - lastCompletedWeek <= 1) {
        // Count consecutive weeks with completions
        const { data: logs, error: logsError } = await supabase
          .from('habit_logs')
          .select('completion_date')
          .eq('habit_id', habit_uuid)
          .eq('status', 'completed')
          .order('completion_date', { ascending: false })
          .limit(70); // Limit to last 10 weeks for performance

        if (!logsError && logs) {
          const weeklyCompletions = new Set<number>();
          logs.forEach(log => {
            const week = getWeekNumber(new Date(log.completion_date), timezone);
            weeklyCompletions.add(week);
          });

          const sortedWeeks = Array.from(weeklyCompletions).sort((a: number, b: number) => b - a);
          streak = 1; // Start with the last completed week
          
          for (let i = 1; i < sortedWeeks.length; i++) {
            if ((sortedWeeks[i - 1] as number) - (sortedWeeks[i] as number) === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    } else {
      // For custom frequency, simplified logic
      if (daysDiff <= 7) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoInTimezone = formatDateInTimezone(thirtyDaysAgo.toISOString(), timezone);
        
        const { data: logs, error: logsError } = await supabase
          .from('habit_logs')
          .select('completion_date')
          .eq('habit_id', habit_uuid)
          .eq('status', 'completed')
          .gte('completion_date', thirtyDaysAgoInTimezone);

        if (!logsError && logs) {
          streak = logs.length;
        }
      }
    }

    return NextResponse.json({ streak });
  } catch (error) {
    console.error('Error calculating habit streak:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getWeekNumber(date: Date, timezone: string): number {
  // Get the date in the user's timezone
  const dateInTimezone = formatDateInTimezone(date.toISOString(), timezone);
  const d = new Date(dateInTimezone + 'T00:00:00Z');
  
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
} 