-- Update plan constraint to replace ENTERPRISE with ULTRA
-- This migration updates the CHECK constraint on the users.plan column

DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_plan_check' 
    AND table_schema = 'public' 
    AND table_name = 'users'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE public.users DROP CONSTRAINT users_plan_check;
    RAISE NOTICE 'Dropped existing users_plan_check constraint';
  END IF;
  
  -- Add the new constraint with ULTRA instead of ENTERPRISE
  ALTER TABLE public.users 
  ADD CONSTRAINT users_plan_check 
  CHECK (plan IN ('FREE', 'PRO', 'PREMIUM', 'ULTRA'));
  
  RAISE NOTICE 'Added new users_plan_check constraint with ULTRA';
  
  -- Update the column comment
  COMMENT ON COLUMN public.users.plan IS 'User subscription plan: FREE, PRO, PREMIUM, or ULTRA';
  
  RAISE NOTICE 'Updated plan column comment';
END $$;
