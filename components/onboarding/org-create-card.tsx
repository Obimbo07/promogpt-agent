import Link from "next/link";

import { createOrganizationFromOnboarding } from "@/app/actions/workspace";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function OrgCreateCard({ error }: { error?: string }) {
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your organization</h1>
        <p className="mt-2 text-muted-foreground">
          Organizations isolate billing, RBAC, and connector credentials. This calls the Supabase{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">create_organization_with_admin</code> RPC.
        </p>
      </div>
      <Card className="rounded-2xl border-border/80 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-lg">Basics</CardTitle>
          <CardDescription>Pick a display name; we will slugify unless you provide a slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganizationFromOnboarding} className="space-y-4">
            {error ? (
              <p className="text-sm text-accent-energy" role="alert">
                {safeDecode(error)}
              </p>
            ) : null}
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Organization name
              <Input name="name" required placeholder="Acme Growth" />
            </label>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Slug (optional)
              <Input name="slug" placeholder="acme-growth" />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="rounded-xl">
                Create &amp; continue
              </Button>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
                href="/dashboard"
              >
                Skip for now
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Need the SQL? Run migrations under{" "}
        <code className="rounded bg-muted px-1">supabase/migrations/</code> in your Supabase project first.
      </p>
    </>
  );
}
