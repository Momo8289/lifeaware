import { createBrowserClient } from '@supabase/ssr';

// Create the base Supabase client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simplified method to clear all auth data
export const clearAuthData = async () => {
  try {
    // Try to sign out
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Signout error:', e);
    }
    
    // Get the project ID which is used in cookie names
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
    
    // Clear auth cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name && (
          name.includes('supabase') || 
          name.includes('auth') || 
          name.includes('sb-')
      )) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      }
    });
    
    // Clear localStorage items
    try {
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }
    } catch (e) {
      console.log('Storage clear error:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

// Simplified helper function to handle account deletion redirect
export const handleAccountDeletion = () => {
  clearAuthData().finally(() => {
    window.location.href = '/';
  });
}; 