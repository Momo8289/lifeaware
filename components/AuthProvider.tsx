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
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Only refresh on auth events that actually change state
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });

    // Initial auth check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
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