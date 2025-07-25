/**
 * Timezone utilities for handling dates in user's local timezone
 */

/**
 * Get user's timezone from browser or fallback to UTC
 */

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect user timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

/**
 * Get today's date in user's timezone as YYYY-MM-DD string
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
    timeZone: timezone,
  });
  return formatter.format(now);
}

/**
 * Get current date and time in user's timezone as ISO string
 */
export function getNowInTimezone(timezone: string): string {
  const now = new Date();
  // Convert to user's timezone and then back to UTC for storage
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return userTime.toISOString();
}

/**
 * Check if two dates are the same day in a given timezone
 */
export function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  return formatter.format(date1) === formatter.format(date2);
}

/**
 * Convert a date string to user's timezone and format as date-only
 */
export function formatDateInTimezone(dateString: string, timezone: string): string {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  return formatter.format(date);
}

/**
 * Get the start of day in user's timezone as UTC timestamp
 */
export function getStartOfDayInTimezone(timezone: string, date?: Date): Date {
  const targetDate = date || new Date();
  const dateStr = formatDateInTimezone(targetDate.toISOString(), timezone);
  
  // Create a date at midnight in the user's timezone
  const localMidnight = new Date(`${dateStr}T00:00:00`);
  
  // Convert to UTC by adjusting for timezone offset
  const utcOffset = getTimezoneOffset(timezone, localMidnight);
  return new Date(localMidnight.getTime() - utcOffset);
}

/**
 * Get timezone offset in milliseconds for a given timezone and date
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.getTime());
  const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return targetDate.getTime() - utcDate.getTime();
}

/**
 * Calculate days difference considering timezone
 */
export function daysDifferenceInTimezone(date1: Date, date2: Date, timezone: string): number {
  const day1 = formatDateInTimezone(date1.toISOString(), timezone);
  const day2 = formatDateInTimezone(date2.toISOString(), timezone);
  
  const date1Local = new Date(day1);
  const date2Local = new Date(day2);
  
  return Math.floor((date1Local.getTime() - date2Local.getTime()) / (1000 * 60 * 60 * 24));
}
