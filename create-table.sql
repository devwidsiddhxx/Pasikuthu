-- Create the donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  food_name TEXT NOT NULL,
  description TEXT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  name TEXT,
  location TEXT,
  contact_number TEXT
);

-- Enable Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert donations
CREATE POLICY "Allow authenticated users to insert donations"
  ON public.donations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to view all donations
CREATE POLICY "Allow authenticated users to view donations"
  ON public.donations
  FOR SELECT
  TO authenticated
  USING (true);

