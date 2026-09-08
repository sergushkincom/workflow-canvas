// Type tints say what a step is. The accent says what the system is doing.
// These two sets never borrow from each other.

export const typeTint = {
  trigger: { tint: "#F4F1FE", ink: "#7C5CE0" },
  condition: { tint: "#FDF3E3", ink: "#C98A2E" },
  aiStep: { tint: "#EDF3FB", ink: "#3B72B8" },
} as const;

export type TypeTintKey = keyof typeof typeTint;

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

export const NODE_WIDTH = 440;

export const tokenStyle = {
  chip: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    borderRadius: 6,
    paddingInline: 8,
    paddingBlock: 2,
  },
  iconTile: {
    size: 32,
    radius: 8,
    icon: 16,
    stroke: 1.5,
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
  ].join(";");
}
