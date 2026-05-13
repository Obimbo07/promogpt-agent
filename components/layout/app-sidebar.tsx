"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  BarChart3Icon,
  BotIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navPrimary = [
  { href: "/dashboard", label: "Mission Control", icon: LayoutDashboardIcon },
  { href: "/workflows", label: "Workflows", icon: WorkflowIcon },
  { href: "/agents", label: "Agents", icon: BotIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
];

const agentPulse = [
  { name: "Content sync", tone: "text-accent-success", label: "active" },
  { name: "Social optimizer", tone: "text-accent-secondary", label: "optimizing" },
  { name: "Deploy pipeline", tone: "text-muted-foreground", label: "learning" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/50 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg outline-none ring-sidebar-ring focus-visible:ring-2"
        >
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-primary",
              "shadow-[0_0_20px_color-mix(in_srgb,var(--accent-primary)_40%,transparent)]"
            )}
          >
            <SparklesIcon className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-semibold tracking-tight">PromoGPT</span>
            <span className="text-xs text-muted-foreground">AI command center</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 px-0 group-data-[collapsible=icon]:hidden">
          <Badge
            variant="outline"
            className="rounded-lg border-accent-secondary/40 bg-accent-secondary/10 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-secondary"
          >
            Runtime v1
          </Badge>
          <Badge
            variant="outline"
            className="rounded-lg border-accent-success/40 bg-accent-success/10 text-[0.65rem] uppercase tracking-wide text-accent-success"
          >
            Healthy
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPrimary.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    }
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <ActivityIcon className="size-3.5 text-accent-secondary" aria-hidden />
            AI activity
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2 px-2">
            <ul className="space-y-2 text-xs">
              {agentPulse.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 px-2 py-1.5 group-data-[collapsible=icon]:hidden"
                >
                  <span className="truncate text-sidebar-foreground">{row.name}</span>
                  <span className={cn("shrink-0 font-medium capitalize", row.tone)}>{row.label}</span>
                </li>
              ))}
            </ul>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" render={<Link href="/settings" />}>
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Back to landing"
              variant="outline"
              render={<Link href="/" />}
            >
              <SparklesIcon />
              <span>Marketing site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
