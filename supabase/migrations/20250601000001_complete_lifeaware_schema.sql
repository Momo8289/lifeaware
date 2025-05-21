-- Complete consolidated schema for LifeAware
-- This file combines all migrations into a single deployment file

---------------------------
-- PROFILES & USER DATA
---------------------------

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  bio TEXT,
  urls JSONB DEFAULT '[]'::jsonb NULL,
  date_of_birth DATE NULL,
  timezone TEXT DEFAULT 'UTC' NULL,
  unit_system TEXT DEFAULT 'metric' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.profiles.unit_system IS 'Unit system preference (metric or imperial)';

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view/edit only their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the avatars bucket
-- Policy: Public read access
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatars
DROP POLICY IF EXISTS "Avatar Insert Access" ON storage.objects;
CREATE POLICY "Avatar Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- Policy: Users can update their own avatars
DROP POLICY IF EXISTS "Avatar Update Access" ON storage.objects;
CREATE POLICY "Avatar Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- Policy: Users can delete their own avatars
DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;
CREATE POLICY "Avatar Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- Add trigger to update the updated_at column (used by multiple tables)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

---------------------------
-- HABITS SCHEMA
---------------------------

-- Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'custom'
  frequency_days INTEGER[] DEFAULT '{}'::INTEGER[], -- For custom frequency (0=Sunday, 1=Monday, etc.)
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening', 'anytime'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create habit tracking (check-ins) table
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status = 'completed'), -- Only 'completed' status allowed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(habit_id, completion_date)
);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER update_habit_logs_updated_at
  BEFORE UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON public.habits;

DROP POLICY IF EXISTS "Users can view their own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can insert their own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can update their own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can delete their own habit logs" ON public.habit_logs;

-- Create policies for habits table
CREATE POLICY "Users can view their own habits" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for habit logs table
CREATE POLICY "Users can view their own habit logs" ON public.habit_logs
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));

CREATE POLICY "Users can insert their own habit logs" ON public.habit_logs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));

CREATE POLICY "Users can update their own habit logs" ON public.habit_logs
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));

CREATE POLICY "Users can delete their own habit logs" ON public.habit_logs
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));

-- Function to calculate habit streak
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
  FROM public.habits h
  WHERE h.id = habit_uuid AND h.user_id = auth.uid();
  
  -- Get the last completed log
  SELECT * INTO last_log
  FROM public.habit_logs
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
        FROM public.habit_logs
        WHERE habit_id = habit_uuid
        AND status = 'completed'
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
      FROM public.habit_logs
      WHERE habit_id = habit_uuid
      AND status = 'completed'
      AND completion_date >= current_date - INTERVAL '10 weeks'
      GROUP BY habit_id;
    ELSE
      -- Streak is broken
      RETURN 0;
    END IF;
  ELSE
    -- For custom frequency, check if the habit was completed on all required days
    -- This is simplified and would need more complex logic based on your requirements
    IF current_date - last_completed_date <= 7 THEN
      SELECT COUNT(*) INTO streak
      FROM public.habit_logs
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

-- Function to get all habit statistics for a user
CREATE OR REPLACE FUNCTION get_user_habit_stats(user_uuid UUID)
RETURNS TABLE (
  habit_id UUID,
  habit_name TEXT,
  current_streak INTEGER,
  longest_streak INTEGER,
  completion_rate NUMERIC,
  total_completions INTEGER,
  total_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id AS habit_id,
    h.name AS habit_name,
    get_habit_streak(h.id) AS current_streak,
    COALESCE((
      SELECT MAX(streak_length)
      FROM (
        SELECT 
          hl.completion_date, 
          (hl.completion_date - DENSE_RANK() OVER (ORDER BY hl.completion_date))::INT / 
            CASE 
              WHEN h.frequency = 'daily' THEN 1
              WHEN h.frequency = 'weekly' THEN 7
              ELSE 1
            END AS grp,
          COUNT(*) AS streak_length
        FROM public.habit_logs hl
        WHERE hl.habit_id = h.id AND hl.status = 'completed'
        GROUP BY hl.completion_date, grp
      ) streaks
    ), 0) AS longest_streak,
    ROUND(
      COUNT(CASE WHEN hl.status = 'completed' THEN 1 ELSE NULL END)::NUMERIC / 
      NULLIF(COUNT(hl.id), 0) * 100, 
      2
    ) AS completion_rate,
    COUNT(CASE WHEN hl.status = 'completed' THEN 1 ELSE NULL END) AS total_completions,
    COUNT(hl.id) AS total_days
  FROM public.habits h
  LEFT JOIN public.habit_logs hl ON h.id = hl.habit_id
  WHERE h.user_id = user_uuid
  GROUP BY h.id, h.name, h.frequency;
END;
$$ LANGUAGE plpgsql;

---------------------------
-- METRICS SCHEMA
---------------------------

-- Create metrics template table
CREATE TABLE IF NOT EXISTS public.metric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  value_type TEXT NOT NULL, -- 'number', 'bloodpressure', 'bloodsugar'
  normal_range_min DECIMAL,
  normal_range_max DECIMAL,
  target_min DECIMAL,
  target_max DECIMAL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create metric logs table
CREATE TABLE IF NOT EXISTS public.metric_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_template_id UUID NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  value_numeric DECIMAL,
  value_systolic INTEGER, -- For blood pressure
  value_diastolic INTEGER, -- For blood pressure
  value_bloodsugar DECIMAL, -- For blood sugar
  context TEXT, -- E.g., "fasting", "post-meal", "morning"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for metric reminders
CREATE TABLE IF NOT EXISTS public.metric_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_template_id UUID NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::INTEGER[], -- 0=Sunday, 1=Monday, etc.
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add trigger to update the updated_at column for metric tables
DROP TRIGGER IF EXISTS update_metric_templates_updated_at ON public.metric_templates;
CREATE TRIGGER update_metric_templates_updated_at
BEFORE UPDATE ON public.metric_templates
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_metric_logs_updated_at ON public.metric_logs;
CREATE TRIGGER update_metric_logs_updated_at
BEFORE UPDATE ON public.metric_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_metric_reminders_updated_at ON public.metric_reminders;
CREATE TRIGGER update_metric_reminders_updated_at
BEFORE UPDATE ON public.metric_reminders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.metric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own metric templates" ON public.metric_templates;
DROP POLICY IF EXISTS "Users can insert their own metric templates" ON public.metric_templates;
DROP POLICY IF EXISTS "Users can update their own metric templates" ON public.metric_templates;
DROP POLICY IF EXISTS "Users can delete their own metric templates" ON public.metric_templates;

DROP POLICY IF EXISTS "Users can view their own metric logs" ON public.metric_logs;
DROP POLICY IF EXISTS "Users can insert their own metric logs" ON public.metric_logs;
DROP POLICY IF EXISTS "Users can update their own metric logs" ON public.metric_logs;
DROP POLICY IF EXISTS "Users can delete their own metric logs" ON public.metric_logs;

DROP POLICY IF EXISTS "Users can view their own metric reminders" ON public.metric_reminders;
DROP POLICY IF EXISTS "Users can insert their own metric reminders" ON public.metric_reminders;
DROP POLICY IF EXISTS "Users can update their own metric reminders" ON public.metric_reminders;
DROP POLICY IF EXISTS "Users can delete their own metric reminders" ON public.metric_reminders;

-- Create policies for metric templates
CREATE POLICY "Users can view their own metric templates" ON public.metric_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metric templates" ON public.metric_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metric templates" ON public.metric_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metric templates" ON public.metric_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for metric logs
CREATE POLICY "Users can view their own metric logs" ON public.metric_logs
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can insert their own metric logs" ON public.metric_logs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can update their own metric logs" ON public.metric_logs
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can delete their own metric logs" ON public.metric_logs
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

-- Policies for metric reminders
CREATE POLICY "Users can view their own metric reminders" ON public.metric_reminders
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can insert their own metric reminders" ON public.metric_reminders
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can update their own metric reminders" ON public.metric_reminders
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can delete their own metric reminders" ON public.metric_reminders
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

-- Create function to calculate trend for numeric metrics
CREATE OR REPLACE FUNCTION get_metric_trend(metric_template_id UUID, days_back INTEGER DEFAULT 7)
RETURNS TEXT AS $$
DECLARE
  current_avg DECIMAL;
  previous_avg DECIMAL;
  threshold DECIMAL := 0.01; -- 1% threshold for determining if value is steady
  current_start_date TIMESTAMP;
  current_end_date TIMESTAMP;
  previous_start_date TIMESTAMP;
  previous_end_date TIMESTAMP;
  value_type TEXT;
BEGIN
  -- Get metric value type
  SELECT mt.value_type
  INTO value_type
  FROM public.metric_templates mt
  WHERE mt.id = metric_template_id;
  
  -- Set date ranges
  current_end_date := now();
  current_start_date := current_end_date - (days_back || ' days')::INTERVAL;
  previous_end_date := current_start_date;
  previous_start_date := previous_end_date - (days_back || ' days')::INTERVAL;
  
  -- Calculate averages based on value type
  IF value_type = 'number' THEN
    -- Calculate current period average
    SELECT AVG(value_numeric)
    INTO current_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN current_start_date AND current_end_date;
    
    -- Calculate previous period average
    SELECT AVG(value_numeric)
    INTO previous_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN previous_start_date AND previous_end_date;
  
  ELSIF value_type = 'bloodpressure' THEN
    -- For blood pressure, use systolic as the main indicator
    -- Calculate current period average
    SELECT AVG(value_systolic)
    INTO current_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN current_start_date AND current_end_date;
    
    -- Calculate previous period average
    SELECT AVG(value_systolic)
    INTO previous_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN previous_start_date AND previous_end_date;
  
  ELSIF value_type = 'bloodsugar' THEN
    -- Calculate current period average
    SELECT AVG(value_bloodsugar)
    INTO current_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN current_start_date AND current_end_date;
    
    -- Calculate previous period average
    SELECT AVG(value_bloodsugar)
    INTO previous_avg
    FROM public.metric_logs
    WHERE metric_template_id = metric_template_id
    AND measurement_date BETWEEN previous_start_date AND previous_end_date;
  END IF;
  
  -- Return trend
  IF current_avg IS NULL OR previous_avg IS NULL OR previous_avg = 0 THEN
    RETURN 'unknown';
  ELSIF ABS(current_avg - previous_avg) / previous_avg <= threshold THEN
    RETURN 'steady';
  ELSIF current_avg > previous_avg THEN
    RETURN 'increase';
  ELSE
    RETURN 'decrease';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default metric templates for all users
INSERT INTO public.metric_templates 
  (user_id, name, description, unit, value_type, normal_range_min, normal_range_max, is_custom)
SELECT 
  au.id, 
  'Weight', 
  'Track your body weight over time', 
  'lbs', 
  'number',
  NULL,
  NULL,
  false
FROM 
  auth.users au
ON CONFLICT DO NOTHING;

INSERT INTO public.metric_templates 
  (user_id, name, description, unit, value_type, normal_range_min, normal_range_max, is_custom)
SELECT 
  au.id, 
  'Blood Pressure', 
  'Track your blood pressure readings', 
  'mmHg', 
  'bloodpressure',
  90,
  120,
  false
FROM 
  auth.users au
ON CONFLICT DO NOTHING;

INSERT INTO public.metric_templates 
  (user_id, name, description, unit, value_type, normal_range_min, normal_range_max, is_custom)
SELECT 
  au.id, 
  'Blood Sugar', 
  'Track your blood glucose levels', 
  'mg/dL', 
  'bloodsugar',
  70,
  100,
  false
FROM 
  auth.users au
ON CONFLICT DO NOTHING;

---------------------------
-- GOALS SCHEMA
---------------------------

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  metric TEXT NOT NULL, -- The unit being measured (e.g., "pounds", "dollars", "pages")
  target_value NUMERIC NOT NULL, -- The goal target value
  current_value NUMERIC NOT NULL DEFAULT 0, -- Current progress
  deadline DATE NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goal milestones table
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goal progress logs table
CREATE TABLE IF NOT EXISTS public.goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for goal reminders
CREATE TABLE IF NOT EXISTS public.goal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_time TIME NOT NULL,
  message TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add triggers to update the updated_at column
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_goal_milestones_updated_at ON public.goal_milestones;
CREATE TRIGGER update_goal_milestones_updated_at
BEFORE UPDATE ON public.goal_milestones
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_goal_logs_updated_at ON public.goal_logs;
CREATE TRIGGER update_goal_logs_updated_at
BEFORE UPDATE ON public.goal_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_goal_reminders_updated_at ON public.goal_reminders;
CREATE TRIGGER update_goal_reminders_updated_at
BEFORE UPDATE ON public.goal_reminders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

DROP POLICY IF EXISTS "Users can view their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can insert their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can update their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can delete their own goal milestones" ON public.goal_milestones;

DROP POLICY IF EXISTS "Users can view their own goal logs" ON public.goal_logs;
DROP POLICY IF EXISTS "Users can insert their own goal logs" ON public.goal_logs;
DROP POLICY IF EXISTS "Users can update their own goal logs" ON public.goal_logs;
DROP POLICY IF EXISTS "Users can delete their own goal logs" ON public.goal_logs;

DROP POLICY IF EXISTS "Users can view their own goal reminders" ON public.goal_reminders;
DROP POLICY IF EXISTS "Users can insert their own goal reminders" ON public.goal_reminders;
DROP POLICY IF EXISTS "Users can update their own goal reminders" ON public.goal_reminders;
DROP POLICY IF EXISTS "Users can delete their own goal reminders" ON public.goal_reminders;

-- Create policies for goals
CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for goal milestones
CREATE POLICY "Users can view their own goal milestones" ON public.goal_milestones
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal milestones" ON public.goal_milestones
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal milestones" ON public.goal_milestones
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal milestones" ON public.goal_milestones
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Policies for goal logs
CREATE POLICY "Users can view their own goal logs" ON public.goal_logs
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal logs" ON public.goal_logs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal logs" ON public.goal_logs
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal logs" ON public.goal_logs
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Policies for goal reminders
CREATE POLICY "Users can view their own goal reminders" ON public.goal_reminders
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal reminders" ON public.goal_reminders
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal reminders" ON public.goal_reminders
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal reminders" ON public.goal_reminders
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Create functions for goal progress calculation
CREATE OR REPLACE FUNCTION get_goal_progress(goal_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  goal_target NUMERIC;
  goal_current NUMERIC;
  progress_percentage NUMERIC;
BEGIN
  -- Get goal details
  SELECT target_value, current_value
  INTO goal_target, goal_current
  FROM public.goals
  WHERE id = goal_uuid;
  
  -- Calculate progress percentage
  IF goal_target = 0 THEN
    progress_percentage := 0;
  ELSE
    progress_percentage := ROUND((goal_current / goal_target) * 100, 2);
  END IF;
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update goal progress based on logs
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current_value in the goals table
  UPDATE public.goals
  SET 
    current_value = (
      SELECT COALESCE(MAX(value), 0)
      FROM public.goal_logs
      WHERE goal_id = NEW.goal_id
      ORDER BY log_date DESC
      LIMIT 1
    ),
    is_completed = CASE 
      WHEN (
        SELECT COALESCE(MAX(value), 0)
        FROM public.goal_logs
        WHERE goal_id = NEW.goal_id
        ORDER BY log_date DESC
        LIMIT 1
      ) >= (
        SELECT target_value
        FROM public.goals
        WHERE id = NEW.goal_id
      ) THEN TRUE
      ELSE FALSE
    END
  WHERE id = NEW.goal_id;
  
  -- Check if any milestones are completed
  UPDATE public.goal_milestones
  SET is_completed = TRUE
  WHERE goal_id = NEW.goal_id
    AND is_completed = FALSE
    AND target_value <= NEW.value;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goal progress updates
DROP TRIGGER IF EXISTS update_goal_progress_on_log ON public.goal_logs;
CREATE TRIGGER update_goal_progress_on_log
AFTER INSERT OR UPDATE ON public.goal_logs
FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- Function to get all goal statistics for a user
CREATE OR REPLACE FUNCTION get_user_goal_stats(user_uuid UUID)
RETURNS TABLE (
  goal_id UUID,
  goal_title TEXT,
  progress_percentage NUMERIC,
  days_remaining INTEGER,
  milestone_completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS goal_id,
    g.title AS goal_title,
    get_goal_progress(g.id) AS progress_percentage,
    GREATEST(0, g.deadline - CURRENT_DATE) AS days_remaining,
    ROUND(
      COALESCE(
        (SELECT COUNT(*) FROM public.goal_milestones WHERE goal_id = g.id AND is_completed = TRUE)::NUMERIC /
        NULLIF((SELECT COUNT(*) FROM public.goal_milestones WHERE goal_id = g.id), 0) * 100,
        0
      ),
      2
    ) AS milestone_completion_rate
  FROM public.goals g
  WHERE g.user_id = user_uuid AND g.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup 'missed' and 'skipped' habit logs to follow new schema
UPDATE public.habit_logs SET status = 'completed' WHERE status IN ('missed', 'skipped'); 