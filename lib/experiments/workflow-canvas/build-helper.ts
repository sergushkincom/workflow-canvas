import { rowSignature } from "./assistant";
import { getField, getOperatorLabel, getValueLabel } from "./data";
import { getNodeType } from "./node-types";
import {
  getTemplate,
  type TemplateConditionRow,
  type WorkflowTemplate,
} from "./templates";
import {
  CONDITION_DEFAULT_WIDTH,
  isActionNode,
  isConditionNode,
  type Conjunction,
  type Flow,
} from "./types";

/** How long a stuck new user waits before the helper speaks up. */
export const IDLE_NUDGE_MS = 8_000;

export const NUDGE_MESSAGE =
  "Not sure where to start? I can set up a trigger for you";

export const BUILD_HELPER_LABEL = "Help me build";

export const BUILD_HELPER_DESCRIPTION =
  "Guides you while you build this workflow.";

export const NUDGE_CONTEXTS = ["empty-canvas", "trigger-picker"] as const;

export type NudgeContext = (typeof NUDGE_CONTEXTS)[number];

export type NudgeState = {
  /** Contexts that have already been offered this session. */
  used: NudgeContext[];
  visible: NudgeContext | null;
};

export function initialNudgeState(): NudgeState {
  return { used: [], visible: null };
}

export function nudgeDue(elapsedMs: number, delayMs = IDLE_NUDGE_MS): boolean {
  return elapsedMs >= delayMs;
}

/** Query override for tests. Anything else keeps the real delay. */
export function parseNudgeDelay(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === "") {
    return IDLE_NUDGE_MS;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return IDLE_NUDGE_MS;
  }
  return value;
}

export function showNudge(state: NudgeState, context: NudgeContext): NudgeState {
  if (state.used.includes(context) || state.visible != null) {
    return state;
  }
  return { used: [...state.used, context], visible: context };
}

export function dismissNudge(state: NudgeState): NudgeState {
  if (state.visible == null) {
    return state;
  }
  return { ...state, visible: null };
}

export const DEFAULT_APPLY_PERMISSION = "once" as const;

export type ApplyPermission = "once" | "session";

export function shouldAskPermission(alwaysAllow: boolean): boolean {
  return !alwaysAllow;
}

export function permissionAfterChoice(
  alwaysAllow: boolean,
  choice: ApplyPermission | "cancel",
): { alwaysAllow: boolean; apply: boolean } {
  if (choice === "cancel") {
    return { alwaysAllow, apply: false };
  }
  if (choice === "session") {
    return { alwaysAllow: true, apply: true };
  }
  return { alwaysAllow, apply: true };
}

export type HelperEvent =
  | { type: "open" }
  | { type: "close" }
  | { type: "propose"; intentId: string }
  | { type: "cancel"; intentId: string }
  | { type: "apply"; intentId: string; permission: ApplyPermission }
  | { type: "undo" };

export type HelperLog = {
  kept: boolean;
  events: HelperEvent[];
};

export function emptyHelperLog(): HelperLog {
  return { kept: false, events: [] };
}

/**
 * Opening and closing the helper is not a session. A session is kept only
 * after a proposal, a decision, an apply, or an undo.
 */
export function reduceHelperLog(log: HelperLog, event: HelperEvent): HelperLog {
  if (event.type === "open" || event.type === "close") {
    return log;
  }
  return { kept: true, events: [...log.events, event] };
}

export function isKeptSession(log: HelperLog): boolean {
  return log.kept && log.events.length > 0;
}

export const BUILD_INTENTS = [
  {
    id: "form-submitted",
    label: "Notify me when a form is submitted",
    templateId: "form-notification",
  },
  {
    id: "daily-summary",
    label: "Daily summary with AI",
    templateId: "schedule-summary",
  },
  {
    id: "webhook-notify",
    label: "Webhook to Slack/Email",
    templateId: "webhook-email",
  },
] as const;

export type BuildIntentId = (typeof BUILD_INTENTS)[number]["id"];

export type BuildChange =
  | {
      kind: "set-trigger";
      nodeTypeId: string;
      title: string;
      description: string;
      line: string;
    }
  | {
      kind: "add-condition";
      conjunction: Conjunction;
      rows: TemplateConditionRow[];
      line: string;
    }
  | {
      kind: "add-action";
      nodeTypeId: string;
      title: string;
      subtitle: string;
      line: string;
    }
  | { kind: "connect"; line: string };

export type BuildProposal = {
  intentId: BuildIntentId;
  intentLabel: string;
  changes: BuildChange[];
  /** Set when the workflow already contains the intent. */
  note: string | null;
};

export function proposalLines(proposal: BuildProposal): string[] {
  return proposal.changes.map((change) => change.line);
}

function conditionLine(
  rows: TemplateConditionRow[],
  conjunction: Conjunction,
): string {
  const parts = rows.map((row) => {
    const field = getField(row.source, row.field)?.label ?? row.field;
    const operator = getOperatorLabel(row.operator) ?? row.operator;
    if (row.operator === "is empty" || !row.value) {
      return `${field} ${operator}`;
    }
    const value = getValueLabel(row.source, row.field, row.value) ?? row.value;
    return `${field} ${operator} ${value}`;
  });
  return `Add condition: ${parts.join(` ${conjunction} `)}`;
}

function triggerMatches(flow: Flow, nodeTypeId: string, title: string): boolean {
  if (flow.trigger.nodeTypeId) {
    return flow.trigger.nodeTypeId === nodeTypeId;
  }
  return flow.trigger.title === title;
}

function actionPresent(flow: Flow, nodeTypeId: string): boolean {
  return flow.steps.some(
    (step) => isActionNode(step) && step.nodeTypeId === nodeTypeId,
  );
}

function conditionPresent(flow: Flow, rows: TemplateConditionRow[]): boolean {
  const wanted = rows.map((row) => rowSignature(row));
  return flow.steps.some((step) => {
    if (!isConditionNode(step)) {
      return false;
    }
    const have = new Set(step.rows.map((row) => rowSignature(row)));
    return wanted.every((signature) => have.has(signature));
  });
}

function stepLabel(flow: Flow, index: number): string {
  const step = flow.steps[index];
  if (!step) {
    return "the next step";
  }
  return isActionNode(step) ? step.title : "Condition";
}

export function proposeIntent(
  flow: Flow,
  intentId: string,
): BuildProposal | null {
  const intent = BUILD_INTENTS.find((item) => item.id === intentId);
  if (!intent) {
    return null;
  }
  const template = getTemplate(intent.templateId);
  if (!template) {
    return null;
  }
  return proposeTemplate(flow, intent.id, intent.label, template);
}

function proposeTemplate(
  flow: Flow,
  intentId: BuildIntentId,
  intentLabel: string,
  template: WorkflowTemplate,
): BuildProposal {
  const definition = getNodeType(template.triggerId);
  const triggerTitle = definition?.title ?? template.triggerId;
  const triggerDescription = definition?.subtitle ?? "";
  const changes: BuildChange[] = [];

  if (!triggerMatches(flow, template.triggerId, triggerTitle)) {
    changes.push({
      kind: "set-trigger",
      nodeTypeId: template.triggerId,
      title: triggerTitle,
      description: triggerDescription,
      line: `Set trigger to ${triggerTitle}`,
    });
  }

  const addedLabels: string[] = [];
  for (const step of template.steps) {
    if (step.kind === "condition") {
      if (conditionPresent(flow, step.rows)) {
        continue;
      }
      changes.push({
        kind: "add-condition",
        conjunction: step.conjunction,
        rows: step.rows.map((row) => ({ ...row })),
        line: conditionLine(step.rows, step.conjunction),
      });
      addedLabels.push("Condition");
      continue;
    }
    if (actionPresent(flow, step.nodeTypeId)) {
      continue;
    }
    const action = getNodeType(step.nodeTypeId);
    const title = action?.title ?? step.nodeTypeId;
    changes.push({
      kind: "add-action",
      nodeTypeId: step.nodeTypeId,
      title,
      subtitle: action?.subtitle ?? "",
      line: `Add ${title}`,
    });
    addedLabels.push(title);
  }

  if (addedLabels.length > 0) {
    const head =
      flow.steps.length === 0
        ? triggerTitle
        : stepLabel(flow, flow.steps.length - 1);
    changes.push({
      kind: "connect",
      line: `Connect ${[head, ...addedLabels].join(" → ")}`,
    });
  } else if (
    changes.some((change) => change.kind === "set-trigger") &&
    flow.steps.length > 0
  ) {
    changes.push({
      kind: "connect",
      line: `Connect ${triggerTitle} → ${stepLabel(flow, 0)}`,
    });
  }

  const hasEdits = changes.some((change) => change.kind !== "connect");
  return {
    intentId,
    intentLabel,
    changes,
    note: hasEdits ? null : "This workflow already has those steps.",
  };
}

export type ApplyResult = {
  flow: Flow;
  highlightedIds: string[];
};

export function cloneFlow(flow: Flow): Flow {
  return structuredClone(flow);
}

export function applyProposal(
  flow: Flow,
  proposal: BuildProposal,
  createId: () => string,
): ApplyResult {
  const next = cloneFlow(flow);
  const highlightedIds: string[] = [];

  for (const change of proposal.changes) {
    if (change.kind === "set-trigger") {
      next.trigger = {
        ...next.trigger,
        title: change.title,
        description: change.description,
        nodeTypeId: change.nodeTypeId,
      };
      highlightedIds.push(next.trigger.id);
      continue;
    }
    if (change.kind === "add-action") {
      const id = createId();
      next.steps.push({
        id,
        kind: "action",
        nodeTypeId: change.nodeTypeId,
        title: change.title,
        subtitle: change.subtitle,
        width: CONDITION_DEFAULT_WIDTH,
      });
      highlightedIds.push(id);
      continue;
    }
    if (change.kind === "add-condition") {
      const id = createId();
      next.steps.push({
        id,
        conjunction: change.conjunction,
        width: CONDITION_DEFAULT_WIDTH,
        rows: change.rows.map((row) => ({ ...row, id: createId() })),
      });
      highlightedIds.push(id);
    }
  }

  return { flow: next, highlightedIds };
}

export function appliedSummary(proposal: BuildProposal): string {
  const trigger = proposal.changes.find((change) => change.kind === "set-trigger");
  const added = proposal.changes.filter(
    (change) => change.kind === "add-action" || change.kind === "add-condition",
  );
  const parts: string[] = [];
  if (trigger && trigger.kind === "set-trigger") {
    parts.push(`Trigger set to ${trigger.title}`);
  }
  if (added.length === 1) {
    parts.push(`Added ${added[0].line.replace(/^Add /, "")}`);
  } else if (added.length > 1) {
    parts.push(`Added ${added.length} steps`);
  }
  if (parts.length === 0) {
    return "No changes.";
  }
  return `${parts.join(". ")}.`;
}
