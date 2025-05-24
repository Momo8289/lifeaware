-- Add appearance settings to profiles table
-- This migration adds font_size, color_theme, and display_mode columns

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'default' CHECK (font_size IN ('default', 'small', 'medium', 'large', 'xlarge')),
ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'system' CHECK (display_mode IN ('light', 'dark', 'system'));

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.font_size IS 'User preferred font size setting';
COMMENT ON COLUMN public.profiles.color_theme IS 'User preferred color theme name';
COMMENT ON COLUMN public.profiles.display_mode IS 'User preferred display mode (light/dark/system)';

-- Create index for performance on appearance settings queries
CREATE INDEX IF NOT EXISTS idx_profiles_appearance_settings 
ON public.profiles (font_size, color_theme, display_mode); 