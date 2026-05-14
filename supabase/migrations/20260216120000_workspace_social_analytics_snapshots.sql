-- Social analytics ingestion: snapshots linked to connector rows + optional sync job audit trail.
-- Applies cleanly if this migration was never applied before.

DROP TABLE IF EXISTS public.social_sync_jobs CASCADE;
DROP TABLE IF EXISTS public.workspace_social_analytics_snapshots CASCADE;

CREATE TABLE public.social_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'analytics_pull',
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  records_processed integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_social_sync_jobs_workspace_started
  ON public.social_sync_jobs (workspace_id, started_at DESC);

ALTER TABLE public.social_sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_sync_jobs_select_member ON public.social_sync_jobs;
CREATE POLICY social_sync_jobs_select_member ON public.social_sync_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = social_sync_jobs.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS social_sync_jobs_insert_editor ON public.social_sync_jobs;
CREATE POLICY social_sync_jobs_insert_editor ON public.social_sync_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = social_sync_jobs.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS social_sync_jobs_update_editor ON public.social_sync_jobs;
CREATE POLICY social_sync_jobs_update_editor ON public.social_sync_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = social_sync_jobs.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = social_sync_jobs.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

CREATE TABLE public.workspace_social_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connector_account_id uuid NOT NULL REFERENCES public.connector_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_granularity text NOT NULL DEFAULT 'hour',
  metric_scope text NOT NULL,
  account_external_id text,
  sync_status text NOT NULL DEFAULT 'success',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT snapshot_period_ok CHECK (period_granularity IN ('hour', 'day')),
  CONSTRAINT snapshot_sync_status_ok CHECK (sync_status IN ('success', 'partial', 'error'))
);

CREATE UNIQUE INDEX idx_social_snap_dedupe_window
  ON public.workspace_social_analytics_snapshots (connector_account_id, period_start, period_granularity, metric_scope);

CREATE INDEX IF NOT EXISTS idx_social_snap_workspace_captured
  ON public.workspace_social_analytics_snapshots (workspace_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_snap_connector_captured
  ON public.workspace_social_analytics_snapshots (connector_account_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_snap_account_external
  ON public.workspace_social_analytics_snapshots (workspace_id, account_external_id);

ALTER TABLE public.workspace_social_analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_social_analytics_select_member ON public.workspace_social_analytics_snapshots;
CREATE POLICY workspace_social_analytics_select_member ON public.workspace_social_analytics_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_analytics_snapshots.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_social_analytics_insert_editor ON public.workspace_social_analytics_snapshots;
CREATE POLICY workspace_social_analytics_insert_editor ON public.workspace_social_analytics_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_analytics_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workspace_social_analytics_update_editor ON public.workspace_social_analytics_snapshots;
CREATE POLICY workspace_social_analytics_update_editor ON public.workspace_social_analytics_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_analytics_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_analytics_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );
