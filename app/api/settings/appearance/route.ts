import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('font_size, color_theme, display_mode')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching appearance settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      fontSize: profile?.font_size || 'default',
      colorTheme: profile?.color_theme || 'default',
      displayMode: profile?.display_mode || 'system'
    })
  } catch (error) {
    console.error('Error in appearance settings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fontSize, colorTheme, displayMode } = body

    // Validate the inputs
    const validFontSizes = ['default', 'small', 'medium', 'large', 'xlarge']
    const validDisplayModes = ['light', 'dark', 'system']

    if (fontSize && !validFontSizes.includes(fontSize)) {
      return NextResponse.json({ error: 'Invalid font size' }, { status: 400 })
    }

    if (displayMode && !validDisplayModes.includes(displayMode)) {
      return NextResponse.json({ error: 'Invalid display mode' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = { 
      updated_at: new Date().toISOString() 
    }

    if (fontSize !== undefined) {
      updateData.font_size = fontSize
    }
    if (colorTheme !== undefined) {
      updateData.color_theme = colorTheme
    }
    if (displayMode !== undefined) {
      updateData.display_mode = displayMode
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updateData
      })

    if (error) {
      console.error('Error updating appearance settings:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in appearance settings PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 