"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase, handleAccountDeletion } from "utils/supabase/client"

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
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// List of common timezones
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland"
]

const accountFormSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(2, {
    message: "Display name must be at least 2 characters"
  }).max(50, {
    message: "Display name must not be longer than 50 characters"
  }).optional(),
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Date must be in YYYY-MM-DD format"
    })
    .optional()
    .or(z.literal("")),
  timezone: z.string().optional(),
  unit_system: z.enum(["metric", "imperial"]),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      email: "",
      display_name: "",
      date_of_birth: "",
      timezone: "UTC",
      unit_system: "metric" as const,
    },
    mode: "onChange",
  })

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
      
      // Set form values
      form.setValue("email", user.email || "")
      // Set display name from auth.users metadata if available
      if (user.user_metadata && user.user_metadata.display_name) {
        form.setValue("display_name", user.user_metadata.display_name)
      }
      
      if (profileData) {
        if (profileData.date_of_birth) {
          form.setValue("date_of_birth", profileData.date_of_birth)
        }
        form.setValue("timezone", profileData.timezone || "UTC")
        form.setValue("unit_system", profileData.unit_system || "metric")
      }
      
      setLoading(false)
    }
    
    loadUserAndProfile()
  }, [router, form])

  async function onSubmit(data: AccountFormValues) {
    if (!user) return
    
    setSaveLoading(true)
    
    try {
      const newEmail = data.email
      const currentEmail = user.email
      const promises = []
      
      // Handle email change if needed
      if (newEmail !== currentEmail) {
        promises.push(handleEmailChange(newEmail))
      }
      
      // Update display name in auth.users table
      promises.push(
        supabase.auth.updateUser({
          data: { display_name: data.display_name || null }
        })
      )
      
      // Update profile with date_of_birth and timezone
      promises.push(
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            date_of_birth: data.date_of_birth || null,
            timezone: data.timezone || "UTC",
            unit_system: data.unit_system,
            updated_at: new Date().toISOString(),
          })
      )
      
      // Wait for all promises to resolve
      const results = await Promise.allSettled(promises)
      
      // Check for errors
      const errors = results
        .filter(result => result.status === 'rejected')
        .map((result: any) => result.reason)
      
      if (errors.length > 0) {
        
        throw errors[0]
      }
      
      toast({
        title: "Account updated",
        description: "Your account information has been updated successfully.",
      })
    } catch (error: any) {
      console.error('Failed to update account:', error);
      toast({
        title: "Error updating account",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
      setEmailChangeLoading(false)
    }
  }

  async function handleEmailChange(newEmail: string) {
    setEmailChangeLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    
    if (error) throw error
    
    toast({
      title: "Email verification sent",
      description: `We've sent a verification link to ${newEmail}. Please check your inbox.`,
    })
  }

  async function deleteAccount() {
    if (!user) return
    
    setDeleteLoading(true)
    
    try {
      // Get the current session with a valid token
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      
      if (!session) {
        throw new Error('You must be logged in to delete your account')
      }
      
      // Call the edge function with explicit parameters
      const { data, error } = await supabase.functions.invoke(
        'user-self-deletion',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (error) throw error
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      })
      
      // Redirect after account deletion
      setTimeout(() => {
        handleAccountDeletion();
      }, 1000)
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Error deleting account",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-10">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your display name" 
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is how your name will appear to others.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Your email address" 
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Changing your email requires verification. A link will be sent to your new email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="YYYY-MM-DD" 
                    onChange={(e) => {
                      // Start with only digits and hyphens, restricted to correct positions
                      let value = e.target.value.replace(/[^0-9-]/g, '');
                      
                      // Format to enforce YYYY-MM-DD structure
                      let formatted = '';
                      
                      // Process digits only for formatting
                      const digits = value.replace(/-/g, '');
                      
                      // Year part (first 4 digits)
                      if (digits.length > 0) {
                        // Get up to 4 digits for year
                        const yearPart = digits.substring(0, Math.min(4, digits.length));
                        formatted = yearPart;
                        
                        // Month part (next 2 digits)
                        if (digits.length > 4) {
                          const monthPart = digits.substring(4, Math.min(6, digits.length));
                          
                          // Validate month if complete
                          if (monthPart.length === 2) {
                            const monthNum = parseInt(monthPart, 10);
                            // If month > 12, cap at 12
                            const validMonth = monthNum > 12 ? '12' : monthPart;
                            formatted += '-' + validMonth;
                          } else {
                            formatted += '-' + monthPart;
                          }
                          
                          // Day part (next 2 digits)
                          if (digits.length > 6) {
                            const dayPart = digits.substring(6, Math.min(8, digits.length));
                            
                            // Validate day if complete
                            if (dayPart.length === 2) {
                              const dayNum = parseInt(dayPart, 10);
                              // If day > 31, cap at 31
                              const validDay = dayNum > 31 ? '31' : dayPart;
                              formatted += '-' + validDay;
                            } else {
                              formatted += '-' + dayPart;
                            }
                          }
                        }
                      }
                      
                      // For directly typed hyphens input (e.g. copy/paste), try to enforce format
                      if (value.includes('-') && formatted === '') {
                        const parts = value.split('-').filter(Boolean);
                        
                        if (parts.length > 0) {
                          // Year (first part, up to 4 digits)
                          const yearPart = parts[0].substring(0, 4);
                          formatted = yearPart;
                          
                          // Month (second part, up to 2 digits)
                          if (parts.length > 1) {
                            const monthPart = parts[1].substring(0, 2);
                            const monthNum = parseInt(monthPart, 10);
                            // Validate month if provided
                            const validMonth = monthPart.length === 2 && monthNum > 12 ? '12' : monthPart;
                            formatted += '-' + validMonth;
                            
                            // Day (third part, up to 2 digits)
                            if (parts.length > 2) {
                              const dayPart = parts[2].substring(0, 2);
                              const dayNum = parseInt(dayPart, 10);
                              // Validate day if provided
                              const validDay = dayPart.length === 2 && dayNum > 31 ? '31' : dayPart;
                              formatted += '-' + validDay;
                            }
                          }
                        }
                      }
                      
                      field.onChange(formatted);
                    }}
                    value={field.value || ''}
                    onBlur={field.onBlur}
                    name={field.name}
                    maxLength={10}
                  />
                </FormControl>
                <FormDescription>
                  Your date of birth in YYYY-MM-DD format.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || "UTC"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Your preferred timezone for dates and times.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="unit_system"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit System</FormLabel>
                <div className="flex items-center gap-2">
                  <Toggle
                    pressed={field.value === "metric"}
                    onPressedChange={(pressed) => {
                      field.onChange(pressed ? "metric" : "imperial");
                    }}
                    variant="outline"
                  >
                    Metric
                  </Toggle>
                  <Toggle 
                    pressed={field.value === "imperial"} 
                    onPressedChange={(pressed) => {
                      field.onChange(pressed ? "imperial" : "metric");
                    }}
                    variant="outline"
                  >
                    Imperial
                  </Toggle>
                </div>
                <FormDescription>
                  Choose between metric (kg, km, °C) or imperial (lb, mi, °F) units. This affects how measurements are displayed (e.g., 1 kg ≈ 2.2 lb).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={saveLoading || emailChangeLoading}>
            {saveLoading || emailChangeLoading ? "Saving..." : "Update account"}
          </Button>
        </form>
      </Form>
      
      <Separator className="my-6" />
      
      <div>
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data
        </p>
        
        <Button 
          variant="destructive" 
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete Account
        </Button>
        
        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="z-[100]">
            <DialogHeader>
              <DialogTitle className="text-xl">Delete Account</DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Are you sure you want to permanently delete your account? This action cannot be undone and will erase all your data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 