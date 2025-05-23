import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { goal_uuid } = await request.json();

    if (!goal_uuid) {
      return NextResponse.json({ error: 'goal_uuid is required' }, { status: 400 });
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

    // Get goal details
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('target_value, current_value, user_id')
      .eq('id', goal_uuid)
      .eq('user_id', user.id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Calculate progress percentage
    let progressPercentage = 0;
    if (goal.target_value && goal.target_value !== 0) {
      progressPercentage = Math.round((goal.current_value / goal.target_value) * 100 * 100) / 100; // Round to 2 decimal places
    }

    return NextResponse.json({ progress_percentage: progressPercentage });
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 