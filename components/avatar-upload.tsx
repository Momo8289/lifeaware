'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { toast } from '@/components/ui/use-toast'
import { PencilIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { Input } from '@/components/ui/input'

export function AvatarUpload() {
  const [uploading, setUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const currentImage = useCurrentUserImage()
  const name = useCurrentUserName()
  const initials = name
    ?.split(' ')
    ?.map((word) => word[0])
    ?.join('')
    ?.toUpperCase() || '?'

  useEffect(() => {
    // Get current user ID
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null)
      setFilePreview(null)
      return
    }

    const file = e.target.files[0]
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WEBP).",
        variant: "destructive"
      })
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive"
      })
      return
    }
    
    setSelectedFile(file)
    
    // Create file preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setFilePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Delete any existing avatar files in the user's folder
  const deleteExistingAvatars = async (userId: string) => {
    try {
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(userId, { sortBy: { column: 'created_at', order: 'desc' } })
      
      if (files && files.length > 0) {
        const filesToDelete = files.map(file => `${userId}/${file.name}`)
        const { error } = await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
        
        if (error) throw error
      }
    } catch (error) {
      console.error('Error deleting existing avatars:', error)
      throw error
    }
  }

  // Handle avatar upload
  const uploadAvatar = async () => {
    if (!selectedFile || !currentUserId) return
    
    setUploading(true)
    
    try {
      // First delete any existing avatars
      await deleteExistingAvatars(currentUserId)
      
      // Generate a unique file name with timestamp
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `profile.${fileExt}`
      const filePath = `${currentUserId}/${fileName}`
      
      // Upload the new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 60 * 24) // 24-hour signed URL
      
      if (!urlData) throw new Error('Failed to get avatar URL')
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully."
      })
      
      // Clear the file preview and selected file
      setFilePreview(null)
      setSelectedFile(null)
      
      // Force refresh of other components using the avatar
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.refreshSession()
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Error updating avatar",
        description: error.message || "Failed to update your profile picture. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Handle avatar deletion
  const deleteAvatar = async () => {
    if (!currentUserId) return
    
    setUploading(true)
    
    try {
      await deleteExistingAvatars(currentUserId)
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed successfully."
      })
      
      // Force refresh of auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.refreshSession()
      }
    } catch (error: any) {
      console.error('Error deleting avatar:', error)
      toast({
        title: "Error removing avatar",
        description: error.message || "Failed to remove your profile picture. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-24 w-24 border-2 border-muted">
          {(filePreview || currentImage) && (
            <AvatarImage 
              src={filePreview || currentImage || ''} 
              alt={name || 'User avatar'} 
            />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Upload avatar"
              />
              <Button type="button" variant="outline" className="w-full">
                <UploadIcon className="mr-2 h-4 w-4" />
                Change Avatar
              </Button>
            </div>
            
            {(currentImage || filePreview) && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={deleteAvatar}
                disabled={uploading}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          
          {filePreview && (
            <Button 
              onClick={uploadAvatar} 
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Save Avatar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Upload a square image in JPEG, PNG, GIF, or WEBP format (max. 5MB).
      </div>
    </div>
  )
} 