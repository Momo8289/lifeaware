'use client'

import { useCurrentUserImage } from 'hooks/use-current-user-image'
import { useCurrentUserName } from 'hooks/use-current-user-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import {concatClasses} from "utils/helpers";

interface CurrentUserAvatarProps {
  className?: string
  fallback?: string
}

export function CurrentUserAvatar({ 
  className, 
  fallback = '?'
}: CurrentUserAvatarProps) {
  const profileImage = useCurrentUserImage()
  const name = useCurrentUserName()
  const initials = name
    ?.split(' ')
    ?.map((word) => word[0])
    ?.join('')
    ?.toUpperCase() || fallback

  return (
    <Avatar className={concatClasses("", className)}>
      {profileImage && <AvatarImage src={profileImage} alt={name || 'User avatar'} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
} 