-- Add DELETE policy for donations table
CREATE POLICY "Allow authenticated users to delete donations"
  ON public.donations
  FOR DELETE
  TO authenticated
  USING (true);

