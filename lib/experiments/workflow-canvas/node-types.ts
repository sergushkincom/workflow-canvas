import type { TypeTintKey } from "./tokens";

export const PALETTE_ICON_NAMES = [
  "AlignLeft",
  "Clock",
  "Database",
  "Filter",
  "History",
  "Hourglass",
  "Mail",
  "MessageSquare",
  "PenLine",
  "Search",
  "Send",
  "Sparkles",
  "Split",
  "Ticket",
  "Users",
  "Webhook",
  "Zap",
] as const;

export type PaletteIconName = (typeof PALETTE_ICON_NAMES)[number];

export const NODE_GROUPS = [
  { id: "triggers", label: "Triggers", icon: "Zap", tint: "trigger" },
  { id: "logic", label: "Logic", icon: "Filter", tint: "condition" },
  { id: "ai-steps", label: "AI steps", icon: "Sparkles", tint: "aiStep" },
  { id: "actions", label: "Actions", icon: "Send", tint: "neutral" },
  { id: "data", label: "Data", icon: "Database", tint: "neutral" },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: PaletteIconName;
  tint: TypeTintKey;
}[];

export type NodeGroupLabel = (typeof NODE_GROUPS)[number]["label"];

export type NodeTypeDef = {
  id: string;
  group: NodeGroupLabel;
  title: string;
  subtitle: string;
  icon: PaletteIconName;
  tint: TypeTintKey;
  /**
   * Palette label when the title hides a name people actually search for.
   * The canvas node keeps `title`.
   */
  paletteLabel?: string;
  /** Extra search words. Not shown on the canvas node. */
  aliases: readonly string[];
};

export type NodeGroup = (typeof NODE_GROUPS)[number] & {
  types: NodeTypeDef[];
};

export const NODE_TYPES: NodeTypeDef[] = [
  {
    id: "new-ticket-received",
    group: "Triggers",
    title: "New ticket received",
    subtitle: "Runs when a ticket arrives",
    icon: "Ticket",
    tint: "trigger",
    aliases: ["inbox", "created", "support", "request"],
  },
  {
    id: "on-a-schedule",
    group: "Triggers",
    title: "On a schedule",
    subtitle: "Runs at a time you set",
    icon: "Clock",
    tint: "trigger",
    aliases: ["cron", "timer", "interval", "recurring", "clock", "every"],
  },
  {
    id: "incoming-webhook",
    group: "Triggers",
    title: "Incoming webhook",
    subtitle: "Runs when a request arrives",
    icon: "Webhook",
    tint: "trigger",
    aliases: ["http", "hook", "api", "endpoint", "callback"],
  },
  {
    id: "condition",
    group: "Logic",
    title: "Condition",
    subtitle: "Routes the flow on a value",
    icon: "Filter",
    tint: "condition",
    paletteLabel: "Condition (If)",
    aliases: [
      "if",
      "if/else",
      "if else",
      "ifelse",
      "else",
      "branch",
      "switch",
      "filter",
      "when",
      "unless",
      "true/false",
    ],
  },
  {
    id: "wait",
    group: "Logic",
    title: "Wait",
    subtitle: "Pauses before the next step",
    icon: "Hourglass",
    tint: "condition",
    aliases: ["delay", "pause", "sleep", "hold", "timer"],
  },
  {
    id: "split-by-field",
    group: "Logic",
    title: "Split by field",
    subtitle: "Branches on a field value",
    icon: "Split",
    tint: "condition",
    aliases: ["switch", "branch", "route", "case"],
  },
  {
    id: "classify-intent",
    group: "AI steps",
    title: "Classify intent",
    subtitle: "Labels what the ticket is about",
    icon: "Sparkles",
    tint: "aiStep",
    aliases: ["classification", "category", "label", "tag", "intent", "ai"],
  },
  {
    id: "summarise-thread",
    group: "AI steps",
    title: "Summarise thread",
    subtitle: "Writes a short recap",
    icon: "AlignLeft",
    tint: "aiStep",
    aliases: ["summarize", "summary", "tldr", "tl;dr", "ai"],
  },
  {
    id: "draft-reply",
    group: "AI steps",
    title: "Draft reply",
    subtitle: "Prepares a customer reply",
    icon: "MessageSquare",
    tint: "aiStep",
    aliases: ["response", "compose", "answer", "ai"],
  },
  {
    id: "assign-to-queue",
    group: "Actions",
    title: "Assign to queue",
    subtitle: "Moves the ticket to a queue",
    icon: "Users",
    tint: "neutral",
    aliases: ["assign", "team", "owner", "handoff", "escalate"],
  },
  {
    id: "send-email",
    group: "Actions",
    title: "Send email",
    subtitle: "Sends a message",
    icon: "Mail",
    tint: "neutral",
    aliases: ["email", "mail", "notify", "notification", "smtp"],
  },
  {
    id: "update-ticket-field",
    group: "Actions",
    title: "Update ticket field",
    subtitle: "Writes a value on the ticket",
    icon: "PenLine",
    tint: "neutral",
    aliases: ["set", "edit", "write", "patch", "change"],
  },
  {
    id: "look-up-customer",
    group: "Data",
    title: "Look up customer",
    subtitle: "Loads the customer record",
    icon: "Search",
    tint: "neutral",
    aliases: ["lookup", "crm", "account", "contact"],
  },
  {
    id: "fetch-order-history",
    group: "Data",
    title: "Fetch order history",
    subtitle: "Loads recent orders",
    icon: "History",
    tint: "neutral",
    aliases: ["orders", "purchase", "commerce"],
  },
];

const GROUP_CHIP: Record<NodeGroupLabel, string> = {
  Triggers: "Trigger",
  Logic: "Logic",
  "AI steps": "AI step",
  Actions: "Action",
  Data: "Data",
};

export function nodeTypeChip(group: NodeGroupLabel): string {
  return GROUP_CHIP[group];
}

export function getNodeType(id: string): NodeTypeDef | undefined {
  return NODE_TYPES.find((nodeType) => nodeType.id === id);
}

export function nodeTypePaletteLabel(nodeType: NodeTypeDef): string {
  return nodeType.paletteLabel ?? nodeType.title;
}

function nodeTypeSearchParts(nodeType: NodeTypeDef): string[] {
  return [
    nodeType.title,
    nodeType.paletteLabel ?? "",
    nodeType.subtitle,
    ...nodeType.aliases,
  ].filter((part) => part.length > 0);
}

// Word prefixes, not a raw substring: "if" matches the If alias and does not
// match the same letters inside another word ("classify", "notify").
function partMatchesQuery(part: string, needle: string): boolean {
  const text = part.toLowerCase();
  const words = text.match(/[a-z0-9]+/g) ?? [];
  if (words.some((word) => word.startsWith(needle))) {
    return true;
  }
  return needle.length >= 3 && text.includes(needle);
}

export function nodeTypeMatchesQuery(
  nodeType: NodeTypeDef,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return nodeTypeSearchParts(nodeType).some((part) =>
    partMatchesQuery(part, needle),
  );
}

export function filterNodeTypes(
  types: readonly NodeTypeDef[],
  query: string,
): NodeTypeDef[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...types];
  }
  return types.filter((nodeType) => nodeTypeMatchesQuery(nodeType, needle));
}

export function nodeTypeIsTrigger(id: string): boolean {
  return getNodeType(id)?.group === "Triggers";
}

export function groupNodeTypes(types: readonly NodeTypeDef[]): NodeGroup[] {
  return NODE_GROUPS.flatMap((group) => {
    const matched = types.filter((nodeType) => nodeType.group === group.label);
    if (matched.length === 0) {
      return [];
    }
    return [{ ...group, types: matched }];
  });
}
