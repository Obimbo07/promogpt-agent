import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Workspace settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Editing reads from Postgres once profile APIs are surfaced — inputs below remain uncontrolled until wired.
        </p>
      </div>

      <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-lg">Workspace profile</CardTitle>
          <CardDescription>Displayed across mission control contexts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Display name
            </label>
            <Input placeholder="Marketing flagship label" aria-label="Workspace display name" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notifications email
            </label>
            <Input type="email" placeholder="ops@yourcompany.example" aria-label="Notifications email" />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-border/60" />

      <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-lg">Danger zone</CardTitle>
          <CardDescription>Dormant placeholders — avoids destructive workflows in v1.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pausing workspaces, resetting keys, exporting audit bundles — guarded for GA.
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button variant="destructive" disabled>
            Pause workspace
          </Button>
          <Button variant="outline" disabled>
            Export audit logs
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
