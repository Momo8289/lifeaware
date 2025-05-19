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
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_goal_milestones_updated_at
BEFORE UPDATE ON public.goal_milestones
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_goal_logs_updated_at
BEFORE UPDATE ON public.goal_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_goal_reminders_updated_at
BEFORE UPDATE ON public.goal_reminders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users can only access their own data
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