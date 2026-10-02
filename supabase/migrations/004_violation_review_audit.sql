ALTER TABLE public.violations
ADD COLUMN IF NOT EXISTS threshold_score NUMERIC(3, 2) NOT NULL DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS review_action TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by_type TEXT CHECK (reviewed_by_type IS NULL OR reviewed_by_type = 'examiner'),
ADD COLUMN IF NOT EXISTS reviewed_by_session_id UUID REFERENCES public.exam_hall_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE TABLE IF NOT EXISTS public.violation_review_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
    hall_session_id UUID NOT NULL REFERENCES public.exam_hall_sessions(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type = 'examiner'),
    actor_session_id UUID NOT NULL REFERENCES public.exam_hall_sessions(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('CONFIRM', 'DISMISS', 'ESCALATE')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_violation_review_audit_violation_created
ON public.violation_review_audit(violation_id, created_at DESC);

ALTER TABLE public.violation_review_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.review_violation(
    p_violation_id UUID,
    p_hall_session_id UUID,
    p_decision TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_session_id UUID;
    next_status public.violation_status;
    reviewed_time TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
    updated_violation JSONB;
BEGIN
    IF p_decision NOT IN ('CONFIRM', 'DISMISS', 'ESCALATE') THEN
        RAISE EXCEPTION 'Unsupported review decision';
    END IF;

    SELECT session_id INTO target_session_id
    FROM public.violations
    WHERE id = p_violation_id
    FOR UPDATE;

    IF target_session_id IS NULL THEN
        RAISE EXCEPTION 'Violation not found';
    END IF;

    IF target_session_id <> p_hall_session_id THEN
        RAISE EXCEPTION 'Hall session does not match violation';
    END IF;

    next_status := CASE p_decision
        WHEN 'CONFIRM' THEN 'CONFIRMED'::public.violation_status
        WHEN 'DISMISS' THEN 'DISMISSED'::public.violation_status
        ELSE 'REVIEWED'::public.violation_status
    END;

    UPDATE public.violations
    SET status = next_status,
        review_action = p_decision,
        reviewed_by_type = 'examiner',
        reviewed_by_session_id = p_hall_session_id,
        reviewed_at = reviewed_time,
        review_note = NULLIF(BTRIM(p_note), '')
    WHERE id = p_violation_id
    RETURNING to_jsonb(violations) INTO updated_violation;

    INSERT INTO public.violation_review_audit (
        violation_id,
        hall_session_id,
        actor_type,
        actor_session_id,
        decision,
        note,
        created_at
    ) VALUES (
        p_violation_id,
        target_session_id,
        'examiner',
        p_hall_session_id,
        p_decision,
        NULLIF(BTRIM(p_note), ''),
        reviewed_time
    );

    RETURN updated_violation;
END;
$$;

REVOKE ALL ON FUNCTION public.review_violation(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_violation(UUID, UUID, TEXT, TEXT) TO service_role;