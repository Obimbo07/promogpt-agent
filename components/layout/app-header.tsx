"use client";

import { usePathname, useRouter } from "next/navigation";
import { BellIcon, SearchIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const titles: Record<string, string> = {
  dashboard: "Mission Control",
  workflows: "Workflow builder",
  agents: "AI agents",
  analytics: "Analytics",
  settings: "Workspace settings",
};

function titleFromPath(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Workspace";
  return titles[seg] ?? "Workspace";
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFromPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-[var(--glass-blur)] md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden h-6 md:block md:opacity-70" />
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-semibold tracking-tight md:text-xl">
            {title}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Realtime orchestration ·{" "}
            <span className="text-accent-secondary">Autosave on</span>
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:max-w-xl md:flex-none">
        <div className="relative flex-1 sm:min-w-[200px]">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search commands, workflows, docs…"
            className="h-9 rounded-lg border-border/80 bg-muted/40 pl-9 text-sm backdrop-blur-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-1.5 sm:justify-start">
          <Badge
            variant="outline"
            className="hidden rounded-lg border-accent-success/50 bg-accent-success/15 font-mono text-[0.65rem] uppercase tracking-wide text-accent-success lg:inline-flex"
          >
            All systems nominal
          </Badge>
          <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
            <BellIcon />
            <span className="absolute right-1.5 top-1.5 inline-flex size-1.5 rounded-full bg-accent-energy shadow-[0_0_12px_color-mix(in_srgb,var(--accent-energy)_65%,transparent)]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" }),
                "rounded-lg border-border/70 shrink-0"
              )}
              aria-label="Open profile menu"
            >
              <Avatar className="size-7 rounded-md">
                <AvatarFallback className="rounded-md bg-primary/90 text-[0.65rem] font-semibold text-primary-foreground">
                  PG
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48 rounded-xl border-border/80">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">PromoGPT workspace</p>
                <p className="text-xs font-normal text-muted-foreground">you@promogpt.app</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>Mission Control</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/")}>Leave workspace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
