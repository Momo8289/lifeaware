'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Function to extract and set display name from OAuth providers
  const extractAndSetDisplayName = async (user: User | null) => {
    if (!user) return;
    
    // If user already has a display name in metadata, do nothing
    if (user.user_metadata?.display_name) return;

    let displayName = '';
    
    // Try to extract name from user metadata based on provider
    if (user.app_metadata?.provider === 'azure') {
      // Extract from Microsoft (Azure) OAuth response
      displayName = user.user_metadata?.full_name || 
                   user.user_metadata?.email?.split('@')[0] || '';
    } else if (user.app_metadata?.provider === 'google') {
      // Extract from Google OAuth response
      displayName = user.user_metadata?.full_name || 
                   user.user_metadata?.email?.split('@')[0] || '';
    }
    
    // If we have a display name, update user metadata
    if (displayName) {
      try {
        await supabase.auth.updateUser({
          data: { display_name: displayName }
        });
        // Success silently
      } catch (error) {
        // Silent error handling for production
      }
    }
  };

  useEffect(() => {
    // Only perform auth check and setup refreshes for known routes
    // This is critical to prevent infinite refresh loops on 404 pages
    const isKnownRoute = 
      pathname === '/' || 
      pathname === '/sign-in' || 
      pathname === '/sign-up' || 
      pathname === '/sign-out' ||
      pathname === '/forgot-password' ||
      pathname === '/auth/callback' ||
      pathname.startsWith('/goals') || 
      pathname.startsWith('/habits') || 
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/settings');

    if (!isKnownRoute) {
      // For unknown routes (potential 404s), just set loading to false and don't set up auth listeners
      setLoading(false);
      return () => {}; // No cleanup needed
    }

    // For known routes, set up the auth listener normally
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      
      // On sign-in, try to extract and set display name
      if (event === 'SIGNED_IN') {
        extractAndSetDisplayName(currentUser);
        router.refresh();
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });

    // Initial auth check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      // Try to extract display name on initial load
      extractAndSetDisplayName(data.user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
} 