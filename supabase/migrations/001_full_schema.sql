-- ============================================================
-- EyeX Full Application Schema Migration
-- Run AFTER schema.sql in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. EXAMS Table ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE exam_status AS ENUM ('scheduled', 'active', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 120,
    room_number VARCHAR(50) NOT NULL,
    status exam_status DEFAULT 'scheduled' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School exams access" ON public.exams;
CREATE POLICY "School exams access"
ON public.exams FOR ALL
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

-- ── 2. STUDENTS Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_number VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (school_id, student_number)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School students access" ON public.students;
CREATE POLICY "School students access"
ON public.students FOR ALL
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

-- ── 3. EXAM_STUDENTS (Assignment) Table ─────────────────────
CREATE TABLE IF NOT EXISTS public.exam_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    seat_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (exam_id, student_id)
);

ALTER TABLE public.exam_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School exam students access" ON public.exam_students;
CREATE POLICY "School exam students access"
ON public.exam_students FOR ALL
USING (
    exam_id IN (
        SELECT e.id FROM public.exams e
        WHERE e.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
)
WITH CHECK (
    exam_id IN (
        SELECT e.id FROM public.exams e
        WHERE e.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

-- ── 4. MONITORING_SESSIONS Table ────────────────────────────
DO $$ BEGIN
    CREATE TYPE monitoring_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    status monitoring_status DEFAULT 'active' NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.monitoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School monitoring sessions access" ON public.monitoring_sessions;
CREATE POLICY "School monitoring sessions access"
ON public.monitoring_sessions FOR ALL
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

-- ── 5. ALERTS Table ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE alert_event_type AS ENUM (
        'PHONE_DETECTED',
        'SUSPICIOUS_MOVEMENT',
        'POSSIBLE_COMMUNICATION',
        'UNAUTHORIZED_MATERIAL',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('FLAGGED', 'REVIEWED', 'DISMISSED', 'CONFIRMED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monitoring_session_id UUID NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    event_type alert_event_type NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    severity alert_severity NOT NULL DEFAULT 'MEDIUM',
    status alert_status NOT NULL DEFAULT 'FLAGGED',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for alerts
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "School alerts select" ON public.alerts;
CREATE POLICY "School alerts select"
ON public.alerts FOR SELECT
USING (
    monitoring_session_id IN (
        SELECT ms.id FROM public.monitoring_sessions ms
        WHERE ms.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "School alerts insert" ON public.alerts;
CREATE POLICY "School alerts insert"
ON public.alerts FOR INSERT
WITH CHECK (
    monitoring_session_id IN (
        SELECT ms.id FROM public.monitoring_sessions ms
        WHERE ms.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "School alerts update" ON public.alerts;
CREATE POLICY "School alerts update"
ON public.alerts FOR UPDATE
USING (
    monitoring_session_id IN (
        SELECT ms.id FROM public.monitoring_sessions ms
        WHERE ms.school_id IN (
            SELECT id FROM public.schools WHERE auth_user_id = auth.uid()
        )
    )
);

-- ── 6. Add exam_id to exam_sessions (legacy bridge) ─────────
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;
