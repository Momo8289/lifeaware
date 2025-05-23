import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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

    // Get all user habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, frequency')
      .eq('user_id', user.id);

    if (habitsError) {
      return NextResponse.json({ error: 'Error fetching habits' }, { status: 500 });
    }

    if (!habits || habits.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    const stats = [];

    for (const habit of habits) {
      // Get all logs for this habit
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('completion_date, status')
        .eq('habit_id', habit.id)
        .order('completion_date', { ascending: false });

      if (logsError) {
        console.error(`Error fetching logs for habit ${habit.id}:`, logsError);
        continue;
      }

      const completedLogs = logs?.filter(log => log.status === 'completed') || [];
      const totalLogs = logs?.length || 0;
      const totalCompletions = completedLogs.length;

      // Calculate completion rate
      const completionRate = totalLogs > 0 ? Math.round((totalCompletions / totalLogs) * 100 * 100) / 100 : 0;

      // Calculate current streak (simplified version)
      let currentStreak = 0;
      if (completedLogs.length > 0) {
        const sortedDates = completedLogs
          .map(log => new Date(log.completion_date))
          .sort((a, b) => b.getTime() - a.getTime());

        const today = new Date();
        const lastCompleted = sortedDates[0];
        const daysDiff = Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 1) {
          currentStreak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = sortedDates[i - 1];
            const currDate = sortedDates[i];
            const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diff === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      // Calculate longest streak (simplified)
      let longestStreak = 0;
      if (completedLogs.length > 0) {
        const sortedDates = completedLogs
          .map(log => new Date(log.completion_date))
          .sort((a, b) => a.getTime() - b.getTime());

        let tempStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = sortedDates[i - 1];
          const currDate = sortedDates[i];
          const diff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      stats.push({
        habit_id: habit.id,
        habit_name: habit.name,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        completion_rate: completionRate,
        total_completions: totalCompletions,
        total_days: totalLogs
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error calculating habit stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 