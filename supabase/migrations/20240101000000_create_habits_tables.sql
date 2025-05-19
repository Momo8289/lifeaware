-- Create habits schema
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
  frequency_days INTEGER[],
  time_of_day TEXT,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create habit logs table
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create habit reminders table (optional, for future use)
CREATE TABLE IF NOT EXISTS habit_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  days INTEGER[],
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for habits table
CREATE POLICY "Users can create their own habits" 
  ON habits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own habits" 
  ON habits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" 
  ON habits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" 
  ON habits 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for habit_logs table
CREATE POLICY "Users can create logs for their own habits" 
  ON habit_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can view logs for their own habits" 
  ON habit_logs 
  FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can update logs for their own habits" 
  ON habit_logs 
  FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can delete logs for their own habits" 
  ON habit_logs 
  FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

-- Create RLS policies for habit_reminders table
CREATE POLICY "Users can create reminders for their own habits" 
  ON habit_reminders 
  FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can view reminders for their own habits" 
  ON habit_reminders 
  FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can update reminders for their own habits" 
  ON habit_reminders 
  FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

CREATE POLICY "Users can delete reminders for their own habits" 
  ON habit_reminders 
  FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM habits WHERE id = habit_id));

-- Create function to calculate habit streaks
CREATE OR REPLACE FUNCTION get_habit_streak(habit_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  streak INTEGER := 0;
  last_completed_date DATE := NULL;
  frequency TEXT;
  frequency_days INTEGER[];
  current_date DATE := CURRENT_DATE;
  last_log RECORD;
BEGIN
  -- Get habit frequency
  SELECT h.frequency, h.frequency_days INTO frequency, frequency_days
  FROM habits h
  WHERE h.id = habit_uuid AND h.user_id = auth.uid();
  
  -- Get the last completed log
  SELECT * INTO last_log
  FROM habit_logs
  WHERE habit_id = habit_uuid
  AND status = 'completed'
  ORDER BY completion_date DESC
  LIMIT 1;
  
  -- If no completed logs, return 0
  IF last_log IS NULL THEN
    RETURN 0;
  END IF;
  
  last_completed_date := last_log.completion_date;
  
  -- Calculate streak based on frequency
  IF frequency = 'daily' THEN
    -- For daily habits, the streak is broken if there's a gap of more than 1 day
    IF current_date - last_completed_date <= 1 THEN
      SELECT COUNT(*) INTO streak
      FROM (
        SELECT generate_series(
          last_completed_date - INTERVAL '30 days',
          last_completed_date,
          INTERVAL '1 day'
        )::date AS date
      ) AS dates
      WHERE EXISTS (
        SELECT 1
        FROM habit_logs
        WHERE habit_id = habit_uuid
        AND status = 'completed'
        AND completion_date = dates.date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM habit_logs
        WHERE habit_id = habit_uuid
        AND status = 'missed'
        AND completion_date = dates.date
      )
      AND dates.date <= CURRENT_DATE;
    ELSE
      -- Streak is broken
      RETURN 0;
    END IF;
  ELSIF frequency = 'weekly' THEN
    -- For weekly habits, the streak is the number of consecutive weeks with completions
    IF EXTRACT(WEEK FROM current_date) - EXTRACT(WEEK FROM last_completed_date) <= 1 THEN
      SELECT COUNT(DISTINCT EXTRACT(WEEK FROM completion_date)) INTO streak
      FROM habit_logs
      WHERE habit_id = habit_uuid
      AND status = 'completed'
      AND completion_date >= current_date - INTERVAL '10 weeks'
      GROUP BY habit_id;
    ELSE
      -- Streak is broken
      RETURN 0;
    END IF;
  ELSIF frequency = 'custom' THEN
    -- For custom frequency, check if the habit was completed on all required days
    -- This is simplified and would need more complex logic based on your requirements
    IF current_date - last_completed_date <= 7 THEN
      SELECT COUNT(*) INTO streak
      FROM habit_logs
      WHERE habit_id = habit_uuid
      AND status = 'completed'
      AND completion_date >= current_date - INTERVAL '30 days';
    ELSE
      -- Streak is broken
      RETURN 0;
    END IF;
  END IF;
  
  RETURN streak;
END;
$$; 