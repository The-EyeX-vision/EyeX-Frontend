-- ============================================================
-- The Eye X — Official PostgreSQL Schema & Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Fix public.schools Table ──────────────────────────────
-- Ensure public.schools exists with all required columns
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    code_prefix VARCHAR(20) DEFAULT 'SCH',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure code_prefix column exists even if table was created previously
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(20) DEFAULT 'SCH';

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Drop old policies to prevent duplicates
DROP POLICY IF EXISTS "Schools can view own profile" ON public.schools;
CREATE POLICY "Schools can view own profile" 
ON public.schools FOR SELECT 
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Schools can update own profile" ON public.schools;
CREATE POLICY "Schools can update own profile" 
ON public.schools FOR UPDATE 
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Schools can insert own profile" ON public.schools;
CREATE POLICY "Schools can insert own profile" 
ON public.schools FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);


-- ── 2. Users Table (Invigilators & Admins) ───────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'invigilator', 'instructor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role DEFAULT 'invigilator' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access school records" ON public.users;
CREATE POLICY "Users can access school records" 
ON public.users FOR ALL 
USING (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
);


-- ── 3. Exam Sessions ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invigilator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    status session_status DEFAULT 'scheduled' NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access school sessions" ON public.exam_sessions;
CREATE POLICY "Access school sessions" 
ON public.exam_sessions FOR ALL 
USING (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
);


-- ── 4. Classroom Alerts (Real-Time CV Incidents) ─────────────
CREATE TABLE IF NOT EXISTS public.classroom_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    student_id_tracker INT NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    suspicion_score NUMERIC(3, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'FLAGGED_ALERT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classroom_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_alerts;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DROP POLICY IF EXISTS "View alerts for school sessions" ON public.classroom_alerts;
CREATE POLICY "View alerts for school sessions" 
ON public.classroom_alerts FOR SELECT 
USING (
    session_id IN (
        SELECT id FROM public.exam_sessions 
        WHERE school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Insert alerts for school sessions" ON public.classroom_alerts;
CREATE POLICY "Insert alerts for school sessions" 
ON public.classroom_alerts FOR INSERT 
WITH CHECK (true);


-- ── 5. IMPORTANT: Drop Any Fragile Triggers on auth.users ───
-- If an auth.users trigger throws any error, Supabase returns:
-- "Database error saving new user".
-- Dropping it allows Supabase Auth to ALWAYS register users reliably,
-- while our application Server Action safely populates public.schools!
DROP TRIGGER IF EXISTS on_school_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_school_signup();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ── 6. Auto-confirm all existing users (Fix for email confirmation error) ───
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
