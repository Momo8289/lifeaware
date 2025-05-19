-- Add unit_system column to profiles table
ALTER TABLE public.profiles
ADD COLUMN unit_system TEXT DEFAULT 'metric' NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.unit_system IS 'Unit system preference (metric or imperial)'; 