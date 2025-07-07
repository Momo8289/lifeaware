import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { formatDateInTimezone, daysDifferenceInTimezone } from '@/utils/timezone';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let habit_uuid: string | undefined;
  let user: any;
  let requestContext: any = {};

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
      const { habit_uuid: reqHabitUuid, timezone = 'UTC' } = requestBody;
      
      if (!reqHabitUuid) {
        console.warn('Habit Streak API - Missing habit_uuid:', {
          received: requestBody,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'habit_uuid is required' }, { status: 400 });
      }

      habit_uuid = reqHabitUuid;
      requestContext = { habit_uuid, timezone };
      
      // Validate timezone parameter
      if (timezone && typeof timezone !== 'string') {
        console.warn('Habit Streak API - Invalid timezone parameter:', {
          timezone,
          habit_uuid,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Invalid timezone parameter' }, { status: 400 });
      }
    } catch (parseError) {
      console.error('Habit Streak API - JSON parse error:', {
        error: parseError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Initialize Supabase client with error handling
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      console.error('Habit Streak API - Cookie access error:', {
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
        console.error('Habit Streak API - Auth error:', {
          error: userError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Habit Streak API - No user found:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
      requestContext.user_id = user.id;
    } catch (authError) {
      console.error('Habit Streak API - Auth system error:', {
        error: authError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Get habit details with proper error handling
    let habit;
    try {
      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('frequency, frequency_days, user_id')
        .eq('id', habit_uuid)
        .eq('user_id', user.id)
        .single();

      if (habitError) {
        if (habitError.code === 'PGRST116') {
          console.warn('Habit Streak API - Habit not found:', {
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }
        
        console.error('Habit Streak API - Database error fetching habit:', {
          error: habitError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Database error accessing habit' }, { status: 500 });
      }

      if (!habitData) {
        console.warn('Habit Streak API - Habit data is null:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
      }

      habit = habitData;
    } catch (dbError) {
      console.error('Habit Streak API - Database connection error:', {
        error: dbError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get the last completed log with error handling
    let lastLog;
    try {
      const { data: logData, error: logError } = await supabase
        .from('habit_logs')
        .select('completion_date')
        .eq('habit_id', habit_uuid)
        .eq('status', 'completed')
        .order('completion_date', { ascending: false })
        .limit(1)
        .single();

      if (logError && logError.code !== 'PGRST116') {
        console.error('Habit Streak API - Error fetching habit logs:', {
          error: logError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Error fetching habit logs' }, { status: 500 });
      }

      lastLog = logData;
    } catch (logError) {
      console.error('Habit Streak API - Database error fetching logs:', {
        error: logError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database error fetching logs' }, { status: 500 });
    }

    // If no completed logs, return 0
    if (!lastLog) {
      console.log('Habit Streak API - No completed logs found:', {
        ...requestContext,
        streak: 0,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ streak: 0 });
    }

    // Calculate streak based on habit frequency
    let streak = 0;
    
    try {
      const lastCompletedDate = new Date(lastLog.completion_date);
      const currentDate = new Date();
      
      // Validate dates
      if (isNaN(lastCompletedDate.getTime())) {
        console.error('Habit Streak API - Invalid last completed date:', {
          last_completed_date: lastLog.completion_date,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ streak: 0 });
      }

      let daysDiff;
      try {
        daysDiff = daysDifferenceInTimezone(currentDate, lastCompletedDate, requestContext.timezone);
      } catch (timezoneError) {
        console.error('Habit Streak API - Timezone calculation error:', {
          error: timezoneError,
          current_date: currentDate.toISOString(),
          last_completed: lastCompletedDate.toISOString(),
          timezone: requestContext.timezone,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        // Fall back to simple date difference
        daysDiff = Math.floor((currentDate.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (habit.frequency === 'daily') {
        // For daily habits, streak is broken if there's a gap of more than 1 day
        if (daysDiff <= 1) {
          try {
            // Count consecutive days from the last completed date backwards
            const { data: logs, error: logsError } = await supabase
              .from('habit_logs')
              .select('completion_date')
              .eq('habit_id', habit_uuid)
              .eq('status', 'completed')
              .order('completion_date', { ascending: false })
              .limit(30); // Limit to last 30 days for performance

            if (logsError) {
              console.error('Habit Streak API - Error fetching daily streak logs:', {
                error: logsError,
                ...requestContext,
                timestamp: new Date().toISOString(),
              });
              return NextResponse.json({ error: 'Error calculating streak' }, { status: 500 });
            }

            if (logs && logs.length > 0) {
              // Convert all dates to user's timezone for comparison
              const sortedDates = logs
                .map(log => {
                  try {
                    return formatDateInTimezone(log.completion_date, requestContext.timezone);
                  } catch (formatError) {
                    console.warn('Habit Streak API - Date formatting error:', {
                      error: formatError,
                      date: log.completion_date,
                      timezone: requestContext.timezone,
                      ...requestContext,
                      timestamp: new Date().toISOString(),
                    });
                    return log.completion_date; // Fallback to original date
                  }
                })
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              
              streak = 1; // Start with the last completed day
              for (let i = 1; i < sortedDates.length; i++) {
                const prevDate = new Date(sortedDates[i - 1]);
                const currDate = new Date(sortedDates[i]);
                
                if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) {
                  console.warn('Habit Streak API - Invalid date in daily streak calculation:', {
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
                  streak++;
                } else {
                  break;
                }
              }
            }
          } catch (dailyStreakError) {
            console.error('Habit Streak API - Daily streak calculation error:', {
              error: dailyStreakError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            streak = 0;
          }
        }
      } else if (habit.frequency === 'weekly') {
        // For weekly habits, check if completed in current or previous week
        try {
          const currentWeek = getWeekNumber(currentDate, requestContext.timezone);
          const lastCompletedWeek = getWeekNumber(lastCompletedDate, requestContext.timezone);
          
          if (currentWeek - lastCompletedWeek <= 1) {
            // Count consecutive weeks with completions
            const { data: logs, error: logsError } = await supabase
              .from('habit_logs')
              .select('completion_date')
              .eq('habit_id', habit_uuid)
              .eq('status', 'completed')
              .order('completion_date', { ascending: false })
              .limit(70); // Limit to last 10 weeks for performance

            if (logsError) {
              console.error('Habit Streak API - Error fetching weekly streak logs:', {
                error: logsError,
                ...requestContext,
                timestamp: new Date().toISOString(),
              });
              return NextResponse.json({ error: 'Error calculating streak' }, { status: 500 });
            }

            if (logs && logs.length > 0) {
              const weeklyCompletions = new Set<number>();
              logs.forEach(log => {
                try {
                  const week = getWeekNumber(new Date(log.completion_date), requestContext.timezone);
                  weeklyCompletions.add(week);
                } catch (weekError) {
                  console.warn('Habit Streak API - Week calculation error:', {
                    error: weekError,
                    date: log.completion_date,
                    timezone: requestContext.timezone,
                    ...requestContext,
                    timestamp: new Date().toISOString(),
                  });
                }
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
        } catch (weeklyStreakError) {
          console.error('Habit Streak API - Weekly streak calculation error:', {
            error: weeklyStreakError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          streak = 0;
        }
      } else {
        // For custom frequency, simplified logic
        try {
          if (daysDiff <= 7) {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let thirtyDaysAgoInTimezone;
            
            try {
              thirtyDaysAgoInTimezone = formatDateInTimezone(thirtyDaysAgo.toISOString(), requestContext.timezone);
            } catch (timezoneError) {
              console.warn('Habit Streak API - Timezone formatting error for custom frequency:', {
                error: timezoneError,
                date: thirtyDaysAgo.toISOString(),
                timezone: requestContext.timezone,
                ...requestContext,
                timestamp: new Date().toISOString(),
              });
              thirtyDaysAgoInTimezone = thirtyDaysAgo.toISOString().split('T')[0];
            }
            
            const { data: logs, error: logsError } = await supabase
              .from('habit_logs')
              .select('completion_date')
              .eq('habit_id', habit_uuid)
              .eq('status', 'completed')
              .gte('completion_date', thirtyDaysAgoInTimezone);

            if (logsError) {
              console.error('Habit Streak API - Error fetching custom frequency logs:', {
                error: logsError,
                ...requestContext,
                timestamp: new Date().toISOString(),
              });
              return NextResponse.json({ error: 'Error calculating streak' }, { status: 500 });
            }

            if (logs) {
              streak = logs.length;
            }
          }
        } catch (customStreakError) {
          console.error('Habit Streak API - Custom frequency streak calculation error:', {
            error: customStreakError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          streak = 0;
        }
      }
    } catch (streakCalculationError) {
      console.error('Habit Streak API - Streak calculation error:', {
        error: streakCalculationError,
        habit_frequency: habit.frequency,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      streak = 0;
    }

    // Log successful operation
    console.log('Habit Streak API - Success:', {
      streak,
      habit_frequency: habit.frequency,
      ...requestContext,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ streak });

  } catch (error) {
    console.error('Habit Streak API - Unexpected error:', {
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

function getWeekNumber(date: Date, timezone: string): number {
  try {
    // Get the date in the user's timezone
    const dateInTimezone = formatDateInTimezone(date.toISOString(), timezone);
    const d = new Date(dateInTimezone + 'T00:00:00Z');
    
    if (isNaN(d.getTime())) {
      console.warn('getWeekNumber - Invalid date after timezone conversion:', {
        original_date: date.toISOString(),
        timezone,
        converted_date: dateInTimezone,
        timestamp: new Date().toISOString(),
      });
      // Fallback to original date
      const fallbackD = new Date(date);
      const dayNum = fallbackD.getUTCDay() || 7;
      fallbackD.setUTCDate(fallbackD.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(fallbackD.getUTCFullYear(), 0, 1));
      return Math.ceil((((fallbackD.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
    
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  } catch (error) {
    console.error('getWeekNumber - Calculation error:', {
      error,
      date: date.toISOString(),
      timezone,
      timestamp: new Date().toISOString(),
    });
    // Return current week as fallback
    const now = new Date();
    const dayNum = now.getUTCDay() || 7;
    now.setUTCDate(now.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return Math.ceil((((now.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}