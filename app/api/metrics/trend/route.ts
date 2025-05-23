import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { metric_template_id, days_back = 7 } = await request.json();

    if (!metric_template_id) {
      return NextResponse.json({ error: 'metric_template_id is required' }, { status: 400 });
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

    // Get metric template details
    const { data: metricTemplate, error: templateError } = await supabase
      .from('metric_templates')
      .select('value_type, user_id')
      .eq('id', metric_template_id)
      .eq('user_id', user.id)
      .single();

    if (templateError || !metricTemplate) {
      return NextResponse.json({ error: 'Metric template not found' }, { status: 404 });
    }

    const currentEndDate = new Date();
    const currentStartDate = new Date(currentEndDate.getTime() - days_back * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(previousEndDate.getTime() - days_back * 24 * 60 * 60 * 1000);

    let currentAvg: number | null = null;
    let previousAvg: number | null = null;

    if (metricTemplate.value_type === 'number') {
      // Get current period average
      const { data: currentLogs, error: currentError } = await supabase
        .from('metric_logs')
        .select('value_numeric')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', currentStartDate.toISOString())
        .lte('measurement_date', currentEndDate.toISOString())
        .not('value_numeric', 'is', null);

      if (!currentError && currentLogs && currentLogs.length > 0) {
        const sum = currentLogs.reduce((acc, log) => acc + (log.value_numeric || 0), 0);
        currentAvg = sum / currentLogs.length;
      }

      // Get previous period average
      const { data: previousLogs, error: previousError } = await supabase
        .from('metric_logs')
        .select('value_numeric')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', previousStartDate.toISOString())
        .lte('measurement_date', previousEndDate.toISOString())
        .not('value_numeric', 'is', null);

      if (!previousError && previousLogs && previousLogs.length > 0) {
        const sum = previousLogs.reduce((acc, log) => acc + (log.value_numeric || 0), 0);
        previousAvg = sum / previousLogs.length;
      }

    } else if (metricTemplate.value_type === 'bloodpressure') {
      // For blood pressure, use systolic as the main indicator
      const { data: currentLogs, error: currentError } = await supabase
        .from('metric_logs')
        .select('value_systolic')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', currentStartDate.toISOString())
        .lte('measurement_date', currentEndDate.toISOString())
        .not('value_systolic', 'is', null);

      if (!currentError && currentLogs && currentLogs.length > 0) {
        const sum = currentLogs.reduce((acc, log) => acc + (log.value_systolic || 0), 0);
        currentAvg = sum / currentLogs.length;
      }

      const { data: previousLogs, error: previousError } = await supabase
        .from('metric_logs')
        .select('value_systolic')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', previousStartDate.toISOString())
        .lte('measurement_date', previousEndDate.toISOString())
        .not('value_systolic', 'is', null);

      if (!previousError && previousLogs && previousLogs.length > 0) {
        const sum = previousLogs.reduce((acc, log) => acc + (log.value_systolic || 0), 0);
        previousAvg = sum / previousLogs.length;
      }

    } else if (metricTemplate.value_type === 'bloodsugar') {
      const { data: currentLogs, error: currentError } = await supabase
        .from('metric_logs')
        .select('value_bloodsugar')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', currentStartDate.toISOString())
        .lte('measurement_date', currentEndDate.toISOString())
        .not('value_bloodsugar', 'is', null);

      if (!currentError && currentLogs && currentLogs.length > 0) {
        const sum = currentLogs.reduce((acc, log) => acc + (log.value_bloodsugar || 0), 0);
        currentAvg = sum / currentLogs.length;
      }

      const { data: previousLogs, error: previousError } = await supabase
        .from('metric_logs')
        .select('value_bloodsugar')
        .eq('metric_template_id', metric_template_id)
        .gte('measurement_date', previousStartDate.toISOString())
        .lte('measurement_date', previousEndDate.toISOString())
        .not('value_bloodsugar', 'is', null);

      if (!previousError && previousLogs && previousLogs.length > 0) {
        const sum = previousLogs.reduce((acc, log) => acc + (log.value_bloodsugar || 0), 0);
        previousAvg = sum / previousLogs.length;
      }
    }

    // Determine trend
    const threshold = 0.01; // 1% threshold for determining if value is steady
    let trend = 'unknown';

    if (currentAvg !== null && previousAvg !== null && previousAvg !== 0) {
      const percentageChange = Math.abs(currentAvg - previousAvg) / previousAvg;
      
      if (percentageChange <= threshold) {
        trend = 'steady';
      } else if (currentAvg > previousAvg) {
        trend = 'increase';
      } else {
        trend = 'decrease';
      }
    }

    return NextResponse.json({ trend });
  } catch (error) {
    console.error('Error calculating metric trend:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 