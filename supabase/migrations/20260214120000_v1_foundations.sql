-- PromoGPT-Agent V1 foundations: orgs, workspaces, RBAC, workflows, billing stubs, usage.
-- Apply in Supabase SQL editor or via: supabase db push / migration tooling.

-- Roles
DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('viewer', 'editor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_run_status AS ENUM ('pending', 'running', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  status public.workflow_run_status NOT NULL DEFAULT 'pending',
  triggered_by uuid REFERENCES auth.users(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  quantity bigint NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connector_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  display_name text,
  credentials_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

-- SECURITY DEFINER helpers (avoid widening direct table INSERT privileges)
CREATE OR REPLACE FUNCTION public.create_organization_with_admin(org_name text, org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_id;

  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (new_id, auth.uid(), 'admin');

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_with_admin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_workspace_for_org(
  p_org_id uuid,
  p_name text,
  p_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.workspaces (organization_id, name, slug)
  VALUES (p_org_id, p_name, p_slug)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_for_org(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_org(uuid, text, text) TO authenticated;

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_accounts ENABLE ROW LEVEL SECURITY;

-- Organizations: visible to members
DROP POLICY IF EXISTS organizations_select_member ON public.organizations;
CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
    )
  );

-- Memberships: users see their own rows
DROP POLICY IF EXISTS memberships_select_self ON public.organization_memberships;
CREATE POLICY memberships_select_self ON public.organization_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Workspaces: org members
DROP POLICY IF EXISTS workspaces_select_member ON public.workspaces;
CREATE POLICY workspaces_select_member ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = workspaces.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- Workflow definitions: org members (read); editors+ (write)
DROP POLICY IF EXISTS workflow_definitions_select_member ON public.workflow_definitions;
CREATE POLICY workflow_definitions_select_member ON public.workflow_definitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workflow_definitions.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_definitions_insert_editor ON public.workflow_definitions;
CREATE POLICY workflow_definitions_insert_editor ON public.workflow_definitions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workflow_definitions.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workflow_definitions_update_editor ON public.workflow_definitions;
CREATE POLICY workflow_definitions_update_editor ON public.workflow_definitions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workflow_definitions.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workflow_definitions_delete_editor ON public.workflow_definitions;
CREATE POLICY workflow_definitions_delete_editor ON public.workflow_definitions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = workflow_definitions.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

-- Runs: members read; editors+ insert/update
DROP POLICY IF EXISTS workflow_runs_select_member ON public.workflow_runs;
CREATE POLICY workflow_runs_select_member ON public.workflow_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflow_definitions d
      JOIN public.workspaces w ON w.id = d.workspace_id
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE d.id = workflow_runs.workflow_definition_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_runs_insert_editor ON public.workflow_runs;
CREATE POLICY workflow_runs_insert_editor ON public.workflow_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflow_definitions d
      JOIN public.workspaces w ON w.id = d.workspace_id
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE d.id = workflow_runs.workflow_definition_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS workflow_runs_update_editor ON public.workflow_runs;
CREATE POLICY workflow_runs_update_editor ON public.workflow_runs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workflow_definitions d
      JOIN public.workspaces w ON w.id = d.workspace_id
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE d.id = workflow_runs.workflow_definition_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );

-- Billing: org admins read; writes via service role / webhooks only
DROP POLICY IF EXISTS billing_customers_select_admin ON public.billing_customers;
CREATE POLICY billing_customers_select_admin ON public.billing_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = billing_customers.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

DROP POLICY IF EXISTS billing_subscriptions_select_admin ON public.billing_subscriptions;
CREATE POLICY billing_subscriptions_select_admin ON public.billing_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = billing_subscriptions.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- Usage: members insert & read within org
DROP POLICY IF EXISTS usage_select_member ON public.usage_events;
CREATE POLICY usage_select_member ON public.usage_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = usage_events.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS usage_insert_member ON public.usage_events;
CREATE POLICY usage_insert_member ON public.usage_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id = usage_events.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- Connectors: workspace members read; editors+ write
DROP POLICY IF EXISTS connector_accounts_select_member ON public.connector_accounts;
CREATE POLICY connector_accounts_select_member ON public.connector_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = connector_accounts.workspace_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS connector_accounts_write_editor ON public.connector_accounts;
CREATE POLICY connector_accounts_write_editor ON public.connector_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = connector_accounts.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.organization_memberships m ON m.organization_id = w.organization_id
      WHERE w.id = connector_accounts.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'editor')
    )
  );
