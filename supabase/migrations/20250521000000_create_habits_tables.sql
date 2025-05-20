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
  status TEXT NOT NULL, -- 'completed', 'missed', 'skipped'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(habit_id, completion_date)
);

-- Create table for habit reminders
CREATE TABLE IF NOT EXISTS public.habit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_habit_logs_updated_at
BEFORE UPDATE ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_habit_reminders_updated_at
BEFORE UPDATE ON public.habit_reminders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users can only access their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can view their own habits' 
    AND polrelid = 'public.habits'::regclass
  ) THEN
    CREATE POLICY "Users can view their own habits" ON public.habits
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can insert their own habits' 
    AND polrelid = 'public.habits'::regclass
  ) THEN
    CREATE POLICY "Users can insert their own habits" ON public.habits
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can update their own habits' 
    AND polrelid = 'public.habits'::regclass
  ) THEN
    CREATE POLICY "Users can update their own habits" ON public.habits
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can delete their own habits' 
    AND polrelid = 'public.habits'::regclass
  ) THEN
    CREATE POLICY "Users can delete their own habits" ON public.habits
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- Policies for habit logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can view their own habit logs' 
    AND polrelid = 'public.habit_logs'::regclass
  ) THEN
    CREATE POLICY "Users can view their own habit logs" ON public.habit_logs
      FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can insert their own habit logs' 
    AND polrelid = 'public.habit_logs'::regclass
  ) THEN
    CREATE POLICY "Users can insert their own habit logs" ON public.habit_logs
      FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can update their own habit logs' 
    AND polrelid = 'public.habit_logs'::regclass
  ) THEN
    CREATE POLICY "Users can update their own habit logs" ON public.habit_logs
      FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can delete their own habit logs' 
    AND polrelid = 'public.habit_logs'::regclass
  ) THEN
    CREATE POLICY "Users can delete their own habit logs" ON public.habit_logs
      FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;

  -- Policies for habit reminders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can view their own habit reminders' 
    AND polrelid = 'public.habit_reminders'::regclass
  ) THEN
    CREATE POLICY "Users can view their own habit reminders" ON public.habit_reminders
      FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can insert their own habit reminders' 
    AND polrelid = 'public.habit_reminders'::regclass
  ) THEN
    CREATE POLICY "Users can insert their own habit reminders" ON public.habit_reminders
      FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can update their own habit reminders' 
    AND polrelid = 'public.habit_reminders'::regclass
  ) THEN
    CREATE POLICY "Users can update their own habit reminders" ON public.habit_reminders
      FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can delete their own habit reminders' 
    AND polrelid = 'public.habit_reminders'::regclass
  ) THEN
    CREATE POLICY "Users can delete their own habit reminders" ON public.habit_reminders
      FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.habits WHERE id = habit_id));
  END IF;
END
$$;

-- Create functions for habit streak calculation
CREATE OR REPLACE FUNCTION get_habit_streak(habit_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  last_completed_date DATE;
  habit_frequency TEXT;
  habit_frequency_days INTEGER[];
  habit_start_date DATE;
  next_expected_date DATE;
BEGIN
  -- Get habit details
  SELECT frequency, frequency_days, start_date 
  INTO habit_frequency, habit_frequency_days, habit_start_date
  FROM public.habits
  WHERE id = habit_uuid;
  
  -- Get the last completed date
  SELECT completion_date
  INTO last_completed_date
  FROM public.habit_logs
  WHERE habit_id = habit_uuid AND status = 'completed'
  ORDER BY completion_date DESC
  LIMIT 1;
  
  -- If no completions, return 0
  IF last_completed_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate streak based on frequency
  IF habit_frequency = 'daily' THEN
    -- For daily habits, it's simple - just check consecutive days
    current_streak := 1; -- Start with 1 for the last completed date
    
    -- Count back from the last completed date
    WHILE EXISTS (
      SELECT 1 
      FROM public.habit_logs
      WHERE habit_id = habit_uuid 
      AND status = 'completed'
      AND completion_date = last_completed_date - current_streak
    ) LOOP
      current_streak := current_streak + 1;
    END LOOP;
    
  ELSIF habit_frequency = 'weekly' THEN
    -- For weekly habits, count weeks
    current_streak := 1; -- Start with 1 for the current week
    
    -- Calculate weeks completed in sequence
    WHILE EXISTS (
      SELECT 1 
      FROM public.habit_logs
      WHERE habit_id = habit_uuid 
      AND status = 'completed'
      AND completion_date BETWEEN 
        (last_completed_date - (current_streak * 7)) 
        AND 
        (last_completed_date - ((current_streak - 1) * 7) - 1)
    ) LOOP
      current_streak := current_streak + 1;
    END LOOP;
    
  ELSIF habit_frequency = 'custom' THEN
    -- For custom frequency, we need more complex logic
    -- This is simplified and may need refinement
    current_streak := 1;
    
    -- Get the expected dates and check if they were completed
    next_expected_date := last_completed_date;
    
    LOOP
      -- Find the previous expected date based on frequency_days
      -- This is a simplification - real implementation would be more complex
      next_expected_date := next_expected_date - 7; -- Go back a week
      
      EXIT WHEN next_expected_date < habit_start_date OR
        NOT EXISTS (
          SELECT 1 
          FROM public.habit_logs
          WHERE habit_id = habit_uuid 
          AND status = 'completed'
          AND completion_date BETWEEN next_expected_date - 3 AND next_expected_date + 3
        );
      
      current_streak := current_streak + 1;
    END LOOP;
  END IF;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

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