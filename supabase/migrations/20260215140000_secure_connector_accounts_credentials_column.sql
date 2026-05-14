-- Hide server-only OAuth material from anon/authenticated direct column reads while keeping row access policies.
REVOKE SELECT (credentials_ref) ON public.connector_accounts FROM anon;

REVOKE SELECT (credentials_ref) ON public.connector_accounts FROM authenticated;
