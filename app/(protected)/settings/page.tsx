"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/utils/supabase/client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { AvatarUpload } from "@/components/avatar-upload"

const profileFormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }).optional(),
  bio: z.string().max(160).optional(),
  urls: z.array(
    z.object({
      value: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
    })
  ).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function SettingsProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUserAndProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace("/sign-in")
        return
      }
      
      setUser(user)
      
      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (error && error.code !== 'PGRST116') {
        // Silent error handling for production
      }
      
      setProfile(profileData || null)
      setLoading(false)
    }
    
    loadUserAndProfile()
  }, [router])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      bio: "",
      urls: [{ value: "" }],
    },
    mode: "onChange",
  })

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "urls",
  })

  useEffect(() => {
    if (user && profile) {
      form.setValue("username", profile.username || user.user_metadata?.display_name || "")
      form.setValue("bio", profile.bio || "")
      
      if (profile.urls && profile.urls.length > 0) {
        form.setValue("urls", profile.urls.map((url: string) => ({ value: url })))
      } else {
        form.setValue("urls", [{ value: "" }])
      }
    } else if (user) {
      form.setValue("username", user.user_metadata?.display_name || "")
    }
  }, [user, profile, form])

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return
    
    setSaveLoading(true)
    
    try {
      // Prepare profile data
      const urls = data.urls
        ? data.urls.map(u => u.value).filter(url => url && url.trim() !== "")
        : []
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: data.username || null,
          bio: data.bio || null,
          urls,
          updated_at: new Date().toISOString(),
        })
        
      if (error) throw error
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error updating profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const addUrl = () => {
    append({ value: "" })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-10">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Update your profile information and public details.
        </p>
      </div>
      <Separator />
      
      {/* Avatar Upload Section */}
      <div>
        <h4 className="text-sm font-medium mb-2">Profile Picture</h4>
        <AvatarUpload />
      </div>
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="username"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Your username" {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name. It can be your real name or a pseudonym.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a little bit about yourself"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Share a brief description about yourself.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <FormLabel>URLs</FormLabel>
            <FormDescription className="mt-1 mb-3">
              Add links to your website, blog, or social media profiles.
            </FormDescription>
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`urls.${index}.value`}
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addUrl}
              className="mt-2"
            >
              Add URL
            </Button>
          </div>
          
          <Button type="submit" disabled={saveLoading}>
            {saveLoading ? "Saving..." : "Update profile"}
          </Button>
        </form>
      </Form>
    </div>
  )
} 