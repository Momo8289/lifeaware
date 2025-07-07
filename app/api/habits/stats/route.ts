import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { formatDateInTimezone, daysDifferenceInTimezone } from '@/utils/timezone';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let user: any;
  let requestContext: any = {};

  try {
    // Parse query parameters with validation
    let url;
    try {
      url = new URL(request.url);
      const timezone = url.searchParams.get('timezone') || 'UTC';
      const habitId = url.searchParams.get('habit_id');
      
      requestContext = { timezone, habit_id: habitId };
      
      // Validate timezone parameter
      if (timezone && typeof timezone !== 'string') {
        console.warn('Habit Stats API - Invalid timezone parameter:', {
          timezone,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Invalid timezone parameter' }, { status: 400 });
      }
    } catch (urlError) {
      console.error('Habit Stats API - URL parsing error:', {
        error: urlError,
        url: request.url,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 });
    }

    // Initialize Supabase client with error handling
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      console.error('Habit Stats API - Cookie access error:', {
        error: cookieError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Session error' }, { status: 500 });
    }

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

    // Get and validate user
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Habit Stats API - Auth error:', {
          error: userError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Habit Stats API - No user found:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
      requestContext.user_id = user.id;
    } catch (authError) {
      console.error('Habit Stats API - Auth system error:', {
        error: authError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Get habits with proper error handling
    let habits;
    try {
      let habitsQuery = supabase
        .from('habits')
        .select('id, name, frequency')
        .eq('user_id', user.id);
      
      if (requestContext.habit_id) {
        habitsQuery = habitsQuery.eq('id', requestContext.habit_id);
      }

      const { data: habitsData, error: habitsError } = await habitsQuery;

      if (habitsError) {
        console.error('Habit Stats API - Error fetching habits:', {
          error: habitsError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Error fetching habits' }, { status: 500 });
      }

      habits = habitsData || [];
    } catch (dbError) {
      console.error('Habit Stats API - Database connection error fetching habits:', {
        error: dbError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Return empty results if no habits found
    if (habits.length === 0) {
      const message = requestContext.habit_id ? 'Habit not found' : 'No habits found';
      console.log('Habit Stats API - No habits found:', {
        ...requestContext,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ habits: [] });
    }

    const stats = [];
    const errors = []; // Track any individual habit processing errors

    for (const habit of habits) {
      try {
        // Get habit logs with error handling
        let logs;
        try {
          const { data: logsData, error: logsError } = await supabase
            .from('habit_logs')
            .select('completion_date, status')
            .eq('habit_id', habit.id)
            .order('completion_date', { ascending: false });

          if (logsError) {
            console.error('Habit Stats API - Error fetching logs:', {
              error: logsError,
              habit_id: habit.id,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            errors.push(`Failed to fetch logs for habit ${habit.id}`);
            continue; // Skip this habit
          }

          logs = logsData || [];
        } catch (logError) {
          console.error('Habit Stats API - Database error fetching logs:', {
            error: logError,
            habit_id: habit.id,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          errors.push(`Database error for habit ${habit.id}`);
          continue; // Skip this habit
        }

        // Process logs with error handling
        let completedLogs, totalLogs, totalCompletions, completionRate;
        try {
          completedLogs = logs.filter(log => log.status === 'completed');
          totalLogs = logs.length;
          totalCompletions = completedLogs.length;

          // Calculate completion rate with validation
          completionRate = totalLogs > 0 ? Math.round((totalCompletions / totalLogs) * 100 * 100) / 100 : 0;
          
          if (isNaN(completionRate) || !isFinite(completionRate)) {
            console.warn('Habit Stats API - Invalid completion rate calculation:', {
              habit_id: habit.id,
              total_completions: totalCompletions,
              total_logs: totalLogs,
              result: completionRate,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            completionRate = 0;
          }
        } catch (processError) {
          console.error('Habit Stats API - Log processing error:', {
            error: processError,
            habit_id: habit.id,
            logs_count: logs?.length,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          completedLogs = [];
          totalLogs = 0;
          totalCompletions = 0;
          completionRate = 0;
        }

        // Calculate current streak with timezone awareness and error handling
        let currentStreak = 0;
        try {
          if (completedLogs.length > 0) {
            // Validate timezone utilities
            const sortedDates = completedLogs
              .map(log => {
                try {
                  return formatDateInTimezone(log.completion_date, requestContext.timezone);
                } catch (timezoneError) {
                  console.warn('Habit Stats API - Timezone formatting error:', {
                    error: timezoneError,
                    habit_id: habit.id,
                    date: log.completion_date,
                    timezone: requestContext.timezone,
                    ...requestContext,
                    timestamp: new Date().toISOString(),
                  });
                  return log.completion_date; // Fallback to original date
                }
              })
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

            const today = new Date();
            const lastCompleted = new Date(sortedDates[0]);
            
            if (isNaN(lastCompleted.getTime())) {
              console.warn('Habit Stats API - Invalid last completed date:', {
                habit_id: habit.id,
                last_date: sortedDates[0],
                ...requestContext,
                timestamp: new Date().toISOString(),
              });
            } else {
              const daysDiff = daysDifferenceInTimezone(today, lastCompleted, requestContext.timezone);

              if (daysDiff <= 1) {
                currentStreak = 1;
                for (let i = 1; i < sortedDates.length; i++) {
                  const prevDate = new Date(sortedDates[i - 1]);
                  const currDate = new Date(sortedDates[i]);
                  
                  if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) {
                    console.warn('Habit Stats API - Invalid date in streak calculation:', {
                      habit_id: habit.id,
                      prev_date: sortedDates[i - 1],
                      curr_date: sortedDates[i],
                      index: i,
                      ...requestContext,
                      timestamp: new Date().toISOString(),
                    });
                    break;
                  }
                  
                  const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (diff === 1) {
                    currentStreak++;
                  } else {
                    break;
                  }
                }
              }
            }
          }
        } catch (streakError) {
          console.error('Habit Stats API - Current streak calculation error:', {
            error: streakError,
            habit_id: habit.id,
            completed_logs_count: completedLogs?.length,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          currentStreak = 0;
        }

        // Calculate longest streak with error handling
        let longestStreak = 0;
        try {
          if (completedLogs.length > 0) {
            const sortedDates = completedLogs
              .map(log => {
                try {
                  return formatDateInTimezone(log.completion_date, requestContext.timezone);
                } catch (timezoneError) {
                  console.warn('Habit Stats API - Timezone formatting error in longest streak:', {
                    error: timezoneError,
                    habit_id: habit.id,
                    date: log.completion_date,
                    ...requestContext,
                    timestamp: new Date().toISOString(),
                  });
                  return log.completion_date;
                }
              })
              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            let tempStreak = 1;
            for (let i = 1; i < sortedDates.length; i++) {
              const prevDate = new Date(sortedDates[i - 1]);
              const currDate = new Date(sortedDates[i]);
              
              if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) {
                console.warn('Habit Stats API - Invalid date in longest streak calculation:', {
                  habit_id: habit.id,
                  prev_date: sortedDates[i - 1],
                  curr_date: sortedDates[i],
                  index: i,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                continue;
              }
              
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
        } catch (longestStreakError) {
          console.error('Habit Stats API - Longest streak calculation error:', {
            error: longestStreakError,
            habit_id: habit.id,
            completed_logs_count: completedLogs?.length,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          longestStreak = 0;
        }

        // Add validated stats for this habit
        stats.push({
          habit_id: habit.id,
          habit_name: habit.name,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          completion_rate: completionRate,
          total_completions: totalCompletions,
          total_days: totalLogs
        });

      } catch (habitProcessingError) {
        console.error('Habit Stats API - Habit processing error:', {
          error: habitProcessingError,
          habit_id: habit.id,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        errors.push(`Failed to process habit ${habit.id}`);
        
        // Add a placeholder entry with safe defaults
        stats.push({
          habit_id: habit.id,
          habit_name: habit.name || 'Unknown Habit',
          current_streak: 0,
          longest_streak: 0,
          completion_rate: 0,
          total_completions: 0,
          total_days: 0
        });
      }
    }

    // Log any processing errors but still return results
    if (errors.length > 0) {
      console.warn('Habit Stats API - Some habits had processing errors:', {
        errors,
        successful_habits: stats.length,
        total_habits: habits.length,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful operation
    console.log('Habit Stats API - Success:', {
      habits_processed: stats.length,
      total_habits: habits.length,
      processing_errors: errors.length,
      ...requestContext,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ habits: stats });

  } catch (error) {
    console.error('Habit Stats API - Unexpected error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...requestContext,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}