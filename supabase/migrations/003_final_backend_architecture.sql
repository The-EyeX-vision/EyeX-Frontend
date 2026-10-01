-- ============================================================
-- EyeX — Final Backend Architecture Migration (003)
-- Compliant with EyeX Backend & Supabase Development Requirements
-- Fully idempotent and handles legacy table upgrades automatically.
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SCHOOLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_auth_user_id ON public.schools (auth_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_auth_user_id_key'
  ) THEN
    ALTER TABLE public.schools ADD CONSTRAINT schools_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;


-- ============================================================
-- 2. CLASSROOMS TABLE (EXAMINATION HALLS)
-- Access code belongs to the hall, NOT individual sessions!
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  access_code text NOT NULL UNIQUE,
  code_valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_school_id ON public.classrooms (school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_access_code ON public.classrooms (access_code);

-- ============================================================
-- 3. CAMERAS TABLE
-- Linked to classrooms. Cameras belong to halls.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  camera_number integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OFFLINE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_classroom_camera_number UNIQUE (classroom_id, camera_number)
);

CREATE INDEX IF NOT EXISTS idx_cameras_classroom_id ON public.cameras (classroom_id);

-- ============================================================
-- 4. EXAM_SESSIONS TABLE UPGRADE / CREATION
-- Handles legacy table upgrade: if exam_sessions exists with old
-- schema (without classroom_id), drops the old version and recreates it.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'exam_sessions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'exam_sessions' AND column_name = 'classroom_id'
  ) THEN
    -- Drop legacy exam_sessions and any legacy dependent views/tables
    DROP TABLE public.exam_sessions CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  course_code text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  student_count integer NOT NULL DEFAULT 0 CHECK (student_count >= 0),
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_classroom_id ON public.exam_sessions (classroom_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON public.exam_sessions (status);

-- ------------------------------------------------------------
-- CRITICAL CONCURRENCY RULE (MANDATORY):
-- ONE HALL CAN HAVE ONLY ONE ACTIVE SESSION AT A TIME.
-- Enforced at the PostgreSQL engine level via UNIQUE PARTIAL INDEX!
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_classroom
  ON public.exam_sessions (classroom_id)
  WHERE (status = 'ACTIVE');

-- ============================================================
-- 5. SESSION_STUDENTS TABLE (TRACKERS)
-- Temporary tracker identities detected by CV model during session
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  tracker_label text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_session_tracker_label UNIQUE (session_id, tracker_label)
);

CREATE INDEX IF NOT EXISTS idx_session_students_session_id ON public.session_students (session_id);

-- ============================================================
-- 6. STUDENT_VIOLATIONS TABLE
-- Suspicious activities for a tracker.
-- RULE: ONE TRACKER + ONE ACTIVITY TYPE = ONE VIOLATION RECORD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_student_id uuid NOT NULL REFERENCES public.session_students(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  count integer NOT NULL DEFAULT 1 CHECK (count > 0),
  image_path text,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_violation_activity UNIQUE (session_student_id, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_student_violations_session_student ON public.student_violations (session_student_id);
CREATE INDEX IF NOT EXISTS idx_student_violations_activity ON public.student_violations (activity_type);

-- ============================================================
-- 7. SUPABASE STORAGE BUCKET: violation-evidence
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('violation-evidence', 'violation-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can read/insert evidence
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read of violation evidence" ON storage.objects;
  CREATE POLICY "Allow authenticated read of violation evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'violation-evidence');

  DROP POLICY IF EXISTS "Allow authenticated insert of violation evidence" ON storage.objects;
  CREATE POLICY "Allow authenticated insert of violation evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'violation-evidence');
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict school isolation across all tables.
-- ============================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_violations ENABLE ROW LEVEL SECURITY;

-- 8.1 SCHOOLS POLICIES
DROP POLICY IF EXISTS "Schools: select own" ON public.schools;
CREATE POLICY "Schools: select own" ON public.schools
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Schools: update own" ON public.schools;
CREATE POLICY "Schools: update own" ON public.schools
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Schools: insert own" ON public.schools;
CREATE POLICY "Schools: insert own" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- 8.2 CLASSROOMS POLICIES
DROP POLICY IF EXISTS "Classrooms: school isolation" ON public.classrooms;
CREATE POLICY "Classrooms: school isolation" ON public.classrooms
  FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM public.schools WHERE auth_user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT id FROM public.schools WHERE auth_user_id = auth.uid()));

-- 8.3 CAMERAS POLICIES
DROP POLICY IF EXISTS "Cameras: school isolation" ON public.cameras;
CREATE POLICY "Cameras: school isolation" ON public.cameras
  FOR ALL TO authenticated
  USING (classroom_id IN (
    SELECT c.id FROM public.classrooms c
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ))
  WITH CHECK (classroom_id IN (
    SELECT c.id FROM public.classrooms c
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ));

-- 8.4 EXAM_SESSIONS POLICIES
DROP POLICY IF EXISTS "ExamSessions: school isolation" ON public.exam_sessions;
CREATE POLICY "ExamSessions: school isolation" ON public.exam_sessions
  FOR ALL TO authenticated
  USING (classroom_id IN (
    SELECT c.id FROM public.classrooms c
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ))
  WITH CHECK (classroom_id IN (
    SELECT c.id FROM public.classrooms c
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ));

-- 8.5 SESSION_STUDENTS POLICIES
DROP POLICY IF EXISTS "SessionStudents: school isolation" ON public.session_students;
CREATE POLICY "SessionStudents: school isolation" ON public.session_students
  FOR ALL TO authenticated
  USING (session_id IN (
    SELECT es.id FROM public.exam_sessions es
    JOIN public.classrooms c ON es.classroom_id = c.id
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT es.id FROM public.exam_sessions es
    JOIN public.classrooms c ON es.classroom_id = c.id
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ));

-- 8.6 STUDENT_VIOLATIONS POLICIES
DROP POLICY IF EXISTS "StudentViolations: school isolation" ON public.student_violations;
CREATE POLICY "StudentViolations: school isolation" ON public.student_violations
  FOR ALL TO authenticated
  USING (session_student_id IN (
    SELECT ss.id FROM public.session_students ss
    JOIN public.exam_sessions es ON ss.session_id = es.id
    JOIN public.classrooms c ON es.classroom_id = c.id
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ))
  WITH CHECK (session_student_id IN (
    SELECT ss.id FROM public.session_students ss
    JOIN public.exam_sessions es ON ss.session_id = es.id
    JOIN public.classrooms c ON es.classroom_id = c.id
    JOIN public.schools s ON c.school_id = s.id
    WHERE s.auth_user_id = auth.uid()
  ));

-- ============================================================
-- 9. SUPABASE REALTIME CONFIGURATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exam_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_students;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_violations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_violations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'classrooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
  END IF;
END $$;
