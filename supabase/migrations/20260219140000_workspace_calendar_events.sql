-- Editorial calendar / scheduled posts per workspace (manual + agents). Google Calendar sync hooks reserved on columns.
CREATE TABLE IF NOT EXISTS public.workspace_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  time_zone text NOT NULL DEFAULT 'UTC',
  channel text CHECK (channel IS NULL OR channel IN ('tiktok', 'instagram', 'facebook', 'mixed', 'internal')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('draft', 'proposed', 'scheduled', 'completed', 'cancelled')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'agent', 'workflow')),
  workflow_run_id uuid REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  external_provider text,
  external_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_workspace_starts
  ON public.workspace_calendar_events (workspace_id, starts_at ASC);

ALTER TABLE public.workspace_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_calendar_events_select_member ON public.workspace_calendar_events;
CREATE POLICY workspace_calendar_events_select_member ON public.workspace_calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_calendar_events.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_calendar_events_insert_editor ON public.workspace_calendar_events;
CREATE POLICY workspace_calendar_events_insert_editor ON public.workspace_calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_calendar_events.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workspace_calendar_events_update_editor ON public.workspace_calendar_events;
CREATE POLICY workspace_calendar_events_update_editor ON public.workspace_calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_calendar_events.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_calendar_events.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workspace_calendar_events_delete_editor ON public.workspace_calendar_events;
CREATE POLICY workspace_calendar_events_delete_editor ON public.workspace_calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_calendar_events.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE public.workspace_calendar_events IS 'Scheduled posts / editorial slots; agents insert proposed rows; Google Calendar sync via external_* columns later.';
COMMENT ON COLUMN public.workspace_calendar_events.external_provider IS 'Reserved for google_calendar etc.';
COMMENT ON COLUMN public.workspace_calendar_events.external_event_id IS 'Remote calendar event id when synced.';
