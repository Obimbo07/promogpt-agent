-- Structured outputs + errors for workflow / agent runs (processor uses service role).
ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS output jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS error_message text;

COMMENT ON COLUMN public.workflow_runs.output IS 'JSON result from workflow processor (agent markdown + metadata).';
COMMENT ON COLUMN public.workflow_runs.error_message IS 'Failure reason when status is failed.';
