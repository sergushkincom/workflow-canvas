import {
  SAMPLE_TICKET,
  SAMPLE_TICKET_VALUES,
  getField,
  getOperatorLabel,
  getSourceLabel,
  getValueLabel,
} from "./data";
import { evaluateRow } from "./run-machine";
import {
  isRowComplete,
  type ConditionNode,
  type ConditionRow,
  type Conjunction,
} from "./types";

export const ASSISTANT_SUGGESTIONS = [
  "Only VIP customers",
  "Email tickets from EMEA",
  "Urgent tickets in German",
] as const;

export type DraftRow = {
  source: string;
  field: string;
  operator: string;
  value: string;
};

export type AssistantChoice = {
  label: string;
  rows: DraftRow[];
};

export type AssistantMatch =
  | { kind: "unsure"; message: string; choices: AssistantChoice[] }
  | { kind: "draft"; message: string; rows: DraftRow[] }
  | { kind: "unknown"; message: string };

export const VIP_UNSURE_MESSAGE =
  "“VIP” could mean two different things here, and I can't tell which one you mean.";

export const UNKNOWN_FIELDS_MESSAGE =
  "I can't map that to the fields this step has. I know: Ticket (priority, channel, subject, first response time, language), Customer (plan, lifetime value, signup date, region), Account (seats, renewal date, health score).";

export const CONFIDENT_TWO_ROWS = "Two rows. I'm confident about these.";

export const VIP_CHOICES: AssistantChoice[] = [
  {
    label: "Lifetime value is greater than 5,000",
    rows: [
      {
        source: "customer",
        field: "lifetime-value",
        operator: "is greater than",
        value: "5000",
      },
    ],
  },
  {
    label: "Plan is Enterprise",
    rows: [
      {
        source: "customer",
        field: "plan",
        operator: "is",
        value: "enterprise",
      },
    ],
  },
];

export function rowSignature(
  row: Pick<ConditionRow, "source" | "field" | "operator" | "value">,
): string {
  return `${row.source ?? ""}\0${row.field ?? ""}\0${row.operator ?? ""}\0${row.value ?? ""}`;
}

export function isDuplicateRow(
  existing: ConditionRow[],
  draft: DraftRow,
): boolean {
  const signature = rowSignature(draft);
  return existing.some((row) => rowSignature(row) === signature);
}

export function draftsAlreadyPresent(
  existing: ConditionRow[],
  drafts: DraftRow[],
): boolean {
  return drafts.length > 0 && drafts.every((draft) => isDuplicateRow(existing, draft));
}

export function uniqueDrafts(
  existing: ConditionRow[],
  drafts: DraftRow[],
): DraftRow[] {
  return drafts.filter((draft) => !isDuplicateRow(existing, draft));
}

function formatNumberish(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return numeric.toLocaleString("en-US");
}

function fieldNoun(source: string, field: string): string {
  return (getField(source, field)?.label ?? field).toLowerCase();
}

function fieldPhrase(source: string, field: string): string {
  const noun = fieldNoun(source, field);
  if (source === "customer") {
    return `the customer's ${noun}`;
  }
  if (source === "account") {
    return `the account's ${noun}`;
  }
  const sourceLabel = getSourceLabel(source)?.toLowerCase() ?? source;
  return `the ${sourceLabel} ${noun}`;
}

function rowValuePhrase(row: ConditionRow): string {
  if (!row.value) {
    return "";
  }
  const field = getField(row.source, row.field);
  if (field?.valueKind === "number") {
    return formatNumberish(row.value);
  }
  return getValueLabel(row.source, row.field, row.value) ?? row.value;
}

export function describeRow(row: ConditionRow): string | null {
  if (!isRowComplete(row) || !row.source || !row.field || !row.operator) {
    return null;
  }
  const left = fieldPhrase(row.source, row.field);
  const operator = getOperatorLabel(row.operator) ?? row.operator;
  if (row.operator === "is empty") {
    return `${left} ${operator}`;
  }
  return `${left} ${operator} ${rowValuePhrase(row)}`;
}

export function describeWhatThisChecks(node: ConditionNode): string {
  const complete = node.rows
    .map((row) => describeRow(row))
    .filter((phrase): phrase is string => Boolean(phrase));
  const parts: string[] = [];
  if (complete.length > 0) {
    parts.push(`Runs when ${complete.join(` ${node.conjunction} `)}.`);
  }
  node.rows.forEach((row, index) => {
    if (!isRowComplete(row)) {
      parts.push(`Row ${index + 1} isn't finished yet.`);
    }
  });
  return parts.join(" ");
}

function sampleFieldDisplay(source: string, field: string): string {
  const actual = SAMPLE_TICKET_VALUES[`${source}.${field}`] ?? "";
  const def = getField(source, field);
  if (def?.valueKind === "number") {
    return formatNumberish(actual);
  }
  return getValueLabel(source, field, actual) ?? actual;
}

function failingReason(row: ConditionRow): string {
  if (!row.source || !row.field) {
    return "";
  }
  return `its ${fieldNoun(row.source, row.field)} is ${sampleFieldDisplay(row.source, row.field)}`;
}

export function hasIncompleteRows(rows: ConditionRow[]): boolean {
  return rows.some((row) => !isRowComplete(row));
}

function outcomeForRows(
  rows: ConditionRow[],
  conjunction: Conjunction,
): { passes: boolean; reason: string } {
  const complete = rows.filter(isRowComplete);
  const passes =
    conjunction === "and"
      ? complete.every(evaluateRow)
      : complete.some(evaluateRow);
  if (passes) {
    return { passes: true, reason: "" };
  }
  const failing = complete.find((row) => !evaluateRow(row));
  return {
    passes: false,
    reason: failing ? failingReason(failing) : "",
  };
}

function formatTicketOutcome(
  passes: boolean,
  reason: string,
  options: { incomplete: boolean; withDrafts: boolean },
): string {
  const ticket = `ticket #${SAMPLE_TICKET.id}`;
  const subject = options.incomplete ? "the finished rows" : ticket;
  if (options.withDrafts) {
    if (passes) {
      return options.incomplete
        ? `With these, the finished rows would pass ${ticket}.`
        : `With these, ${ticket} would pass.`;
    }
    return reason
      ? `With these, ${subject} wouldn't pass — ${reason}.`
      : `With these, ${subject} wouldn't pass.`;
  }
  if (passes) {
    return options.incomplete
      ? `The finished rows would pass ${ticket}.`
      : `Ticket #${SAMPLE_TICKET.id} would pass.`;
  }
  return reason
    ? `${options.incomplete ? "The finished rows" : `Ticket #${SAMPLE_TICKET.id}`} wouldn't pass — ${reason}.`
    : `${options.incomplete ? "The finished rows" : `Ticket #${SAMPLE_TICKET.id}`} wouldn't pass.`;
}

export function sampleTicketLine(node: ConditionNode): string | null {
  if (!node.rows.some(isRowComplete)) {
    return null;
  }
  const { passes, reason } = outcomeForRows(node.rows, node.conjunction);
  return formatTicketOutcome(passes, reason, {
    incomplete: hasIncompleteRows(node.rows),
    withDrafts: false,
  });
}

export function draftTicketLine(
  node: ConditionNode,
  drafts: DraftRow[],
): string {
  const combined: ConditionRow[] = [
    ...node.rows,
    ...drafts.map((row, index) => ({ ...row, id: `draft-${index}` })),
  ];
  const { passes, reason } = outcomeForRows(combined, node.conjunction);
  return formatTicketOutcome(passes, reason, {
    incomplete: hasIncompleteRows(node.rows),
    withDrafts: true,
  });
}

export function describeDraftRow(row: DraftRow): string {
  const source = getSourceLabel(row.source) ?? row.source;
  const field = getField(row.source, row.field)?.label ?? row.field;
  const operator = getOperatorLabel(row.operator) ?? row.operator;
  const value =
    getField(row.source, row.field)?.valueKind === "number"
      ? formatNumberish(row.value)
      : (getValueLabel(row.source, row.field, row.value) ?? row.value);
  return `${source} · ${field} ${operator} ${value}`;
}

export function matchAssistantPrompt(text: string): AssistantMatch {
  const query = text.toLowerCase();
  if (query.includes("vip")) {
    return {
      kind: "unsure",
      message: VIP_UNSURE_MESSAGE,
      choices: VIP_CHOICES,
    };
  }
  if (query.includes("email") && query.includes("emea")) {
    return {
      kind: "draft",
      message: CONFIDENT_TWO_ROWS,
      rows: [
        { source: "ticket", field: "channel", operator: "is", value: "email" },
        { source: "customer", field: "region", operator: "is", value: "emea" },
      ],
    };
  }
  if (query.includes("urgent") && query.includes("german")) {
    return {
      kind: "draft",
      message: CONFIDENT_TWO_ROWS,
      rows: [
        { source: "ticket", field: "priority", operator: "is", value: "urgent" },
        {
          source: "ticket",
          field: "language",
          operator: "is",
          value: "german",
        },
      ],
    };
  }
  return { kind: "unknown", message: UNKNOWN_FIELDS_MESSAGE };
}
