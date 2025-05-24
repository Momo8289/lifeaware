-- LifeAware Complete Database Schema
-- Consolidated migration that replaces all previous migrations
-- Includes: Profiles, Habits, Metrics, Goals, Reminders, Appearance Settings, Keep-Alive, and Habit Categories

---------------------------
-- UTILITY FUNCTIONS
---------------------------

-- Add trigger to update the updated_at column (used by multiple tables)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  font_size TEXT DEFAULT 'default' CHECK (font_size IN ('default', 'small', 'medium', 'large', 'xlarge')),
  color_theme TEXT DEFAULT 'default',
  display_mode TEXT DEFAULT 'system' CHECK (display_mode IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comments for profile columns
COMMENT ON COLUMN public.profiles.unit_system IS 'Unit system preference (metric or imperial)';
COMMENT ON COLUMN public.profiles.font_size IS 'User preferred font size setting';
COMMENT ON COLUMN public.profiles.color_theme IS 'User preferred color theme name';
COMMENT ON COLUMN public.profiles.display_mode IS 'User preferred display mode (light/dark/system)';

-- Create index for performance on appearance settings queries
CREATE INDEX IF NOT EXISTS idx_profiles_appearance_settings 
ON public.profiles (font_size, color_theme, display_mode);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  
  -- Create default habit categories for new user
  INSERT INTO public.habit_categories (user_id, name, color, is_default)
  VALUES 
    (new.id, 'Health', '#10B981', true),
    (new.id, 'Fitness', '#F59E0B', true),
    (new.id, 'Productivity', '#3B82F6', true),
    (new.id, 'Other', '#6B7280', true);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

---------------------------
-- STORAGE: AVATARS
---------------------------

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;

-- Set up security policies for the avatars bucket
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Avatar Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Avatar Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

---------------------------
-- HABITS SCHEMA
---------------------------

-- Create habit categories table
CREATE TABLE IF NOT EXISTS public.habit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create trigger for habit_categories updated_at
DROP TRIGGER IF EXISTS update_habit_categories_updated_at ON public.habit_categories;
CREATE TRIGGER update_habit_categories_updated_at
  BEFORE UPDATE ON public.habit_categories
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security for habit_categories
ALTER TABLE public.habit_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own habit categories" ON public.habit_categories;
DROP POLICY IF EXISTS "Users can insert their own habit categories" ON public.habit_categories;
DROP POLICY IF EXISTS "Users can update their own habit categories" ON public.habit_categories;
DROP POLICY IF EXISTS "Users can delete their own habit categories" ON public.habit_categories;

-- Create policies for habit_categories table
CREATE POLICY "Users can view their own habit categories" ON public.habit_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit categories" ON public.habit_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit categories" ON public.habit_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit categories" ON public.habit_categories
  FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency TEXT NOT NULL,
  frequency_days INTEGER[] DEFAULT '{}'::INTEGER[],
  time_of_day TEXT,
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
  status TEXT NOT NULL CHECK (status = 'completed'),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(habit_id, completion_date)
);

-- Create triggers for habits updated_at columns
DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER update_habit_logs_updated_at
  BEFORE UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security for habits
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

-- Insert simplified default categories for existing users
INSERT INTO public.habit_categories (user_id, name, color, is_default)
SELECT 
  au.id,
  unnest(ARRAY['Health', 'Fitness', 'Productivity', 'Other']),
  unnest(ARRAY['#10B981', '#F59E0B', '#3B82F6', '#6B7280']),
  true
FROM auth.users au
ON CONFLICT (user_id, name) DO NOTHING;

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
  value_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create metrics logging table
CREATE TABLE IF NOT EXISTS public.metric_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_template_id UUID NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  value_number DECIMAL,
  value_text TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create metric reminders table
CREATE TABLE IF NOT EXISTS public.metric_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_template_id UUID NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create triggers for metrics updated_at columns
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

-- Enable Row Level Security for metrics
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

-- Create policies for metric logs
CREATE POLICY "Users can view their own metric logs" ON public.metric_logs
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can insert their own metric logs" ON public.metric_logs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can update their own metric logs" ON public.metric_logs
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can delete their own metric logs" ON public.metric_logs
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

-- Create policies for metric reminders
CREATE POLICY "Users can view their own metric reminders" ON public.metric_reminders
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can insert their own metric reminders" ON public.metric_reminders
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can update their own metric reminders" ON public.metric_reminders
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

CREATE POLICY "Users can delete their own metric reminders" ON public.metric_reminders
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.metric_templates WHERE id = metric_template_id));

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
  target_value DECIMAL,
  target_unit TEXT,
  current_value DECIMAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goal milestones table
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL NOT NULL,
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goal logs table
CREATE TABLE IF NOT EXISTS public.goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value DECIMAL NOT NULL,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goal reminders table
CREATE TABLE IF NOT EXISTS public.goal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT '{}'::INTEGER[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create triggers for goals updated_at columns
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

DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security for goals
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

-- Create policies for goal milestones
CREATE POLICY "Users can view their own goal milestones" ON public.goal_milestones
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal milestones" ON public.goal_milestones
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal milestones" ON public.goal_milestones
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal milestones" ON public.goal_milestones
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Create policies for goal logs
CREATE POLICY "Users can view their own goal logs" ON public.goal_logs
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal logs" ON public.goal_logs
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal logs" ON public.goal_logs
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal logs" ON public.goal_logs
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Create policies for goal reminders
CREATE POLICY "Users can view their own goal reminders" ON public.goal_reminders
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert their own goal reminders" ON public.goal_reminders
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can update their own goal reminders" ON public.goal_reminders
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can delete their own goal reminders" ON public.goal_reminders
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Create policies for reminders
CREATE POLICY "Users can view their own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

---------------------------
-- KEEP-ALIVE TABLE
---------------------------

-- Create keep-alive table to prevent Supabase inactivity pausing
CREATE TABLE IF NOT EXISTS "keep-alive" (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  name text NULL DEFAULT ''::text,
  random uuid NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT "keep-alive_pkey" PRIMARY KEY (id)
);

-- Insert initial placeholder data
INSERT INTO "keep-alive"(name)
VALUES 
  ('placeholder'),
  ('initial-entry')
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE "keep-alive" IS 'Table used by GitHub Actions to keep Supabase project active by periodically inserting and cleaning up entries';
COMMENT ON COLUMN "keep-alive".name IS 'Descriptive name for the keep-alive entry';
COMMENT ON COLUMN "keep-alive".random IS 'Random UUID generated for each entry';
COMMENT ON COLUMN "keep-alive".created_at IS 'Timestamp when the entry was created'; 