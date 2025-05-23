-- Consolidated LifeAware Database Schema
-- This file replaces all previous migrations with a single comprehensive schema
-- Note: PostgreSQL functions have been removed and will be handled in Next.js server-side code

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

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
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

CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can view their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;

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

-- Add RLS policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Cleanup 'missed' and 'skipped' habit logs to follow new schema
UPDATE public.habit_logs SET status = 'completed' WHERE status IN ('missed', 'skipped'); 