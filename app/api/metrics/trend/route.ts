import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let metric_template_id: string | undefined;
  let user: any;
  let requestContext: any = {};

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
      const { metric_template_id: reqMetricId, days_back = 7 } = requestBody;
      
      if (!reqMetricId) {
        console.warn('Metric Trend API - Missing metric_template_id:', {
          received: requestBody,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'metric_template_id is required' }, { status: 400 });
      }

      // Validate days_back parameter
      if (days_back && (typeof days_back !== 'number' || days_back < 1 || days_back > 365)) {
        console.warn('Metric Trend API - Invalid days_back parameter:', {
          days_back,
          metric_template_id: reqMetricId,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'days_back must be a number between 1 and 365' }, { status: 400 });
      }

      metric_template_id = reqMetricId;
      requestContext = { metric_template_id, days_back };
    } catch (parseError) {
      console.error('Metric Trend API - JSON parse error:', {
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
      console.error('Metric Trend API - Cookie access error:', {
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
        console.error('Metric Trend API - Auth error:', {
          error: userError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Metric Trend API - No user found:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
      requestContext.user_id = user.id;
    } catch (authError) {
      console.error('Metric Trend API - Auth system error:', {
        error: authError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Get metric template details with proper error handling
    let metricTemplate;
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('metric_templates')
        .select('value_type, user_id')
        .eq('id', metric_template_id)
        .eq('user_id', user.id)
        .single();

      if (templateError) {
        if (templateError.code === 'PGRST116') {
          console.warn('Metric Trend API - Metric template not found:', {
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          return NextResponse.json({ error: 'Metric template not found' }, { status: 404 });
        }
        
        console.error('Metric Trend API - Database error fetching template:', {
          error: templateError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Database error accessing metric template' }, { status: 500 });
      }

      if (!templateData) {
        console.warn('Metric Trend API - Template data is null:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Metric template not found' }, { status: 404 });
      }

      metricTemplate = templateData;
      requestContext.value_type = metricTemplate.value_type;
    } catch (dbError) {
      console.error('Metric Trend API - Database connection error:', {
        error: dbError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Calculate date ranges with validation
    let currentEndDate, currentStartDate, previousEndDate, previousStartDate;
    try {
      currentEndDate = new Date();
      currentStartDate = new Date(currentEndDate.getTime() - requestContext.days_back * 24 * 60 * 60 * 1000);
      previousEndDate = new Date(currentStartDate);
      previousStartDate = new Date(previousEndDate.getTime() - requestContext.days_back * 24 * 60 * 60 * 1000);

      // Validate calculated dates
      if (isNaN(currentEndDate.getTime()) || isNaN(currentStartDate.getTime()) || 
          isNaN(previousEndDate.getTime()) || isNaN(previousStartDate.getTime())) {
        console.error('Metric Trend API - Invalid date calculation:', {
          current_end: currentEndDate.toISOString(),
          current_start: currentStartDate.toISOString(),
          previous_end: previousEndDate.toISOString(),
          previous_start: previousStartDate.toISOString(),
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Date calculation error' }, { status: 500 });
      }

      requestContext.date_ranges = {
        current_start: currentStartDate.toISOString(),
        current_end: currentEndDate.toISOString(),
        previous_start: previousStartDate.toISOString(),
        previous_end: previousEndDate.toISOString(),
      };
    } catch (dateError) {
      console.error('Metric Trend API - Date range calculation error:', {
        error: dateError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Date calculation error' }, { status: 500 });
    }

    let currentAvg: number | null = null;
    let previousAvg: number | null = null;

    // Process different value types with specific error handling
    try {
      if (metricTemplate.value_type === 'number') {
        // Get current period average
        try {
          const { data: currentLogs, error: currentError } = await supabase
            .from('metric_logs')
            .select('value_numeric')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', currentStartDate.toISOString())
            .lte('measurement_date', currentEndDate.toISOString())
            .not('value_numeric', 'is', null);

          if (currentError) {
            console.error('Metric Trend API - Error fetching current period numeric data:', {
              error: currentError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            return NextResponse.json({ error: 'Error fetching current period data' }, { status: 500 });
          }

          if (currentLogs && currentLogs.length > 0) {
            const validLogs = currentLogs.filter(log => 
              log.value_numeric !== null && 
              typeof log.value_numeric === 'number' && 
              isFinite(log.value_numeric)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_numeric, 0);
              currentAvg = sum / validLogs.length;
              
              if (!isFinite(currentAvg)) {
                console.warn('Metric Trend API - Invalid current average calculation:', {
                  sum,
                  count: validLogs.length,
                  result: currentAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                currentAvg = null;
              }
            }
          }
        } catch (currentPeriodError) {
          console.error('Metric Trend API - Current period calculation error:', {
            error: currentPeriodError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          currentAvg = null;
        }

        // Get previous period average
        try {
          const { data: previousLogs, error: previousError } = await supabase
            .from('metric_logs')
            .select('value_numeric')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', previousStartDate.toISOString())
            .lte('measurement_date', previousEndDate.toISOString())
            .not('value_numeric', 'is', null);

          if (previousError) {
            console.error('Metric Trend API - Error fetching previous period numeric data:', {
              error: previousError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            // Don't return error here, continue with null previous value
          } else if (previousLogs && previousLogs.length > 0) {
            const validLogs = previousLogs.filter(log => 
              log.value_numeric !== null && 
              typeof log.value_numeric === 'number' && 
              isFinite(log.value_numeric)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_numeric, 0);
              previousAvg = sum / validLogs.length;
              
              if (!isFinite(previousAvg)) {
                console.warn('Metric Trend API - Invalid previous average calculation:', {
                  sum,
                  count: validLogs.length,
                  result: previousAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                previousAvg = null;
              }
            }
          }
        } catch (previousPeriodError) {
          console.error('Metric Trend API - Previous period calculation error:', {
            error: previousPeriodError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          previousAvg = null;
        }

      } else if (metricTemplate.value_type === 'bloodpressure') {
        // For blood pressure, use systolic as the main indicator
        try {
          const { data: currentLogs, error: currentError } = await supabase
            .from('metric_logs')
            .select('value_systolic')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', currentStartDate.toISOString())
            .lte('measurement_date', currentEndDate.toISOString())
            .not('value_systolic', 'is', null);

          if (currentError) {
            console.error('Metric Trend API - Error fetching current blood pressure data:', {
              error: currentError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            return NextResponse.json({ error: 'Error fetching current period data' }, { status: 500 });
          }

          if (currentLogs && currentLogs.length > 0) {
            const validLogs = currentLogs.filter(log => 
              log.value_systolic !== null && 
              typeof log.value_systolic === 'number' && 
              isFinite(log.value_systolic)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_systolic, 0);
              currentAvg = sum / validLogs.length;
              
              if (!isFinite(currentAvg)) {
                console.warn('Metric Trend API - Invalid current BP average:', {
                  sum,
                  count: validLogs.length,
                  result: currentAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                currentAvg = null;
              }
            }
          }

          const { data: previousLogs, error: previousError } = await supabase
            .from('metric_logs')
            .select('value_systolic')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', previousStartDate.toISOString())
            .lte('measurement_date', previousEndDate.toISOString())
            .not('value_systolic', 'is', null);

          if (previousError) {
            console.error('Metric Trend API - Error fetching previous blood pressure data:', {
              error: previousError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
          } else if (previousLogs && previousLogs.length > 0) {
            const validLogs = previousLogs.filter(log => 
              log.value_systolic !== null && 
              typeof log.value_systolic === 'number' && 
              isFinite(log.value_systolic)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_systolic, 0);
              previousAvg = sum / validLogs.length;
              
              if (!isFinite(previousAvg)) {
                console.warn('Metric Trend API - Invalid previous BP average:', {
                  sum,
                  count: validLogs.length,
                  result: previousAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                previousAvg = null;
              }
            }
          }
        } catch (bloodPressureError) {
          console.error('Metric Trend API - Blood pressure processing error:', {
            error: bloodPressureError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          currentAvg = null;
          previousAvg = null;
        }

      } else if (metricTemplate.value_type === 'bloodsugar') {
        try {
          const { data: currentLogs, error: currentError } = await supabase
            .from('metric_logs')
            .select('value_bloodsugar')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', currentStartDate.toISOString())
            .lte('measurement_date', currentEndDate.toISOString())
            .not('value_bloodsugar', 'is', null);

          if (currentError) {
            console.error('Metric Trend API - Error fetching current blood sugar data:', {
              error: currentError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
            return NextResponse.json({ error: 'Error fetching current period data' }, { status: 500 });
          }

          if (currentLogs && currentLogs.length > 0) {
            const validLogs = currentLogs.filter(log => 
              log.value_bloodsugar !== null && 
              typeof log.value_bloodsugar === 'number' && 
              isFinite(log.value_bloodsugar)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_bloodsugar, 0);
              currentAvg = sum / validLogs.length;
              
              if (!isFinite(currentAvg)) {
                console.warn('Metric Trend API - Invalid current blood sugar average:', {
                  sum,
                  count: validLogs.length,
                  result: currentAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                currentAvg = null;
              }
            }
          }

          const { data: previousLogs, error: previousError } = await supabase
            .from('metric_logs')
            .select('value_bloodsugar')
            .eq('metric_template_id', metric_template_id)
            .gte('measurement_date', previousStartDate.toISOString())
            .lte('measurement_date', previousEndDate.toISOString())
            .not('value_bloodsugar', 'is', null);

          if (previousError) {
            console.error('Metric Trend API - Error fetching previous blood sugar data:', {
              error: previousError,
              ...requestContext,
              timestamp: new Date().toISOString(),
            });
          } else if (previousLogs && previousLogs.length > 0) {
            const validLogs = previousLogs.filter(log => 
              log.value_bloodsugar !== null && 
              typeof log.value_bloodsugar === 'number' && 
              isFinite(log.value_bloodsugar)
            );
            
            if (validLogs.length > 0) {
              const sum = validLogs.reduce((acc, log) => acc + log.value_bloodsugar, 0);
              previousAvg = sum / validLogs.length;
              
              if (!isFinite(previousAvg)) {
                console.warn('Metric Trend API - Invalid previous blood sugar average:', {
                  sum,
                  count: validLogs.length,
                  result: previousAvg,
                  ...requestContext,
                  timestamp: new Date().toISOString(),
                });
                previousAvg = null;
              }
            }
          }
        } catch (bloodSugarError) {
          console.error('Metric Trend API - Blood sugar processing error:', {
            error: bloodSugarError,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          currentAvg = null;
          previousAvg = null;
        }
      } else {
        console.warn('Metric Trend API - Unsupported value type:', {
          value_type: metricTemplate.value_type,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unsupported metric value type' }, { status: 400 });
      }
    } catch (valueTypeError) {
      console.error('Metric Trend API - Value type processing error:', {
        error: valueTypeError,
        value_type: metricTemplate.value_type,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Error processing metric data' }, { status: 500 });
    }

    // Determine trend with validation
    let trend = 'unknown';
    try {
      const threshold = 0.01; // 1% threshold for determining if value is steady

      if (currentAvg !== null && previousAvg !== null && previousAvg !== 0) {
        const percentageChange = Math.abs(currentAvg - previousAvg) / previousAvg;
        
        // Validate percentage change calculation
        if (isNaN(percentageChange) || !isFinite(percentageChange)) {
          console.warn('Metric Trend API - Invalid percentage change calculation:', {
            current_avg: currentAvg,
            previous_avg: previousAvg,
            percentage_change: percentageChange,
            ...requestContext,
            timestamp: new Date().toISOString(),
          });
          trend = 'unknown';
        } else {
          if (percentageChange <= threshold) {
            trend = 'steady';
          } else if (currentAvg > previousAvg) {
            trend = 'increase';
          } else {
            trend = 'decrease';
          }
        }
      } else if (currentAvg !== null && previousAvg === null) {
        // Only current data available
        trend = 'unknown';
      } else if (currentAvg === null && previousAvg !== null) {
        // Only previous data available
        trend = 'unknown';
      } else {
        // No data available for either period
        trend = 'unknown';
      }
    } catch (trendError) {
      console.error('Metric Trend API - Trend calculation error:', {
        error: trendError,
        current_avg: currentAvg,
        previous_avg: previousAvg,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      trend = 'unknown';
    }

    // Log successful operation
    console.log('Metric Trend API - Success:', {
      trend,
      current_avg: currentAvg,
      previous_avg: previousAvg,
      data_points_current: currentAvg !== null ? 'available' : 'none',
      data_points_previous: previousAvg !== null ? 'available' : 'none',
      ...requestContext,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ trend });

  } catch (error) {
    console.error('Metric Trend API - Unexpected error:', {
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