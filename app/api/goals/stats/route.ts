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

    // Get all active user goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, target_value, current_value, deadline')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (goalsError) {
      return NextResponse.json({ error: 'Error fetching goals' }, { status: 500 });
    }

    if (!goals || goals.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    const stats = [];

    for (const goal of goals) {
      // Calculate progress percentage
      let progressPercentage = 0;
      if (goal.target_value && goal.target_value !== 0) {
        progressPercentage = Math.round((goal.current_value / goal.target_value) * 100 * 100) / 100;
      }

      // Calculate days remaining
      const today = new Date();
      const deadline = new Date(goal.deadline);
      const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

      // Get milestone completion rate
      const { data: milestones, error: milestonesError } = await supabase
        .from('goal_milestones')
        .select('id, is_completed')
        .eq('goal_id', goal.id);

      let milestoneCompletionRate = 0;
      if (!milestonesError && milestones && milestones.length > 0) {
        const completedMilestones = milestones.filter(m => m.is_completed).length;
        milestoneCompletionRate = Math.round((completedMilestones / milestones.length) * 100 * 100) / 100;
      }

      stats.push({
        goal_id: goal.id,
        goal_title: goal.title,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        milestone_completion_rate: milestoneCompletionRate
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error calculating goal stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 