import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let user: any;

  try {
    // Initialize Supabase client with error handling
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      console.error('Goal Stats API - Cookie access error:', {
        error: cookieError,
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
        console.error('Goal Stats API - Auth error:', {
          error: userError,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Goal Stats API - No user found:', {
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    } catch (authError) {
      console.error('Goal Stats API - Auth system error:', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Get all active user goals with proper error handling
    let goals;
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, target_value, current_value, deadline')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (goalsError) {
        console.error('Goal Stats API - Error fetching goals:', {
          error: goalsError,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Error fetching goals' }, { status: 500 });
      }

      goals = goalsData || [];
    } catch (dbError) {
      console.error('Goal Stats API - Database connection error fetching goals:', {
        error: dbError,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Return empty stats if no goals
    if (goals.length === 0) {
      console.log('Goal Stats API - No goals found:', {
        user_id: user.id,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ stats: [] });
    }

    const stats = [];
    const errors = []; // Track any individual goal processing errors

    for (const goal of goals) {
      try {
        // Calculate progress percentage with validation
        let progressPercentage = 0;
        try {
          if (goal.target_value && goal.target_value !== 0) {
            progressPercentage = Math.round((goal.current_value / goal.target_value) * 100 * 100) / 100;
            
            // Validate calculation result
            if (isNaN(progressPercentage) || !isFinite(progressPercentage)) {
              console.warn('Goal Stats API - Invalid progress calculation:', {
                goal_id: goal.id,
                target_value: goal.target_value,
                current_value: goal.current_value,
                result: progressPercentage,
                user_id: user.id,
                timestamp: new Date().toISOString(),
              });
              progressPercentage = 0;
            }
          }
        } catch (calcError) {
          console.error('Goal Stats API - Progress calculation error:', {
            error: calcError,
            goal_id: goal.id,
            user_id: user.id,
            timestamp: new Date().toISOString(),
          });
          progressPercentage = 0;
        }

        // Calculate days remaining with validation
        let daysRemaining = 0;
        try {
          if (goal.deadline) {
            const today = new Date();
            const deadline = new Date(goal.deadline);
            
            // Validate deadline date
            if (isNaN(deadline.getTime())) {
              console.warn('Goal Stats API - Invalid deadline date:', {
                goal_id: goal.id,
                deadline: goal.deadline,
                user_id: user.id,
                timestamp: new Date().toISOString(),
              });
            } else {
              daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            }
          }
        } catch (dateError) {
          console.error('Goal Stats API - Date calculation error:', {
            error: dateError,
            goal_id: goal.id,
            deadline: goal.deadline,
            user_id: user.id,
            timestamp: new Date().toISOString(),
          });
          daysRemaining = 0;
        }

        // Get milestone completion rate with error handling
        let milestoneCompletionRate = 0;
        try {
          const { data: milestones, error: milestonesError } = await supabase
            .from('goal_milestones')
            .select('id, is_completed')
            .eq('goal_id', goal.id);

          if (milestonesError) {
            console.warn('Goal Stats API - Error fetching milestones:', {
              error: milestonesError,
              goal_id: goal.id,
              user_id: user.id,
              timestamp: new Date().toISOString(),
            });
            errors.push(`Failed to fetch milestones for goal ${goal.id}`);
          } else if (milestones && milestones.length > 0) {
            const completedMilestones = milestones.filter(m => m.is_completed).length;
            milestoneCompletionRate = Math.round((completedMilestones / milestones.length) * 100 * 100) / 100;
            
            // Validate calculation
            if (isNaN(milestoneCompletionRate) || !isFinite(milestoneCompletionRate)) {
              console.warn('Goal Stats API - Invalid milestone calculation:', {
                goal_id: goal.id,
                completed: completedMilestones,
                total: milestones.length,
                result: milestoneCompletionRate,
                user_id: user.id,
                timestamp: new Date().toISOString(),
              });
              milestoneCompletionRate = 0;
            }
          }
        } catch (milestoneError) {
          console.error('Goal Stats API - Milestone processing error:', {
            error: milestoneError,
            goal_id: goal.id,
            user_id: user.id,
            timestamp: new Date().toISOString(),
          });
          errors.push(`Failed to process milestones for goal ${goal.id}`);
          milestoneCompletionRate = 0;
        }

        // Add validated stats for this goal
        stats.push({
          goal_id: goal.id,
          goal_title: goal.title,
          progress_percentage: progressPercentage,
          days_remaining: daysRemaining,
          milestone_completion_rate: milestoneCompletionRate
        });

      } catch (goalProcessingError) {
        console.error('Goal Stats API - Goal processing error:', {
          error: goalProcessingError,
          goal_id: goal.id,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        });
        errors.push(`Failed to process goal ${goal.id}`);
        
        // Add a placeholder entry with safe defaults
        stats.push({
          goal_id: goal.id,
          goal_title: goal.title || 'Unknown Goal',
          progress_percentage: 0,
          days_remaining: 0,
          milestone_completion_rate: 0
        });
      }
    }

    // Log any processing errors but still return results
    if (errors.length > 0) {
      console.warn('Goal Stats API - Some goals had processing errors:', {
        errors,
        successful_goals: stats.length,
        total_goals: goals.length,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful operation
    console.log('Goal Stats API - Success:', {
      user_id: user.id,
      goals_processed: stats.length,
      total_goals: goals.length,
      processing_errors: errors.length,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Goal Stats API - Unexpected error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      user_id: user?.id,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}