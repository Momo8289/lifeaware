import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getUserTimezone } from '../utils/timezone';

export function useUserTimezone() {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserTimezone() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // First, try to get from user profile
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .single();
          
          if (profile?.timezone) {
            setTimezone(profile.timezone);
            return;
          }
        }
        
        // Fallback to browser timezone
        const browserTimezone = getUserTimezone();
        setTimezone(browserTimezone);
        
        // Update user profile with browser timezone if logged in and no timezone set
        if (user && browserTimezone !== 'UTC') {
          await supabase
            .from('profiles')
            .upsert({ 
              id: user.id, 
              timezone: browserTimezone 
            }, { 
              onConflict: 'id' 
            });
        }
      } catch (error) {
        console.error('Failed to get user timezone from profile:', error);
        setTimezone(getUserTimezone());
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserTimezone();
  }, []);

  return { timezone, isLoading };
} 