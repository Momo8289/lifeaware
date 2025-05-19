-- Add date_of_birth and timezone to profiles table
ALTER TABLE public.profiles
ADD COLUMN date_of_birth DATE NULL,
ADD COLUMN timezone TEXT DEFAULT 'UTC' NULL; 