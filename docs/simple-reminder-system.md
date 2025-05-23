# Simple Universal Reminder System

## Overview

This is a clean, timezone-aware reminder system that works across your entire app with **zero complex scheduling** - just check reminders when users interact with your app.

## How It Works

### 🎯 Core Concept
Instead of background jobs and complex scheduling, the system checks reminders whenever:
- User opens the app 
- User navigates between pages
- User returns to the browser tab
- Every 15 minutes while app is active

### 🌍 Timezone Support
- Uses user's timezone from their profile (`profiles.timezone`)
- Falls back to browser timezone if not set
- All date calculations respect user's local time
- No server-side timezone conversion needed

## Simple Integration

### 1. Already Setup ✅
The system is already integrated in your `app/layout.tsx`:

```tsx
<ReminderProvider>
  {children}
</ReminderProvider>
```

### 2. Use Anywhere in Your App
Any component can access reminders:

```tsx
import { useReminders } from '@/components/providers/ReminderProvider';

function MyComponent() {
  const { reminders, checkReminders, completeHabit } = useReminders();
  
  // Manually trigger reminder check
  const handleRefresh = () => {
    checkReminders();
  };
  
  // Complete habit directly from reminder
  const handleComplete = (habitId: string) => {
    completeHabit(habitId);
  };
}
```

### 3. Automatic Notifications
Reminders appear as toast notifications with action buttons:
- ✅ **Complete** - Mark habit as done
- ❌ **Dismiss** - Hide reminder for now

## Reminder Logic by Habit Type

### Daily Habits
- Shows reminder once per day at scheduled time
- Only shows if habit not completed today
- Respects user's timezone for "today"

### Weekly Habits  
- Shows reminder if habit not completed this week
- Resets automatically on new week in user's timezone
- Week starts Monday in user's local time

### Monthly Habits
- Shows reminder if habit not completed this month  
- Resets automatically on new month in user's timezone
- Month boundaries based on user's local time

### Custom Habits (Mon/Wed/Fri, etc.)
- Shows reminder only on scheduled days
- Only shows if habit not completed that day
- Respects user's timezone for day boundaries

## Database Schema

The system uses your existing tables with minimal additions:

```sql
-- Add these columns to your reminders table if not present
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_sent_date DATE;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(5); -- HH:MM format
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS scheduled_days INTEGER[]; -- [0,1,2,3,4,5,6] for days
```

## Example: Creating a Reminder

```tsx
// When user creates a habit, also create a reminder
const createHabitWithReminder = async (habitData: any) => {
  // 1. Create the habit
  const { data: habit } = await supabase
    .from('habits')
    .insert(habitData)
    .select()
    .single();

  // 2. Create a reminder
  await supabase
    .from('reminders')
    .insert({
      habit_id: habit.id,
      user_id: user.id,
      title: `Time for ${habit.name}!`,
      message: `Don't forget to complete your ${habit.name} habit.`,
      scheduled_time: '09:00', // 9 AM
      scheduled_days: [1,2,3,4,5], // Monday to Friday
      is_active: true
    });
};
```

## Benefits of This Approach

### ✅ Simple & Reliable
- No background jobs or cron scheduling
- No external dependencies
- Works on any hosting platform (Vercel, Netlify, etc.)

### ✅ Timezone Accurate  
- Each user gets reminders in their local time
- Handles daylight saving automatically
- Date boundaries respect user location

### ✅ Cost Effective
- No additional server costs
- Uses existing database queries
- Minimal resource usage

### ✅ User Experience
- Immediate feedback when completing habits
- Toast notifications with action buttons
- Works offline (when user returns online)

## Advanced Usage

### Manual Reminder Checks
```tsx
// Trigger reminder check from any component
const { checkReminders } = useReminders();

const handleManualCheck = async () => {
  await checkReminders();
};
```

### Custom Reminder Display
```tsx
const { reminders } = useReminders();

return (
  <div>
    {reminders.map(reminder => (
      <div key={reminder.id} className="reminder-card">
        <h3>{reminder.title}</h3>
        <p>{reminder.message}</p>
        <button onClick={() => completeHabit(reminder.habit_id)}>
          Complete Now
        </button>
      </div>
    ))}
  </div>
);
```

### Integration with Existing Habit Completion
```tsx
// Your existing habit completion function
const markHabitComplete = async (habitId: string) => {
  // ... your existing completion logic ...
  
  // Also update reminders (automatic via ReminderProvider)
  const { completeHabit } = useReminders();
  await completeHabit(habitId);
};
```

## That's It! 

The system is designed to be **simple and universal**:
- ✅ Works across your entire app
- ✅ Respects all user timezones
- ✅ No complex background scheduling
- ✅ Clean integration with your existing code
- ✅ Scales with your user base

Just use the `useReminders()` hook anywhere you need reminder functionality! 