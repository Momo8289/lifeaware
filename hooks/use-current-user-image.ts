'use client'

import { useEffect, useState } from 'react'
import { supabase } from 'utils/supabase/client'

export function useCurrentUserImage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserAvatar() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // First check if user has avatar in user_metadata
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url)
          return
        }
        
        // If not in metadata, check if we have a stored avatar in the storage bucket
        try {
          // Format is /avatars/{user.id}/profile.jpg (or whatever the file extension)
          const { data } = await supabase.storage
            .from('avatars')
            .list(user.id, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' }
            })
          
          if (data && data.length > 0) {
            const { data: urlData } = await supabase.storage
              .from('avatars')
              .createSignedUrl(`${user.id}/${data[0].name}`, 60 * 60 * 24) // 24 hour signed URL
            
            if (urlData) {
              setAvatarUrl(urlData.signedUrl)
            }
          }
        } catch (error) {
          console.error('Failed to load user avatar:', error);
        }
      }
    }
    
    fetchUserAvatar()
    
    // Set up subscription for real-time updates
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserAvatar()
    })
    
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])
  
  return avatarUrl
} 