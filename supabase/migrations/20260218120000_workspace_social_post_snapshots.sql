-- Per-post social performance snapshots (latest row wins per connector + external post id).
CREATE TABLE IF NOT EXISTS public.workspace_social_post_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connector_account_id uuid NOT NULL REFERENCES public.connector_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_post_id text NOT NULL,
  title text,
  permalink text,
  posted_at timestamptz,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_snap_provider_ok CHECK (provider IN ('tiktok', 'facebook', 'instagram'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_post_snap_dedupe
  ON public.workspace_social_post_snapshots (connector_account_id, external_post_id);

CREATE INDEX IF NOT EXISTS idx_social_post_snap_workspace_captured
  ON public.workspace_social_post_snapshots (workspace_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_post_snap_workspace_provider
  ON public.workspace_social_post_snapshots (workspace_id, provider);

ALTER TABLE public.workspace_social_post_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_social_post_snapshots_select_member ON public.workspace_social_post_snapshots;
CREATE POLICY workspace_social_post_snapshots_select_member ON public.workspace_social_post_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_post_snapshots.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_social_post_snapshots_insert_editor ON public.workspace_social_post_snapshots;
CREATE POLICY workspace_social_post_snapshots_insert_editor ON public.workspace_social_post_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_post_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workspace_social_post_snapshots_update_editor ON public.workspace_social_post_snapshots;
CREATE POLICY workspace_social_post_snapshots_update_editor ON public.workspace_social_post_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_post_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_post_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workspace_social_post_snapshots_delete_editor ON public.workspace_social_post_snapshots;
CREATE POLICY workspace_social_post_snapshots_delete_editor ON public.workspace_social_post_snapshots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workspace_social_post_snapshots.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );
