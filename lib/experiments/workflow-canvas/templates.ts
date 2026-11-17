import { SEED_CONDITION, TRIGGER } from "./data";
import { initialFlowState } from "./flow-reducer";
import { getNodeType } from "./node-types";
import type { TypeTintKey } from "./tokens";
import type {
  ActionNode,
  ConditionNode,
  Conjunction,
  Flow,
  TriggerNode,
} from "./types";
import {
  CONDITION_DEFAULT_WIDTH,
  TRIGGER_DEFAULT_WIDTH,
} from "./types";

export const BLANK_WORKFLOW_NAME = "Untitled workflow";

/** Deep link that opens the seeded demo without the first-run screen. */
export const SEEDED_FLOW_ID = "support-triage";

export const TEMPLATE_CATEGORIES = [
  "Support",
  "Sales",
  "AI agents",
  "Data sync",
  "Notifications",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_SORTS = [
  { id: "popular", label: "Most used" },
  { id: "newest", label: "Newest" },
  { id: "name", label: "Name" },
] as const;

export type TemplateSort = (typeof TEMPLATE_SORTS)[number]["id"];

export type PreviewKind = "trigger" | "condition" | "ai" | "action" | "data";

export type TemplateConditionRow = {
  source: string;
  field: string;
  operator: string;
  value?: string;
};

export type TemplateStep =
  | {
      kind: "condition";
      conjunction: Conjunction;
      rows: TemplateConditionRow[];
    }
  | { kind: "action"; nodeTypeId: string };

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  triggerId: string;
  /** Node types shown as the small app marks, and included in the app filter. */
  badges: string[];
  popularity: number;
  /** ISO date. Newer sorts first. */
  createdAt: string;
  setupMinutes: number;
  /**
   * Optional chip row. When omitted, chips are derived from the steps.
   * Triage includes the classify step the test run adds, which is not an
   * editable node until the run starts.
   */
  preview?: PreviewKind[];
  steps: TemplateStep[];
};

const seedRows: TemplateConditionRow[] = SEED_CONDITION.rows.map((row) => ({
  source: row.source ?? "",
  field: row.field ?? "",
  operator: row.operator ?? "",
  value: row.value,
}));

export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: "triage-support-tickets",
    name: "Triage support tickets",
    description:
      "An AI step labels each ticket and routes it. Asks you when unsure.",
    category: "Support",
    triggerId: "new-ticket-received",
    badges: ["new-ticket-received", "classify-intent"],
    popularity: 100,
    createdAt: "2026-05-01",
    setupMinutes: 2,
    preview: ["trigger", "ai", "condition"],
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: seedRows,
      },
    ],
  },
  {
    id: "qualify-new-leads",
    name: "Qualify new leads",
    description:
      "Scores high-value customers, then labels the ticket.",
    category: "Sales",
    triggerId: "new-ticket-received",
    badges: ["new-ticket-received", "classify-intent"],
    popularity: 90,
    createdAt: "2026-06-01",
    setupMinutes: 3,
    steps: [
      {
        kind: "condition",
        conjunction: "or",
        rows: [
          {
            source: "customer",
            field: "plan",
            operator: "is",
            value: "enterprise",
          },
          {
            source: "customer",
            field: "lifetime-value",
            operator: "is greater than",
            value: "5000",
          },
        ],
      },
      { kind: "action", nodeTypeId: "classify-intent" },
    ],
  },
  {
    id: "daily-inbox-digest",
    name: "Daily inbox digest",
    description: "Summarises yesterday's email into one note at 9:00.",
    category: "Notifications",
    triggerId: "on-a-schedule",
    badges: ["on-a-schedule", "summarise-thread"],
    popularity: 80,
    createdAt: "2026-06-15",
    setupMinutes: 1,
    steps: [{ kind: "action", nodeTypeId: "summarise-thread" }],
  },
  {
    id: "sync-form-replies",
    name: "Sync form replies to a sheet",
    description:
      "Every new webhook ticket is checked. Duplicates are skipped.",
    category: "Data sync",
    triggerId: "incoming-webhook",
    badges: ["incoming-webhook", "update-ticket-field"],
    popularity: 70,
    createdAt: "2026-07-01",
    setupMinutes: 1,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "ticket",
            field: "channel",
            operator: "is",
            value: "api",
          },
        ],
      },
    ],
  },
  {
    id: "draft-replies-for-review",
    name: "Draft replies for review",
    description:
      "Writes a reply for each customer email and waits for your OK.",
    category: "AI agents",
    triggerId: "new-ticket-received",
    badges: ["draft-reply", "summarise-thread"],
    popularity: 60,
    createdAt: "2026-07-15",
    setupMinutes: 2,
    steps: [
      { kind: "action", nodeTypeId: "draft-reply" },
      { kind: "action", nodeTypeId: "summarise-thread" },
    ],
  },
  {
    id: "alert-on-failed-payments",
    name: "Alert on failed payments",
    description:
      "Routes the ticket when priority is urgent and the health score is low.",
    category: "Notifications",
    triggerId: "new-ticket-received",
    badges: ["new-ticket-received", "assign-to-queue"],
    popularity: 50,
    createdAt: "2026-08-01",
    setupMinutes: 2,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "ticket",
            field: "priority",
            operator: "is",
            value: "urgent",
          },
        ],
      },
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "account",
            field: "health-score",
            operator: "is less than",
            value: "50",
          },
        ],
      },
    ],
  },
  {
    id: "route-urgent-email",
    name: "Route urgent email",
    description: "Sends urgent email tickets to a queue.",
    category: "Support",
    triggerId: "new-ticket-received",
    badges: ["new-ticket-received", "assign-to-queue"],
    popularity: 40,
    createdAt: "2026-08-20",
    setupMinutes: 2,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "ticket",
            field: "channel",
            operator: "is",
            value: "email",
          },
          {
            source: "ticket",
            field: "priority",
            operator: "is",
            value: "urgent",
          },
        ],
      },
      { kind: "action", nodeTypeId: "assign-to-queue" },
    ],
  },
  {
    id: "welcome-new-accounts",
    name: "Welcome new accounts",
    description: "Emails accounts that are still on the Free plan.",
    category: "Sales",
    triggerId: "new-ticket-received",
    badges: ["send-email", "look-up-customer"],
    popularity: 35,
    createdAt: "2026-09-01",
    setupMinutes: 2,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "customer",
            field: "plan",
            operator: "is",
            value: "free",
          },
        ],
      },
      { kind: "action", nodeTypeId: "send-email" },
    ],
  },
  {
    id: "refresh-customer-context",
    name: "Refresh customer context",
    description: "Loads the customer record and recent orders for the ticket.",
    category: "Data sync",
    triggerId: "new-ticket-received",
    badges: ["look-up-customer", "fetch-order-history"],
    popularity: 30,
    createdAt: "2026-09-15",
    setupMinutes: 2,
    steps: [
      { kind: "action", nodeTypeId: "look-up-customer" },
      { kind: "action", nodeTypeId: "fetch-order-history" },
    ],
  },
  {
    id: "ask-before-escalating",
    name: "Ask before escalating",
    description: "Labels high-priority tickets and waits when it is not sure.",
    category: "AI agents",
    triggerId: "new-ticket-received",
    badges: ["classify-intent", "new-ticket-received"],
    popularity: 25,
    createdAt: "2026-10-01",
    setupMinutes: 2,
    steps: [
      {
        kind: "condition",
        conjunction: "or",
        rows: [
          {
            source: "ticket",
            field: "priority",
            operator: "is",
            value: "high",
          },
          {
            source: "ticket",
            field: "priority",
            operator: "is",
            value: "urgent",
          },
        ],
      },
      { kind: "action", nodeTypeId: "classify-intent" },
    ],
  },
  {
    id: "language-handoff",
    name: "Language handoff",
    description: "Moves tickets that are not in English to a queue.",
    category: "Support",
    triggerId: "new-ticket-received",
    badges: ["assign-to-queue", "new-ticket-received"],
    popularity: 20,
    createdAt: "2026-10-20",
    setupMinutes: 1,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "ticket",
            field: "language",
            operator: "is not",
            value: "english",
          },
        ],
      },
      { kind: "action", nodeTypeId: "assign-to-queue" },
    ],
  },
  {
    id: "renewal-watch",
    name: "Renewal watch",
    description: "Emails the account when the health score drops below 50.",
    category: "Notifications",
    triggerId: "on-a-schedule",
    badges: ["on-a-schedule", "send-email"],
    popularity: 15,
    createdAt: "2026-11-01",
    setupMinutes: 2,
    steps: [
      {
        kind: "condition",
        conjunction: "and",
        rows: [
          {
            source: "account",
            field: "health-score",
            operator: "is less than",
            value: "50",
          },
        ],
      },
      { kind: "action", nodeTypeId: "send-email" },
    ],
  },
];

export type TemplateQuery = {
  query?: string;
  category?: TemplateCategory | "All";
  nodeTypeId?: string;
  sort?: TemplateSort;
};

export function getTemplate(id: string): WorkflowTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

export function templateNodeIds(template: WorkflowTemplate): string[] {
  const ids = [template.triggerId, ...template.badges];
  for (const step of template.steps) {
    ids.push(step.kind === "condition" ? "condition" : step.nodeTypeId);
  }
  return [...new Set(ids)];
}

export function templatePreview(template: WorkflowTemplate): PreviewKind[] {
  if (template.preview) {
    return template.preview;
  }
  const kinds: PreviewKind[] = ["trigger"];
  for (const step of template.steps) {
    if (step.kind === "condition") {
      kinds.push("condition");
      continue;
    }
    const definition = getNodeType(step.nodeTypeId);
    if (definition?.tint === "aiStep") {
      kinds.push("ai");
    } else if (definition?.group === "Data") {
      kinds.push("data");
    } else {
      kinds.push("action");
    }
  }
  return kinds;
}

export function previewTint(kind: PreviewKind): TypeTintKey {
  switch (kind) {
    case "trigger":
      return "trigger";
    case "condition":
      return "condition";
    case "ai":
      return "aiStep";
    default:
      return "neutral";
  }
}

export const PREVIEW_LABEL: Record<PreviewKind, string> = {
  trigger: "Trigger",
  condition: "If",
  ai: "AI step",
  action: "Action",
  data: "Data",
};

export function templateStepCount(template: WorkflowTemplate): number {
  return 1 + template.steps.length;
}

export function templateMeta(template: WorkflowTemplate): string {
  const steps = templateStepCount(template);
  const stepLabel = steps === 1 ? "1 step" : `${steps} steps`;
  const minuteLabel =
    template.setupMinutes === 1
      ? "1 min setup"
      : `${template.setupMinutes} min setup`;
  return `${stepLabel} · ${minuteLabel}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(template: WorkflowTemplate, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    template.name,
    template.description,
    template.category,
    ...templateNodeIds(template).map((id) => getNodeType(id)?.title ?? id),
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterTemplates(
  templates: readonly WorkflowTemplate[],
  options: TemplateQuery = {},
): WorkflowTemplate[] {
  const query = normalize(options.query ?? "");
  const category = options.category ?? "All";
  const nodeTypeId = options.nodeTypeId ?? "";
  const sort = options.sort ?? "popular";

  const filtered = templates.filter((template) => {
    if (category !== "All" && template.category !== category) {
      return false;
    }
    if (nodeTypeId && !templateNodeIds(template).includes(nodeTypeId)) {
      return false;
    }
    return matchesQuery(template, query);
  });

  return filtered.slice().sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sort === "newest") {
      const byDate = b.createdAt.localeCompare(a.createdAt);
      return byDate === 0 ? a.name.localeCompare(b.name) : byDate;
    }
    const byPopularity = b.popularity - a.popularity;
    return byPopularity === 0 ? a.name.localeCompare(b.name) : byPopularity;
  });
}

export function categoryCounts(
  templates: readonly WorkflowTemplate[],
  options: Omit<TemplateQuery, "category" | "sort"> = {},
): { id: "All" | TemplateCategory; label: string; count: number }[] {
  const matched = filterTemplates(templates, {
    ...options,
    category: "All",
    sort: "name",
  });
  const counts = new Map<TemplateCategory, number>();
  for (const category of TEMPLATE_CATEGORIES) {
    counts.set(category, 0);
  }
  for (const template of matched) {
    counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
  }
  return [
    { id: "All", label: "All", count: matched.length },
    ...TEMPLATE_CATEGORIES.map((category) => ({
      id: category,
      label: category,
      count: counts.get(category) ?? 0,
    })),
  ];
}

export function templateAppOptions(
  templates: readonly WorkflowTemplate[] = TEMPLATES,
): { id: string; label: string }[] {
  const ids = new Set<string>();
  for (const template of templates) {
    for (const id of templateNodeIds(template)) {
      ids.add(id);
    }
  }
  return [...ids]
    .map((id) => ({ id, label: getNodeType(id)?.title ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function triggerFor(template: WorkflowTemplate): TriggerNode {
  if (template.id === "triage-support-tickets") {
    return {
      id: "trigger",
      title: TRIGGER.title,
      description: TRIGGER.description,
      width: TRIGGER_DEFAULT_WIDTH,
    };
  }
  const definition = getNodeType(template.triggerId);
  return {
    id: "trigger",
    title: definition?.title ?? TRIGGER.title,
    description: definition?.subtitle ?? TRIGGER.description,
    width: TRIGGER_DEFAULT_WIDTH,
  };
}

export function materializeTemplate(template: WorkflowTemplate): Flow {
  const triage = template.id === "triage-support-tickets";
  const steps = template.steps.map((step, index) => {
    if (step.kind === "condition") {
      const node: ConditionNode = {
        id:
          triage && index === 0
            ? SEED_CONDITION.id
            : `${template.id}-step-${index + 1}`,
        conjunction: step.conjunction,
        width: CONDITION_DEFAULT_WIDTH,
        rows: step.rows.map((row, rowIndex) => ({
          id:
            triage && index === 0
              ? (SEED_CONDITION.rows[rowIndex]?.id ??
                `${template.id}-row-${index + 1}-${rowIndex + 1}`)
              : `${template.id}-row-${index + 1}-${rowIndex + 1}`,
          source: row.source,
          field: row.field,
          operator: row.operator,
          value: row.value,
        })),
      };
      return node;
    }
    const definition = getNodeType(step.nodeTypeId);
    const node: ActionNode = {
      id: `${template.id}-step-${index + 1}`,
      kind: "action",
      nodeTypeId: step.nodeTypeId,
      title: definition?.title ?? step.nodeTypeId,
      subtitle: definition?.subtitle ?? "",
      width: CONDITION_DEFAULT_WIDTH,
    };
    return node;
  });

  return {
    trigger: triggerFor(template),
    steps,
  };
}

export function blankFlow(): Flow {
  return {
    trigger: {
      id: "trigger",
      title: TRIGGER.title,
      description: TRIGGER.description,
      width: TRIGGER_DEFAULT_WIDTH,
    },
    steps: [],
  };
}

export function resolveDirectOpen(
  flowId: string | null | undefined,
): { name: string; flow: Flow } | null {
  if (!flowId) {
    return null;
  }
  if (flowId === SEEDED_FLOW_ID) {
    return {
      name: "Support triage",
      flow: structuredClone(initialFlowState.flow),
    };
  }
  const template = getTemplate(flowId);
  if (!template) {
    return null;
  }
  return {
    name: template.name,
    flow: materializeTemplate(template),
  };
}
