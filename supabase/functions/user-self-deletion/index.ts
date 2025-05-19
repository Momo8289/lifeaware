// @ts-nocheck
import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.14.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "user-self-deletion" up and running!`)

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Extract the token directly from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      throw new Error('Invalid token format')
    }
    
    console.log('Processing request with auth token')
    
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Verify the token and get the user
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token)
    
    if (verifyError || !user) {
      console.error('Token verification failed:', verifyError)
      throw new Error(verifyError?.message || 'Invalid token')
    }
    
    console.log('User authenticated:', user.id)
    
    // Try to parse the request body (optional)
    let userId = user.id
    try {
      const body = await req.json()
      if (body && body.userId) {
        // Extra verification that the user is deleting their own account
        if (body.userId !== user.id) {
          throw new Error('Cannot delete another user\'s account')
        }
      }
    } catch (e) {
      // If body parsing fails, proceed with the authenticated user ID
      console.log('Using default user ID from token')
    }
    
    // Delete profile data
    console.log('Deleting profile data for user:', userId)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      // Continue with user deletion even if profile deletion fails
    }
    
    // Delete the user from auth.users
    console.log('Deleting auth record for user:', userId)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }
    
    console.log('User successfully deleted:', userId)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in user-self-deletion:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 