import { createBrowserClient } from '@supabase/ssr';

// Create the base Supabase client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Logout function to clear all auth data
export async function logoutUser() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    // Silent error in production
  }

  try {
    await clearAuthDataFromStorage();
  } catch (e) {
    // Silent error in production
  }
}

// Helper to clear all storage
export async function clearAuthDataFromStorage() {
  try {
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Get the project ID which is used in cookie names
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
    
    // Clear specific auth cookies
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
    
    // Clear specific localStorage items
    if (projectId) {
      try {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      } catch (e) {
        // Silent error in production
      }
    }
    
    return true;
  } catch (e) {
    // Silent error in production
    return false;
  }
}

// Simplified helper function to handle account deletion redirect
export const handleAccountDeletion = () => {
  logoutUser().finally(() => {
    window.location.href = '/';
  });
}; 