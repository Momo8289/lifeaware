import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getTodayInTimezone } from '@/utils/timezone';

export async function POST(request: NextRequest) {
  try {
    const { habit_id, status, timezone = 'UTC' } = await request.json();

    if (!habit_id || !status) {
      return NextResponse.json({ error: 'habit_id and status are required' }, { status: 400 });
    }

    if (status !== 'completed') {
      return NextResponse.json({ error: 'Only completed status is supported' }, { status: 400 });
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

    // Verify habit belongs to user
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, user_id, frequency')
      .eq('id', habit_id)
      .eq('user_id', user.id)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Get today's date in user's timezone
    const today = getTodayInTimezone(timezone);
    
    // Check if a log already exists for today
    const { data: existingLog, error: checkError } = await supabase
      .from('habit_logs')
      .select('id, status')
      .eq('habit_id', habit_id)
      .eq('completion_date', today)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      return NextResponse.json({ error: 'Error checking existing logs' }, { status: 500 });
    }

    let result;
    let isToggleOff = false;
    let wasCompleted = false;

    if (existingLog) {
      // If clicking the same status, toggle it off (delete the log)
      if (existingLog.status === status) {
        result = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', existingLog.id);
        isToggleOff = true;
        wasCompleted = false;
      } else {
        // Update existing log with new status
        result = await supabase
          .from('habit_logs')
          .update({ 
            status, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingLog.id);
        wasCompleted = true;
      }
    } else {
      // Insert new log
      result = await supabase
        .from('habit_logs')
        .insert({
          habit_id,
          completion_date: today,
          status
        });
      wasCompleted = true;
    }

    if (result.error) {
      return NextResponse.json({ error: 'Failed to update habit status' }, { status: 500 });
    }

    // Update related reminders based on habit completion
    try {
      if (wasCompleted) {
        // Mark any active reminders for this habit as completed
        await supabase
          .from('reminders')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('habit_id', habit_id)
          .eq('status', 'active');
      } else if (isToggleOff) {
        // If habit was uncompleted, reactivate any completed reminders for today
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        await supabase
          .from('reminders')
          .update({ 
            status: 'active',
            completed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('habit_id', habit_id)
          .eq('status', 'completed')
          .gte('completed_at', startOfDay.toISOString())
          .lte('completed_at', endOfDay.toISOString());
      }
    } catch (error) {
      console.error('Failed to update reminders for habit completion:', error);
      console.error('Failed to update reminders:', error);
    }

    return NextResponse.json({ 
      success: true, 
      action: isToggleOff ? 'removed' : 'completed',
      date: today,
      reminder_updated: true
    });

  } catch (error) {
    console.error('Error updating habit completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 