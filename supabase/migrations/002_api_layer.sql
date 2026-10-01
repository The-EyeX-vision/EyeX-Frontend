-- ══════════════════════════════════════════════════════════════════
-- EyeX Database Migration — API Layer additions
-- Run in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Add expected_students to exams ─────────────────────────────
-- The examiner enters this when creating an exam.
-- The CV model uses it for "Expected vs Detected" display.
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS expected_students integer NOT NULL DEFAULT 0;

-- ── 2. Add tracker_id to alerts ───────────────────────────────────
-- The CV centroid tracker ID — e.g. "Tracker 17"
-- NOT a registered student ID.
-- Stored as text to allow "Tracker N" format from detectionToAlert().
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS tracker_id text;

-- ── 3. Ensure alerts table is in the Realtime publication ─────────
-- Required for Supabase Realtime to push new alerts to the frontend.
-- Safe to run even if already added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;
END $$;

-- ── 4. Optional: Add tracker_id index for fast lookup ─────────────
CREATE INDEX IF NOT EXISTS idx_alerts_tracker_id ON public.alerts (tracker_id);
CREATE INDEX IF NOT EXISTS idx_alerts_monitoring_session_id ON public.alerts (monitoring_session_id);

-- ── 5. Note on classroom_alerts (legacy table) ────────────────────
-- The original classroom_alerts table uses student_id_tracker (integer).
-- We are NOT renaming it to avoid breaking existing data.
-- The new `alerts` table uses tracker_id (text, "Tracker N" format).
-- Both tables coexist. New monitoring sessions use `alerts`.
-- The old /api/alerts route has been replaced to use `alerts`.

-- ── 6. Verify ─────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exams'
  AND column_name = 'expected_students';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'alerts'
  AND column_name = 'tracker_id';
