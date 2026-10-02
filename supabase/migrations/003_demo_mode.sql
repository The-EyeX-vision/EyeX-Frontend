ALTER TABLE public.exam_hall_sessions
ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.violations
ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.exam_hall_sessions
SET demo_mode = TRUE
WHERE id IN (
	SELECT session_id
	FROM public.violations
	WHERE metadata ->> 'simulated' = 'true'
);

UPDATE public.violations
SET demo_mode = TRUE
WHERE metadata ->> 'simulated' = 'true'
   OR session_id IN (
	   SELECT id FROM public.exam_hall_sessions WHERE demo_mode = TRUE
   );