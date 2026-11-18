"use client";

import { ChevronDown, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getNodeType } from "@/lib/experiments/workflow-canvas/node-types";
import {
  PREVIEW_LABEL,
  TEMPLATES,
  TEMPLATE_SORTS,
  categoryCounts,
  filterTemplates,
  previewTint,
  templateAppOptions,
  templateMeta,
  templatePreview,
  type TemplateCategory,
  type TemplateSort,
  type WorkflowTemplate,
} from "@/lib/experiments/workflow-canvas/templates";
import {
  color,
  typeTint,
} from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

type TemplatesModalProps = {
  open: boolean;
  /** Pixels the sidebar occupies. The scrim starts to the right of it. */
  sidebarWidth: number;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: WorkflowTemplate) => void;
  onStartBlank: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

export function TemplatesModal({
  open,
  sidebarWidth,
  onOpenChange,
  onUseTemplate,
  onStartBlank,
  onCloseAutoFocus,
}: TemplatesModalProps) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const [nodeTypeId, setNodeTypeId] = useState("");
  const [sort, setSort] = useState<TemplateSort>("popular");
  const [pickedId, setPickedId] = useState(TEMPLATES[0]?.id ?? "");
  const [searchFocused, setSearchFocused] = useState(false);

  const results = useMemo(
    () =>
      filterTemplates(TEMPLATES, {
        query,
        category,
        nodeTypeId,
        sort,
      }),
    [query, category, nodeTypeId, sort],
  );
  const selectedId = results.some((template) => template.id === pickedId)
    ? pickedId
    : (results[0]?.id ?? "");
  const selected = results.find((template) => template.id === selectedId);
  const counts = useMemo(
    () => categoryCounts(TEMPLATES, { query, nodeTypeId }),
    [query, nodeTypeId],
  );
  const apps = useMemo(() => templateAppOptions(), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function confirmSelected() {
    if (!selected) {
      return;
    }
    onUseTemplate(selected);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[color-mix(in_srgb,var(--ink)_28%,transparent)] [animation:none!important]"
        overlayStyle={{ left: sidebarWidth }}
        className="flex h-[min(720px,calc(100dvh-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-none [animation:none!important] sm:max-w-none"
        style={{
          background: color.surface,
          animation: "none",
          opacity: 1,
          left: `calc(50% + ${sidebarWidth / 2}px)`,
          width: `min(1000px, calc(100vw - ${sidebarWidth}px - 2rem))`,
          boxShadow:
            "0 2px 4px color-mix(in srgb, var(--ink) 4%, transparent), 0 24px 64px -12px color-mix(in srgb, var(--ink) 28%, transparent)",
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={(event) => {
          if (
            event.key !== "Enter" ||
            event.altKey ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey
          ) {
            return;
          }
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }
          if (target.closest("button, a, select, textarea")) {
            return;
          }
          if (target instanceof HTMLInputElement && target.type !== "radio") {
            return;
          }
          event.preventDefault();
          confirmSelected();
        }}
      >
        <div className="px-6 pt-7 sm:px-8">
          <DialogTitle className="text-[24px] leading-8 font-semibold tracking-[-0.015em] text-ink">
            Start with a template
          </DialogTitle>
          <DialogDescription className="mt-1 text-[14px] text-ink-2">
            Pick one and it opens in the editor, ready to change. Every step
            stays editable.
          </DialogDescription>
        </div>
        <button
          type="button"
          className={`absolute top-5 right-5 grid size-8 place-items-center rounded-[8px] hover:bg-[var(--field)] ${focusRing}`}
          style={{ color: color.muted }}
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <div className="flex flex-wrap items-center gap-2.5 px-6 pt-5 sm:px-8">
          <div
            className="flex h-10 min-w-[200px] flex-1 items-center gap-2.5 rounded-[8px] border px-3"
            style={{
              borderColor: searchFocused ? "var(--accent)" : color.border,
              boxShadow: searchFocused
                ? "0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)"
                : undefined,
            }}
          >
            <Search
              size={16}
              strokeWidth={1.8}
              aria-hidden
              style={{ color: color.faint }}
            />
            <label className="sr-only" htmlFor={searchId}>
              Search templates
            </label>
            <input
              id={searchId}
              ref={searchRef}
              type="search"
              value={query}
              placeholder='Search templates or apps, e.g. "Email"'
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
              style={{ color: color.ink }}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {query ? null : (
              <kbd
                aria-hidden
                className="rounded-[4px] border px-1.5 py-px text-[11px] font-medium"
                style={{
                  borderColor: color.border,
                  background: color.field,
                  color: color.muted,
                }}
              >
                /
              </kbd>
            )}
          </div>
          <FilterSelect
            label="Apps"
            value={nodeTypeId}
            onChange={setNodeTypeId}
          >
            <option value="">Any</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(value) => setSort(value as TemplateSort)}
          >
            {TEMPLATE_SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div
          className="flex flex-wrap gap-2 border-b px-6 pt-3.5 pb-4 sm:px-8"
          style={{ borderColor: color.border }}
          role="radiogroup"
          aria-label="Category"
        >
          {counts.map((item) => {
            const checked = category === item.id;
            return (
              <label
                key={item.id}
                className={cn(
                  "inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent)]",
                )}
                style={{
                  borderColor: checked ? color.ink : color.border,
                  background: checked ? color.ink : color.surface,
                  color: checked ? color.surface : color.muted,
                }}
              >
                <input
                  type="radio"
                  name="template-category"
                  className="sr-only"
                  checked={checked}
                  aria-label={`${item.label}, ${item.count} templates`}
                  onChange={() => setCategory(item.id)}
                />
                <span aria-hidden>{item.label}</span>
                <span aria-hidden className="text-[11px] opacity-70">
                  {item.count}
                </span>
              </label>
            );
          })}
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-[18px] sm:px-8"
          style={{ background: "var(--page)" }}
        >
          <p className="sr-only" role="status">
            {results.length === 1
              ? "1 template"
              : `${results.length} templates`}
          </p>
          {results.length === 0 ? (
            <p className="px-1 text-[13px] leading-[1.4]" style={{ color: color.muted }}>
              No template matches that.
            </p>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="radiogroup"
              aria-label="Templates"
            >
              {results.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={template.id === selectedId}
                  onSelect={() => setPickedId(template.id)}
                  onOpen={() => onUseTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
        <div
          className="flex flex-wrap items-center gap-2 border-t px-6 py-3 sm:h-[68px] sm:flex-nowrap sm:px-8"
          style={{ borderColor: color.border, background: color.surface }}
        >
          <Button
            type="button"
            variant="ghost"
            className="h-[34px] rounded-[8px] px-3.5 text-[13px] font-medium text-ink-2"
            onClick={onStartBlank}
          >
            Start from scratch
          </Button>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            <p
              className="min-w-0 truncate text-[13px]"
              style={{ color: color.muted }}
            >
              Selected:{" "}
              <span className="font-semibold" style={{ color: color.ink }}>
                {selected?.name ?? "None"}
              </span>
            </p>
            <Button
              type="button"
              className="h-[34px] rounded-[8px] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-[var(--surface)] hover:bg-[var(--accent-hover)]"
              disabled={!selected}
              onClick={confirmSelected}
            >
              Edit this template
              <kbd
                aria-hidden
                className="rounded-[4px] border px-1.5 py-px text-[11px] font-medium"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--surface) 30%, transparent)",
                  background:
                    "color-mix(in srgb, var(--surface) 15%, transparent)",
                  color: "var(--surface)",
                }}
              >
                ↵
              </kbd>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="relative flex h-10 items-center gap-2 rounded-[8px] border pr-8 pl-3"
      style={{
        borderColor: focused ? "var(--accent)" : color.border,
        boxShadow: focused
          ? "0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)"
          : undefined,
        background: color.surface,
      }}
    >
      <span aria-hidden className="text-[13px]" style={{ color: color.muted }}>
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        className={`appearance-none bg-transparent pr-1 text-[13px] font-medium outline-none ${focusRing}`}
        style={{ color: color.ink }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        style={{ color: color.ink }}
      />
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onOpen,
}: {
  template: WorkflowTemplate;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const summaryId = `${template.id}-summary`;
  const kinds = templatePreview(template);
  return (
    <label
      className={cn(
        "flex h-full cursor-pointer flex-col gap-[9px] rounded-[12px] border p-3.5",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent)]",
      )}
      style={{
        background: color.surface,
        borderColor: selected ? "var(--accent)" : color.border,
        boxShadow: selected
          ? "0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)"
          : undefined,
      }}
      onDoubleClick={onOpen}
    >
      <input
        type="radio"
        name="workflow-template"
        className="sr-only"
        checked={selected}
        aria-label={template.name}
        aria-describedby={summaryId}
        onChange={onSelect}
      />
      <span id={summaryId} className="sr-only">
        {template.category}. {template.description} {templateMeta(template)}.
      </span>
      <span aria-hidden className="flex flex-col gap-[9px]">
        <FlowPreview kinds={kinds} />
        <span
          className="text-[15px] leading-5 font-semibold"
          style={{ color: color.ink }}
        >
          {template.name}
        </span>
        <span
          className="line-clamp-2 min-h-[36px] text-[13px] leading-[18px]"
          style={{ color: color.muted }}
        >
          {template.description}
        </span>
        <span
          className="mt-auto flex items-center gap-2 text-[12px]"
          style={{ color: color.faint }}
        >
          <AppBadges ids={template.badges} />
          {templateMeta(template)}
        </span>
      </span>
    </label>
  );
}

function FlowPreview({
  kinds,
}: {
  kinds: ReturnType<typeof templatePreview>;
}) {
  return (
    <span
      className="flex h-14 items-center justify-center gap-1.5 rounded-[8px]"
      style={{
        backgroundColor: "var(--page)",
        backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
    >
      {kinds.map((kind, index) => {
        const tint = typeTint[previewTint(kind)];
        return (
          <span key={`${kind}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span
                className="h-[1.5px] w-3.5"
                style={{ background: "var(--line-strong)" }}
              />
            ) : null}
            <span
              className="flex h-[26px] items-center rounded-[6px] px-2 text-[11px] font-semibold tracking-[0.04em] uppercase"
              style={{ background: tint.tint, color: tint.ink }}
            >
              {PREVIEW_LABEL[kind]}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function AppBadges({ ids }: { ids: string[] }) {
  return (
    <span className="flex">
      {ids.slice(0, 3).map((id, index) => {
        const definition = getNodeType(id);
        const tint = typeTint[definition?.tint ?? "neutral"];
        const letter = (definition?.title ?? "?").slice(0, 1).toUpperCase();
        return (
          <span
            key={id}
            className="grid size-5 place-items-center rounded-[6px] border-2 text-[9px] font-bold"
            style={{
              background: tint.tint,
              color: tint.ink,
              borderColor: color.surface,
              marginLeft: index === 0 ? 0 : -4,
            }}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
