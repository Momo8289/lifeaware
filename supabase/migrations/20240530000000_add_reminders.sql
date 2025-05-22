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

-- Add RLS policies for reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own reminders
CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own reminders
CREATE POLICY "Users can insert their own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy to allow users to delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function
CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 