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

### ⚡ Real-time Updates
- Reminder count in sidebar updates immediately when habits are completed
- Toast reminders disappear instantly when related habits are completed
- Automatic refresh of reminder system when habits change
- Cross-component synchronization via custom events

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
- ✅ **Complete** - Mark habit as done (for habit reminders)
- ❌ **Dismiss** - Hide reminder permanently

## Reminder Logic

### How Reminders Work
- Shows reminders that have a `due_date` <= current time
- Only shows `active` reminders (not `completed` or `dismissed`)
- For habit-related reminders, checks if habit was completed today
- Automatically hides habit reminders when habit is completed

### Real-time Synchronization
When a habit is completed (from any part of the app):
1. **Database Update** - Habit log is created/updated
2. **Reminder Update** - Related reminders marked as `completed`
3. **UI Refresh** - Sidebar count updates via `refresh-reminders` event
4. **Toast Cleanup** - Active reminder toasts are automatically dismissed
5. **Provider Sync** - ReminderProvider checks for changes

### Database Schema (Already Exists ✅)

Your existing `reminders` table has the perfect structure:

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);
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

  // 2. Create a reminder for tomorrow at 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await supabase
    .from('reminders')
    .insert({
      habit_id: habit.id,
      user_id: user.id,
      title: `Time for ${habit.name}!`,
      description: `Don't forget to complete your ${habit.name} habit.`,
      due_date: tomorrow.toISOString(),
      priority: 'Medium',
      status: 'active'
    });
};
```

## Benefits of This Approach

### ✅ Simple & Reliable
- No background jobs or cron scheduling
- No external dependencies
- Works on any hosting platform (Vercel, Netlify, etc.)
- Uses your existing database schema

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
- Automatic cleanup when habits are completed
- Real-time sidebar count updates

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
        <span className="priority">{reminder.priority}</span>
        {reminder.habit_id && (
          <button onClick={() => completeHabit(reminder.habit_id)}>
            Complete Habit
          </button>
        )}
        <button onClick={() => dismissReminder(reminder.id)}>
          Dismiss
        </button>
      </div>
    ))}
  </div>
);
```

### Triggering Manual Refresh
```tsx
// Trigger sidebar reminder count refresh from anywhere
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('refresh-reminders'));
}
```

### Integration with Existing Habit Completion
The system automatically integrates with your existing habit completion API:
- When habits are marked complete via `/api/habits/complete`, related reminders are updated
- Reminders are marked as `completed` when their associated habit is completed
- UI automatically removes completed reminders
- Sidebar count updates immediately

## Current Implementation Status

✅ **Working Features:**
- Reminder checking and display
- Toast notifications with action buttons
- Habit completion integration
- Reminder dismissal
- Timezone-aware logic
- Automatic cleanup
- Real-time sidebar count updates
- Cross-component synchronization

✅ **Already Integrated:**
- Uses existing `reminders` table
- Works with current habit system
- Integrated in app layout
- Available via `useReminders()` hook
- Connected to existing habit completion API

## That's It! 

The system is designed to be **simple and universal**:
- ✅ Works across your entire app
- ✅ Respects all user timezones
- ✅ No complex background scheduling
- ✅ Clean integration with your existing code
- ✅ Uses your existing database schema
- ✅ Scales with your user base
- ✅ Real-time updates everywhere

Just use the `useReminders()` hook anywhere you need reminder functionality! 