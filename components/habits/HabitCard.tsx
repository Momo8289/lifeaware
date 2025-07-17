"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Check, Flame, Settings, CalendarDays, Clock, AlertTriangle, BellIcon, BellRingIcon, X } from "lucide-react"
import Link from "next/link"
import { format, isToday, addDays, isBefore, setHours, setMinutes, parse } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/utils/supabase/client"
import { useState, useEffect } from "react"
import { useReminders } from "@/components/providers/ReminderProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as ReactCalendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {concatClasses} from "@/utils/helpers";

interface HabitCardProps {
  habit: {
    id: string
    name: string
    description: string | null
    category: string | null
    frequency: 'daily' | 'weekly' | 'custom'
    frequency_days: number[]
    time_of_day: string | null
    start_date: string
    current_streak: number
    todayStatus?: 'completed' | 'pending'
    is_active: boolean
  }
  onUpdateStatus: (habitId: string, status: 'completed') => Promise<void>
  isUpdating: boolean
}

export function HabitCard({ habit, onUpdateStatus, isUpdating }: HabitCardProps) {
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [reminderDueDate, setReminderDueDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("");
  const [reminderPriority, setReminderPriority] = useState("Medium");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Get reminders from the provider to make the card reactive
  const { allActiveReminders } = useReminders();
  
  // Date picker helper functions
  const isSelectedDate = (date: Date | null): boolean => {
    if (!date || !reminderDate) return false;
    return date.getFullYear() === reminderDate.getFullYear() &&
           date.getMonth() === reminderDate.getMonth() &&
           date.getDate() === reminderDate.getDate();
  };
  
  const isPastDate = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const navigateToPreviousMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const navigateToNextMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };
  
  const generateCalendarDays = (): (Date | null)[] => {
    const days: (Date | null)[] = [];
    
    // Create a date object for the first day of the month
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Fill in empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Fill in the days of the month
    const numDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    
    // Fill out the rest of the grid if needed (6 rows × 7 days = 42 cells)
    while (days.length < 42) {
      days.push(null);
    }
    
    return days;
  };

  // Update currentMonth when reminderDate changes
  useEffect(() => {
    if (reminderDate) {
      setCurrentMonth(new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        1
      ));
    }
  }, [reminderDate]);

  // Check if there's already a reminder for this habit from the provider
  useEffect(() => {
    // Find any active reminders for this habit from the provider
    const habitReminder = allActiveReminders.find(r => r.habit_id === habit.id);
    
    if (habitReminder) {
      setHasReminder(true);
      setReminderId(habitReminder.id);
      setReminderDueDate(habitReminder.due_date);
    } else {
      setHasReminder(false);
      setReminderId(null);
      setReminderDueDate(null);
    }
  }, [habit.id, allActiveReminders]);

  const frequencyText = () => {
    switch (habit.frequency) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'custom':
        if (habit.frequency_days.length === 0) return 'Custom'
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const days = habit.frequency_days.map(day => dayNames[day]).join(', ')
        return `Custom (${days})`
    }
  }

  const getStatusColor = () => {
    if (!hasHabitStarted()) {
      return 'bg-muted text-muted-foreground'
    }
    if (habit.todayStatus === 'completed') {
      return 'bg-success text-success-foreground'
    }
    return 'bg-secondary text-secondary-foreground'
  }

  const isScheduledForToday = () => {
    if (habit.frequency === 'daily') return true
    if (habit.frequency === 'weekly') {
      const today = new Date().getDay() // 0-6 (Sunday-Saturday)
      return today === 0 // Assuming weekly habits are for Sunday
    }
    if (habit.frequency === 'custom') {
      const today = new Date().getDay() // 0-6 (Sunday-Saturday)
      return habit.frequency_days.includes(today)
    }
    return true
  }

  // Check if the habit has started (based on start_date)
  const hasHabitStarted = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(habit.start_date)
    startDate.setHours(0, 0, 0, 0)
    return startDate <= today
  }

  // Check if the habit should be active/pending today
  const isActiveToday = () => {
    return hasHabitStarted() && isScheduledForToday()
  }

  const getNextOccurrence = () => {
    if (habit.frequency === 'daily') {
      return new Date();
    }
    
    const today = new Date();
    const todayDay = today.getDay(); // 0-6 (Sunday-Saturday)
    
    if (habit.frequency === 'weekly') {
      // Assuming weekly habit is for Sunday (0)
      if (todayDay === 0) return today;
      const daysUntilSunday = 7 - todayDay;
      return addDays(today, daysUntilSunday);
    }
    
    if (habit.frequency === 'custom' && habit.frequency_days.length > 0) {
      // Find the next occurrence from the custom days
      const nextDays = habit.frequency_days.filter(day => day >= todayDay);
      if (nextDays.length > 0) {
        // Next occurrence is this week
        const nextDay = nextDays[0];
        const daysUntil = nextDay - todayDay;
        return addDays(today, daysUntil);
      } else {
        // Next occurrence is next week
        const nextDay = habit.frequency_days[0];
        const daysUntil = 7 - todayDay + nextDay;
        return addDays(today, daysUntil);
      }
    }
    
    return today;
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const deleteReminder = async () => {
    if (!reminderId) return;
    
    try {
      setIsCreatingReminder(true);
      
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);
      
      if (error) throw error;
      
      setHasReminder(false);
      setReminderId(null);
      setReminderDueDate(null);
      
      toast({
        title: "Reminder removed",
        description: `The reminder for "${habit.name}" has been removed`,
        duration: 3000,
      });
      
      // Manually trigger a refresh of the reminder count
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-reminders'));
      }, 100);
    } catch (error) {
      console.error('Failed to remove reminder:', error);
      toast({
        title: "Failed to remove reminder",
        description: "An error occurred while removing the reminder",
        variant: "destructive",
      });
    } finally {
      setIsCreatingReminder(false);
    }
  };

  const openReminderDialog = () => {
    // If there's already a reminder, delete it instead
    if (hasReminder) {
      return deleteReminder();
    }

    // Set default values for the dialog
    const now = new Date();
    const nextOccurrence = getNextOccurrence();
    
    // Use habit time if available
    let defaultTime = "09:00";
    if (habit.time_of_day) {
      // Make sure we have a valid time format (HH:MM)
      const timeMatch = habit.time_of_day.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        defaultTime = habit.time_of_day;
      }
    }
    
    // Check if the time is already past for today
    const [hours, minutes] = defaultTime.split(':').map(Number);
    const reminderDateTime = new Date(nextOccurrence);
    reminderDateTime.setHours(hours, minutes, 0, 0);
    
    // If the time is already past and it's for today, set it for tomorrow
    if (isToday(nextOccurrence) && isBefore(reminderDateTime, now)) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }
    
    setReminderDate(nextOccurrence);
    setCurrentMonth(nextOccurrence); // Set current month to match the selected date
    setReminderTime(defaultTime);
    setDialogOpen(true);
  };

  const createReminder = async () => {
    if (!reminderDate || !reminderTime) {
      toast({
        title: "Missing information",
        description: "Please select both a date and time for the reminder",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCreatingReminder(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create reminders",
          variant: "destructive",
        });
        return;
      }
      
      // Parse the time string
      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      // Set the time on the selected date
      const dueDate = new Date(reminderDate);
      dueDate.setHours(hours, minutes, 0, 0);
      
      // Create the reminder
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          habit_id: habit.id,
          title: `Reminder: ${habit.name}`,
          description: habit.description,
          due_date: dueDate.toISOString(),
          priority: reminderPriority,
          status: 'active'
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        setHasReminder(true);
        setReminderId(data[0].id);
        setReminderDueDate(data[0].due_date);
      }

      const formattedDueDate = formatDueDate(dueDate.toISOString());
      
      toast({
        title: "Reminder created",
        description: `Reminder set for "${habit.name}" on ${formattedDueDate}`,
        duration: 3000,
      });
      
      // Manually trigger a refresh of the reminder count
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-reminders'));
      }, 100);
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to update habit dialog:', error);
      toast({
        title: "Failed to create reminder",
        description: "An error occurred while creating the reminder",
        variant: "destructive",
      });
    } finally {
      setIsCreatingReminder(false);
    }
  };

  return (
    <>
      <Card className={concatClasses(
        "transition-all duration-300 hover:shadow-md",
        habit.todayStatus === 'completed' ? "border-success/40 bg-success/5" : "",
        !isActiveToday() ? "opacity-70" : ""
      )}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl truncate">{habit.name}</CardTitle>
              {habit.category && (
                <Badge variant="outline" className="mt-1">
                  {habit.category}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {habit.time_of_day && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {habit.time_of_day}
                </Badge>
              )}
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <CalendarDays className="h-3 w-3" />
                {frequencyText()}
              </Badge>
            </div>
          </div>
          {habit.description && (
            <CardDescription className="mt-2 line-clamp-2">
              {habit.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-orange-500/10 text-orange-500 p-1 rounded-full flex-shrink-0">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Current Streak</div>
                <div className="font-bold text-sm">{habit.current_streak} {habit.current_streak === 1 ? 'day' : 'days'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className={concatClasses("p-1 rounded-full flex-shrink-0", getStatusColor())}>
                <Check className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Today</div>
                <div className="font-bold text-sm">
                  {!hasHabitStarted() 
                    ? 'Future' 
                    : habit.todayStatus === 'completed' 
                    ? 'Completed' 
                    : 'Pending'
                  }
                </div>
              </div>
            </div>
          </div>

          {!isActiveToday() && (
            <div className="flex items-center gap-2 mt-3 text-muted-foreground text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {!hasHabitStarted() 
                  ? `Starts ${format(new Date(habit.start_date), 'MMM d, yyyy')}`
                  : 'Not scheduled for today'
                }
              </span>
            </div>
          )}
          
          {hasReminder && reminderDueDate && (
            <div className="flex items-center gap-2 mt-3 text-blue-500 text-xs">
              <BellRingIcon className="h-3 w-3" />
              <span>Reminder set for {formatDueDate(reminderDueDate)}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="flex-1 sm:flex-none"
            >
              <Link href={`/habits/${habit.id}`}>
                Details
              </Link>
            </Button>
            <Button
              variant={hasReminder ? "default" : "ghost"}
              size="sm"
              onClick={openReminderDialog}
              className={concatClasses(
                "flex-shrink-0",
                hasReminder ? "bg-blue-500 hover:bg-blue-600 text-white" : "text-blue-500"
              )}
              title={hasReminder ? "Remove reminder for this habit" : "Set a reminder for this habit"}
              disabled={isCreatingReminder}
            >
              {hasReminder ? <BellRingIcon className="h-4 w-4" /> : <BellIcon className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant={habit.todayStatus === 'completed' ? 'outline' : 'default'}
            size="sm"
            className={concatClasses(
              "w-full sm:w-auto",
              habit.todayStatus === 'completed' ? 'border-success text-success hover:bg-success/10' : ''
            )}
            onClick={() => onUpdateStatus(habit.id, 'completed')}
            disabled={isUpdating || !habit.is_active || !hasHabitStarted()}
            title={
              !habit.is_active 
                ? 'This habit is inactive and cannot be completed' 
                : !hasHabitStarted()
                ? `This habit starts on ${format(new Date(habit.start_date), 'MMM d, yyyy')}`
                : undefined
            }
          >
            {!hasHabitStarted() ? (
              `Starts ${format(new Date(habit.start_date), 'MMM d')}`
            ) : habit.todayStatus === 'completed' ? (
              <>
                <Check className="mr-1 h-4 w-4" /> Completed
              </>
            ) : (
              'Mark Complete'
            )}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Reminder for {habit.name}</DialogTitle>
            <DialogDescription>
              Choose when you want to be reminded about this habit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    // Show native date picker on the input below
                    const dateInput = document.getElementById('hidden-date-input') as HTMLInputElement;
                    if (dateInput) dateInput.showPicker();
                  }}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {reminderDate ? format(reminderDate, "MMMM do, yyyy") : "Pick a date"}
                </Button>
                <input
                  id="hidden-date-input"
                  type="date"
                  className="sr-only"
                  value={reminderDate ? format(reminderDate, "yyyy-MM-dd") : ""}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Create date at noon to avoid timezone issues
                      const selectedDate = new Date(e.target.value + "T12:00:00");
                      if (!isNaN(selectedDate.getTime())) {
                        setReminderDate(selectedDate);
                      }
                    }
                  }}
                />
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      today.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
                      setReminderDate(today);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
                      setReminderDate(tomorrow);
                    }}
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the time for your reminder (e.g., 09:00 for 9 AM).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={reminderPriority}
                onChange={(e) => setReminderPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Priority affects how reminders are displayed: 
                <span className="text-red-600 font-medium ml-1">High</span> for urgent tasks, 
                <span className="text-yellow-600 font-medium ml-1">Medium</span> for normal importance, 
                <span className="text-green-600 font-medium ml-1">Low</span> for optional tasks.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createReminder} disabled={isCreatingReminder}>
              {isCreatingReminder ? "Creating..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 