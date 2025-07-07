import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now();
  let user: any;

  try {
    // Initialize Supabase client with error handling
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      console.error('Settings Appearance API GET - Cookie access error:', {
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
        console.error('Settings Appearance API GET - Auth error:', {
          error: userError,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Settings Appearance API GET - No user found:', {
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    } catch (authError) {
      console.error('Settings Appearance API GET - Auth system error:', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Get user profile with appearance settings
    let profile;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('font_size, color_theme, display_mode')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Settings Appearance API GET - Error fetching profile:', {
          error,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
      }

      profile = profileData;
    } catch (dbError) {
      console.error('Settings Appearance API GET - Database connection error:', {
        error: dbError,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Prepare response with defaults
    const response = {
      fontSize: profile?.font_size || 'default',
      colorTheme: profile?.color_theme || 'default',
      displayMode: profile?.display_mode || 'system'
    };

    // Log successful operation
    console.log('Settings Appearance API GET - Success:', {
      user_id: user.id,
      profile_exists: !!profile,
      settings: response,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Settings Appearance API GET - Unexpected error:', {
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

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  let user: any;
  let requestContext: any = {};

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      const { fontSize, colorTheme, displayMode } = body;
      requestContext = { fontSize, colorTheme, displayMode };
    } catch (parseError) {
      console.error('Settings Appearance API PUT - JSON parse error:', {
        error: parseError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate the inputs
    const validFontSizes = ['default', 'small', 'medium', 'large', 'xlarge'];
    const validDisplayModes = ['light', 'dark', 'system'];

    if (body.fontSize && !validFontSizes.includes(body.fontSize)) {
      console.warn('Settings Appearance API PUT - Invalid font size:', {
        provided: body.fontSize,
        valid_options: validFontSizes,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid font size' }, { status: 400 });
    }

    if (body.displayMode && !validDisplayModes.includes(body.displayMode)) {
      console.warn('Settings Appearance API PUT - Invalid display mode:', {
        provided: body.displayMode,
        valid_options: validDisplayModes,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid display mode' }, { status: 400 });
    }

    // Validate colorTheme if provided (basic validation)
    if (body.colorTheme && typeof body.colorTheme !== 'string') {
      console.warn('Settings Appearance API PUT - Invalid color theme type:', {
        provided: body.colorTheme,
        type: typeof body.colorTheme,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Invalid color theme' }, { status: 400 });
    }

    // Initialize Supabase client with error handling
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (cookieError) {
      console.error('Settings Appearance API PUT - Cookie access error:', {
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
        console.error('Settings Appearance API PUT - Auth error:', {
          error: userError,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.warn('Settings Appearance API PUT - No user found:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
      requestContext.user_id = user.id;
    } catch (authError) {
      console.error('Settings Appearance API PUT - Auth system error:', {
        error: authError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Authentication system error' }, { status: 500 });
    }

    // Prepare update data with validation
    let updateData;
    try {
      updateData = { 
        updated_at: new Date().toISOString() 
      };

      if (body.fontSize !== undefined) {
        updateData.font_size = body.fontSize;
      }
      if (body.colorTheme !== undefined) {
        updateData.color_theme = body.colorTheme;
      }
      if (body.displayMode !== undefined) {
        updateData.display_mode = body.displayMode;
      }

      // Validate that we have something to update
      if (Object.keys(updateData).length === 1) { // Only updated_at
        console.warn('Settings Appearance API PUT - No valid fields to update:', {
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
      }

      requestContext.update_fields = Object.keys(updateData).filter(key => key !== 'updated_at');
    } catch (prepareError) {
      console.error('Settings Appearance API PUT - Data preparation error:', {
        error: prepareError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Data preparation failed' }, { status: 500 });
    }

    // Update user profile with error handling
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updateData
        });

      if (error) {
        console.error('Settings Appearance API PUT - Database update error:', {
          error,
          ...requestContext,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
      }
    } catch (updateError) {
      console.error('Settings Appearance API PUT - Database connection error during update:', {
        error: updateError,
        ...requestContext,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database connection failed during update' }, { status: 500 });
    }

    // Log successful operation
    console.log('Settings Appearance API PUT - Success:', {
      ...requestContext,
      update_successful: true,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Settings Appearance API PUT - Unexpected error:', {
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