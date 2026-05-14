"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  CalendarIcon,
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
  { href: "/onboarding", label: "Onboarding", icon: Building2Icon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/workflows", label: "Workflows", icon: WorkflowIcon },
  { href: "/agents", label: "Agents", icon: BotIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
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
            Telemetry
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2 px-2">
            <p className="text-xs leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
              Billing units and workflows load from APIs on Dashboard — no phantom agent feed here.
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action="/auth/sign-out" method="post" className="w-full">
              <SidebarMenuButton
                type="submit"
                tooltip="Sign out"
                className="w-full"
              >
                <SparklesIcon className="rotate-12 opacity-80" aria-hidden />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
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
