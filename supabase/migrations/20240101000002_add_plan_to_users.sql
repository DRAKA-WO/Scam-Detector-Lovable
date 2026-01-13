-- Add plan column to users table
-- This assumes you have a public.users table that references auth.users
-- If you're using auth.users directly, you'll need to create a public.users table first

-- Option 1: If you have a public.users table
DO $$ 
BEGIN
  -- Check if users table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Add plan column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan') THEN
      ALTER TABLE public.users ADD COLUMN plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'));
      
      -- Update existing users to have FREE plan
      UPDATE public.users SET plan = 'FREE' WHERE plan IS NULL;
      
      -- Make plan NOT NULL after setting defaults
      ALTER TABLE public.users ALTER COLUMN plan SET NOT NULL;
      
      -- Add comment
      COMMENT ON COLUMN public.users.plan IS 'User subscription plan: FREE, PRO, PREMIUM, or ENTERPRISE';
    END IF;
  ELSE
    -- Create public.users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'PREMIUM', 'ENTERPRISE')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Users can view their own record
    CREATE POLICY "Users can view their own record"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
    
    -- Policy: Users can update their own record
    CREATE POLICY "Users can update their own record"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
    -- Policy: Service role can insert/update (for backend operations)
    CREATE POLICY "Service role can manage users"
    ON public.users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
    -- Sync existing auth.users to public.users
    INSERT INTO public.users (id, plan)
    SELECT id, 'FREE' as plan
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created public.users table with plan column';
  END IF;
END $$;
