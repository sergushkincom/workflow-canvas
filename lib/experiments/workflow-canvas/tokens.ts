// Type tints say what a step is. The accent says what the system is doing.
// These two sets never borrow from each other.

/** State accent — selection, focus, running underline, confidence, pulse, primary CTA */
export const accent = "#0B7285";

/** Primary button hover (derived from accent, not a type tint) */
export const accentHover = "#096677";

export const color = {
  canvas: "#FBFBFA",
  dots: "#E3E1DD",
  surface: "#FFFFFF",
  border: "#E7E5E4",
  ink: "#1C1917",
  muted: "#78716C",
  faint: "#A8A29E",
  dashed: "#D6D3D1",
  field: "#F5F5F4",
} as const;

export const typeTint = {
  trigger: { tint: "#F4F1FE", ink: "#7C5CE0" },
  condition: { tint: "#FDF3E3", ink: "#C98A2E" },
  aiStep: { tint: "#EDF3FB", ink: "#3B72B8" },
  neutral: { tint: color.field, ink: color.muted },
} as const;

export type TypeTintKey = keyof typeof typeTint;

export const NODE_WIDTH = 440;

/** Type scale. No fractional sizes — 11 / 12 / 13 only. */
export const type = {
  meta: { fontSize: 11, lineHeight: 1.35, fontWeight: 500 },
  secondary: { fontSize: 12, lineHeight: 1.4, fontWeight: 400 },
  body: { fontSize: 13, lineHeight: 1.4, fontWeight: 400 },
  title: { fontSize: 13, lineHeight: 1.25, fontWeight: 600 },
} as const;

/** Corner radius. Chips use sm, fields and icon tiles use md, cards use lg. */
export const radius = { sm: 6, md: 8, lg: 12 } as const;

/** Focus and selection ring. One width, the state accent. */
export const ring = { width: 2, color: accent } as const;

/** Control heights. Icon buttons stay on the 24px chrome size. */
export const control = { compact: 28, cta: 32, iconButton: 24 } as const;

export const tokenStyle = {
  chip: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    borderRadius: radius.sm,
    paddingInline: 8,
    paddingBlock: 2,
  },
  iconTile: {
    size: 32,
    radius: radius.md,
    icon: 16,
    stroke: 1.5,
  },
  chromeIcon: {
    size: 14,
    stroke: 1.75,
  },
} as const;

/** CSS custom properties mirroring this file — inject once at the app root. */
export function tokensToCssVars(): string {
  return [
    `--page: ${color.canvas}`,
    `--surface: ${color.surface}`,
    `--ink: ${color.ink}`,
    `--ink-2: ${color.muted}`,
    `--ink-3: ${color.faint}`,
    `--field: ${color.field}`,
    `--hover: ${color.field}`,
    `--hover-2: ${color.border}`,
    `--line: ${color.border}`,
    `--line-strong: ${color.dashed}`,
    `--accent: ${accent}`,
    `--accent-hover: ${accentHover}`,
    `--dot: ${color.dots}`,
    `--border: ${color.border}`,
    `--ring-width: ${ring.width}px`,
    `--control-compact: ${control.compact}px`,
    `--control-cta: ${control.cta}px`,
    `--control-icon: ${control.iconButton}px`,
    `--fs-meta: ${type.meta.fontSize}px`,
    `--lh-meta: ${type.meta.lineHeight}`,
    `--fw-meta: ${type.meta.fontWeight}`,
    `--fs-secondary: ${type.secondary.fontSize}px`,
    `--lh-secondary: ${type.secondary.lineHeight}`,
    `--fw-secondary: ${type.secondary.fontWeight}`,
    `--fs-body: ${type.body.fontSize}px`,
    `--lh-body: ${type.body.lineHeight}`,
    `--fw-body: ${type.body.fontWeight}`,
    `--fs-title: ${type.title.fontSize}px`,
    `--lh-title: ${type.title.lineHeight}`,
    `--fw-title: ${type.title.fontWeight}`,
  ].join(";");
}
