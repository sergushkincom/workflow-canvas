"use client";

import {
  House,
  LayoutGrid,
  List,
  Lock,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

export const SIDEBAR_WIDTH_PX = 232;
export const SIDEBAR_RAIL_PX = 56;

/** Below this width the home sidebar collapses to the icon rail. */
export const SIDEBAR_COLLAPSE_QUERY = "(max-width: 1023px)";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export type ShellSection =
  | "home"
  | "workflows"
  | "executions"
  | "credentials"
  | "settings";

type NavItem = {
  id: ShellSection | "templates";
  label: string;
  icon: LucideIcon | "flow";
};

const PRIMARY: NavItem[] = [
  { id: "home", label: "Home", icon: House },
  { id: "workflows", label: "Workflows", icon: "flow" },
  { id: "templates", label: "Templates", icon: LayoutGrid },
  { id: "executions", label: "Executions", icon: List },
  { id: "credentials", label: "Credentials", icon: Lock },
];

type AppSidebarProps = {
  section: ShellSection;
  /** Icon rail: logo mark and nav icons, labels available to assistive tech and tooltips. */
  collapsed: boolean;
  modalOpen: boolean;
  onSection: (section: ShellSection) => void;
  onOpenTemplates: () => void;
};

function FlowMark({
  size = 16,
  strokeWidth = 1.6,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H13a3 3 0 0 1 3 3v6.5" />
    </svg>
  );
}

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "flow") {
    return <FlowMark />;
  }
  const Icon = icon;
  return <Icon size={16} strokeWidth={1.6} aria-hidden />;
}

export function AppSidebar({
  section,
  collapsed,
  modalOpen,
  onSection,
  onOpenTemplates,
}: AppSidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className="flex h-full shrink-0 flex-col border-r"
        style={{
          width: collapsed ? SIDEBAR_RAIL_PX : SIDEBAR_WIDTH_PX,
          borderColor: color.border,
          background: color.surface,
        }}
        aria-label="Workflow Builder"
        data-sidebar-mode={collapsed ? "rail" : "expanded"}
      >
        <RailTip label="Workflow Builder" enabled={collapsed}>
          <button
            type="button"
            className={cn(
              "flex items-center rounded-[8px] text-left text-[15px] font-semibold",
              collapsed
                ? "mx-auto mt-3 size-[34px] justify-center"
                : "mx-3 mt-4 gap-2.5 px-2 py-1",
              focusRing,
            )}
            style={{ color: color.ink }}
            aria-label={collapsed ? "Workflow Builder" : undefined}
            onClick={() => onSection("home")}
          >
            <span
              className="grid size-[26px] shrink-0 place-items-center rounded-[8px] text-[var(--surface)]"
              style={{ background: color.ink }}
            >
              <FlowMark size={14} strokeWidth={2.2} />
            </span>
            {collapsed ? null : "Workflow Builder"}
          </button>
        </RailTip>
        <nav
          aria-label="Primary"
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-3",
            collapsed ? "items-center px-0 pt-3" : "px-3 pt-4",
          )}
        >
          {PRIMARY.map((item) => (
            <RailButton
              key={item.id}
              label={item.label}
              collapsed={collapsed}
              active={item.id !== "templates" && item.id === section}
              templates={item.id === "templates"}
              modalOpen={modalOpen}
              onClick={() => {
                if (item.id === "templates") {
                  onOpenTemplates();
                  return;
                }
                onSection(item.id);
              }}
            >
              <NavIcon icon={item.icon} />
            </RailButton>
          ))}
          <RailButton
            label="Settings"
            collapsed={collapsed}
            active={section === "settings"}
            className="mt-auto"
            onClick={() => onSection("settings")}
          >
            <Settings size={16} strokeWidth={1.6} aria-hidden />
          </RailButton>
        </nav>
      </aside>
    </TooltipProvider>
  );
}

function RailButton({
  label,
  collapsed,
  active,
  templates = false,
  modalOpen = false,
  className,
  onClick,
  children,
}: {
  label: string;
  collapsed: boolean;
  active: boolean;
  templates?: boolean;
  modalOpen?: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <RailTip label={label} enabled={collapsed}>
      <button
        type="button"
        className={cn(
          "flex h-[34px] shrink-0 items-center rounded-[8px] text-[14px] font-medium hover:bg-[var(--field)]",
          collapsed ? "w-[34px] justify-center" : "gap-2.5 px-2.5",
          className,
          focusRing,
        )}
        style={{
          background: active ? color.field : "transparent",
          color: active ? color.ink : color.muted,
        }}
        aria-label={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        aria-haspopup={templates ? "dialog" : undefined}
        aria-expanded={templates ? modalOpen : undefined}
        onClick={onClick}
      >
        {children}
        {collapsed ? null : label}
      </button>
    </RailTip>
  );
}

function RailTip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactElement;
}) {
  if (!enabled) {
    return children;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="border-0 bg-ink px-2 py-1 text-[12px] text-surface"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
