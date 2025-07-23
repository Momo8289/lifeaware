'use client'

import { useEffect, useState } from 'react'
import { supabase } from 'utils/supabase/client'

export function useCurrentUserName() {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserName() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // First try to get display name from user metadata
        if (user.user_metadata?.display_name) {
          setName(user.user_metadata.display_name)
          return
        }
        
        // If not, use email as fallback (split at @ to get username part)
        if (user.email) {
          setName(user.email.split('@')[0])
          return
        }
        
        // Last resort, use user id
        setName(user.id.substring(0, 2))
      }
    }
    
    fetchUserName()
    
    // Set up subscription for real-time updates
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserName()
    })
    
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])
  
  return name
} 