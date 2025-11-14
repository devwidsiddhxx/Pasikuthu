-- Add UPDATE policy for donations table
CREATE POLICY "Allow authenticated users to update donations"
  ON public.donations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update the qty constraint to allow 0 (for "Finished" status)
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_qty_check;

ALTER TABLE public.donations
  ADD CONSTRAINT donations_qty_check CHECK (qty >= 0);

