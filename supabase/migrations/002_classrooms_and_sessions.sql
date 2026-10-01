-- ============================================================
-- EyeX Migration 002: Classrooms, Cameras, Sessions & Violations
-- Run AFTER 001_full_schema.sql in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. CLASSROOMS Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    access_code CHAR(8) NOT NULL,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (school_id, access_code)
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Index for code lookup (used by anon examiner flow)
CREATE INDEX IF NOT EXISTS idx_classrooms_access_code ON public.classrooms(access_code);

DROP POLICY IF EXISTS "School classrooms access" ON public.classrooms;
CREATE POLICY "School classrooms access"
ON public.classrooms FOR ALL
USING (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
);

-- Allow anon to read classrooms by access_code (examiner hall-access flow)
DROP POLICY IF EXISTS "Anon verify hall code" ON public.classrooms;
CREATE POLICY "Anon verify hall code"
ON public.classrooms FOR SELECT
TO anon
USING (true);


-- ── 2. CAMERAS Table ────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE camera_status AS ENUM ('ACTIVE', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    camera_number INT NOT NULL,
    name VARCHAR(100),
    status camera_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (classroom_id, camera_number)
);

ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School cameras access" ON public.cameras;
CREATE POLICY "School cameras access"
ON public.cameras FOR ALL
USING (
    classroom_id IN (
        SELECT c.id FROM public.classrooms c
        WHERE c.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
)
WITH CHECK (
    classroom_id IN (
        SELECT c.id FROM public.classrooms c
        WHERE c.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

-- Allow anon to read cameras for examiner HUD
DROP POLICY IF EXISTS "Anon cameras read" ON public.cameras;
CREATE POLICY "Anon cameras read"
ON public.cameras FOR SELECT
TO anon
USING (true);


-- ── 3. SESSIONS Table (new model for classrooms) ────────────────
DO $$ BEGIN
    CREATE TYPE session_status_v2 AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.exam_hall_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50),
    duration_minutes INT NOT NULL DEFAULT 120,
    expected_students INT NOT NULL DEFAULT 0,
    status session_status_v2 DEFAULT 'SCHEDULED' NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exam_hall_sessions ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for sessions
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_hall_sessions;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "School exam_hall_sessions access" ON public.exam_hall_sessions;
CREATE POLICY "School exam_hall_sessions access"
ON public.exam_hall_sessions FOR ALL
USING (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    school_id IN (
        SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
    )
);

-- Allow anon to read sessions for examiner console
DROP POLICY IF EXISTS "Anon exam_hall_sessions read" ON public.exam_hall_sessions;
CREATE POLICY "Anon exam_hall_sessions read"
ON public.exam_hall_sessions FOR SELECT
TO anon
USING (true);

-- Allow anon to update sessions (start/end by examiner)
DROP POLICY IF EXISTS "Anon exam_hall_sessions update" ON public.exam_hall_sessions;
CREATE POLICY "Anon exam_hall_sessions update"
ON public.exam_hall_sessions FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);


-- ── 4. VIOLATIONS Table ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE violation_activity_type AS ENUM (
        'PHONE_DETECTED',
        'SUSPICIOUS_MOVEMENT',
        'POSSIBLE_COMMUNICATION',
        'UNAUTHORIZED_MATERIAL',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE violation_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE violation_status AS ENUM ('FLAGGED', 'REVIEWED', 'DISMISSED', 'CONFIRMED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.exam_hall_sessions(id) ON DELETE CASCADE,
    tracker_label VARCHAR(50) NOT NULL,  -- e.g. "Tracker #1", "Tracker #4"
    tracker_id INT,                       -- numeric tracker ID from CV model
    activity_type violation_activity_type NOT NULL,
    severity violation_severity NOT NULL DEFAULT 'MEDIUM',
    status violation_status NOT NULL DEFAULT 'FLAGGED',
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    evidence_url TEXT,                   -- Supabase Storage URL of the snapshot
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for violations
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "School violations select" ON public.violations;
CREATE POLICY "School violations select"
ON public.violations FOR SELECT
USING (
    session_id IN (
        SELECT s.id FROM public.exam_hall_sessions s
        WHERE s.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "School violations update" ON public.violations;
CREATE POLICY "School violations update"
ON public.violations FOR UPDATE
USING (
    session_id IN (
        SELECT s.id FROM public.exam_hall_sessions s
        WHERE s.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

-- CV model & anon can INSERT violations
DROP POLICY IF EXISTS "Anon violations insert" ON public.violations;
CREATE POLICY "Anon violations insert"
ON public.violations FOR INSERT
TO anon
WITH CHECK (true);

-- Anon can read violations for examiner console
DROP POLICY IF EXISTS "Anon violations read" ON public.violations;
CREATE POLICY "Anon violations read"
ON public.violations FOR SELECT
TO anon
USING (true);
