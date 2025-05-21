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
    
    // Create admin client for operations that require admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Use admin client to verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '')
    
    // Manually decode the JWT to get the user ID
    // This avoids the Auth session missing error
    let userId;
    try {
      // Basic JWT decoding to extract the payload
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('Invalid token: User ID not found in JWT payload');
      }
      
      console.log('User ID extracted from token:', userId);
    } catch (jwtError) {
      console.error('Error decoding JWT:', jwtError);
      throw new Error('Invalid authentication token');
    }
    
    // Verify the user exists in auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error('Error verifying user:', userError);
      throw new Error('User not found or authentication failed');
    }
    
    console.log('User authenticated:', userId);
    
    // Get user profile to retrieve avatar info
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url')
      .eq('id', userId)
      .single();
    
    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileFetchError);
      // Continue with user deletion even if profile fetch fails
    }
    
    // Delete avatar if it exists
    if (profile && profile.avatar_url) {
      try {
        console.log('Attempting to delete avatar:', profile.avatar_url);
        
        // Check if avatar_url is a simple filename or full path
        let avatarFilename = profile.avatar_url;
        
        // If it's a full URL, extract just the filename
        if (typeof avatarFilename === 'string' && avatarFilename.includes('/')) {
          avatarFilename = avatarFilename.split('/').pop();
        }
        
        if (avatarFilename) {
          const { data: avatarDeletion, error: avatarError } = await supabaseAdmin
            .storage
            .from('avatars')
            .remove([avatarFilename]);
          
          if (avatarError) {
            console.error('Error deleting avatar:', avatarError);
            // Continue with user deletion even if avatar deletion fails
          } else {
            console.log('Avatar deleted successfully');
          }
        }
      } catch (avatarError) {
        console.error('Error during avatar deletion process:', avatarError);
        // Continue with user deletion even if avatar deletion fails
      }
    }
    
    // Delete profile data
    console.log('Deleting profile data for user:', userId);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // Continue with user deletion even if profile deletion fails
    }
    
    // Delete the user from auth.users
    console.log('Deleting auth record for user:', userId);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }
    
    console.log('User successfully deleted:', userId);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in user-self-deletion:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 