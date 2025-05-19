-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Set up security policies for the avatars bucket

-- Policy: Public read access
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatars
CREATE POLICY "Avatar Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- Policy: Users can update their own avatars
CREATE POLICY "Avatar Update Access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Avatar Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND (auth.uid() = (storage.foldername(name))[1]::uuid)
); 