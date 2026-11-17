"use client";

import {
  House,
  LayoutGrid,
  List,
  Lock,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { color } from "@/lib/experiments/workflow-canvas/tokens";

export const SIDEBAR_WIDTH_PX = 232;

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
  modalOpen,
  onSection,
  onOpenTemplates,
}: AppSidebarProps) {
  return (
    <aside
      className="flex shrink-0 flex-col border-b md:h-full md:w-[232px] md:border-r md:border-b-0"
      style={{ borderColor: color.border, background: color.surface }}
      aria-label="Workflow Builder"
    >
      <button
        type="button"
        className={`flex items-center gap-2.5 rounded-[8px] px-2 py-1 text-left text-[15px] font-semibold md:px-5 md:pt-5 md:pb-5 ${focusRing}`}
        style={{ color: color.ink }}
        onClick={() => onSection("home")}
      >
        <span
          className="grid size-[26px] shrink-0 place-items-center rounded-[8px] text-[var(--surface)]"
          style={{ background: color.ink }}
        >
          <FlowMark size={14} strokeWidth={2.2} />
        </span>
        Workflow Builder
      </button>
      <nav
        aria-label="Primary"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-3 md:pb-4"
      >
        {PRIMARY.map((item) => {
          const active = item.id !== "templates" && item.id === section;
          const templates = item.id === "templates";
          return (
            <button
              key={item.id}
              type="button"
              className={`flex h-[34px] shrink-0 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] font-medium hover:bg-[var(--field)] ${focusRing}`}
              style={{
                background: active ? color.field : "transparent",
                color: active ? color.ink : color.muted,
              }}
              aria-current={active ? "page" : undefined}
              aria-haspopup={templates ? "dialog" : undefined}
              aria-expanded={templates ? modalOpen : undefined}
              onClick={() => {
                if (item.id === "templates") {
                  onOpenTemplates();
                  return;
                }
                onSection(item.id);
              }}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          className={`flex h-[34px] shrink-0 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] font-medium hover:bg-[var(--field)] md:mt-auto ${focusRing}`}
          style={{
            background: section === "settings" ? color.field : "transparent",
            color: section === "settings" ? color.ink : color.muted,
          }}
          aria-current={section === "settings" ? "page" : undefined}
          onClick={() => onSection("settings")}
        >
          <Settings size={16} strokeWidth={1.6} aria-hidden />
          Settings
        </button>
      </nav>
    </aside>
  );
}
