export type SourceId = "ticket" | "customer" | "account";

export type FieldDef = {
  id: string;
  label: string;
  valueKind: "select" | "number" | "text";
  values?: { id: string; label: string; tag?: string }[];
};

export const TRIGGER = {
  title: "New ticket received",
  description: "Runs when a ticket arrives in any connected inbox",
} as const;

export const SAMPLE_TICKET = {
  id: "4821",
  subject: "Charged twice for the September invoice",
  channel: "email",
  channelLabel: "Email",
  customerName: "Nadia Brandt",
  plan: "growth",
  planLabel: "Growth",
  region: "emea",
  regionLabel: "EMEA",
  priority: "normal",
  language: "english",
  "first-response-time": "14",
  "lifetime-value": "18400",
  "signup-date": "2024-03-12",
  seats: "24",
  "renewal-date": "2026-11-01",
  "health-score": "72",
} as const;

/** Flat lookup used by the run evaluator: `${source}.${field}` → value id/string */
export const SAMPLE_TICKET_VALUES: Record<string, string> = {
  "ticket.subject": SAMPLE_TICKET.subject,
  "ticket.channel": SAMPLE_TICKET.channel,
  "ticket.priority": SAMPLE_TICKET.priority,
  "ticket.language": SAMPLE_TICKET.language,
  "ticket.first-response-time": SAMPLE_TICKET["first-response-time"],
  "customer.plan": SAMPLE_TICKET.plan,
  "customer.region": SAMPLE_TICKET.region,
  "customer.lifetime-value": SAMPLE_TICKET["lifetime-value"],
  "customer.signup-date": SAMPLE_TICKET["signup-date"],
  "account.seats": SAMPLE_TICKET.seats,
  "account.renewal-date": SAMPLE_TICKET["renewal-date"],
  "account.health-score": SAMPLE_TICKET["health-score"],
};

export const CLASSIFY_REASONING =
  "Reading the ticket. The customer mentions a duplicate charge and references an invoice number. This reads as a billing dispute rather than a general refund request.";

export const CLASSIFY_STEP_ID = "classify-intent";

/** Seeded demo condition — two complete rows so Test run is available immediately. */
export const SEED_CONDITION = {
  id: "seed-condition",
  conjunction: "and" as const,
  rows: [
    {
      id: "seed-row-1",
      source: "ticket",
      field: "channel",
      operator: "is",
      value: "email",
    },
    {
      id: "seed-row-2",
      source: "customer",
      field: "lifetime-value",
      operator: "is greater than",
      value: "5000",
    },
  ],
};

export const SOURCES: { id: SourceId; label: string }[] = [
  { id: "ticket", label: "Ticket" },
  { id: "customer", label: "Customer" },
  { id: "account", label: "Account" },
];

export const FIELDS: Record<SourceId, FieldDef[]> = {
  ticket: [
    {
      id: "priority",
      label: "Priority",
      valueKind: "select",
      values: [
        { id: "low", label: "Low", tag: "Queue" },
        { id: "normal", label: "Normal", tag: "Queue" },
        { id: "high", label: "High", tag: "Escalate" },
        { id: "urgent", label: "Urgent", tag: "Escalate" },
      ],
    },
    {
      id: "channel",
      label: "Channel",
      valueKind: "select",
      values: [
        { id: "email", label: "Email", tag: "Async" },
        { id: "chat", label: "Chat", tag: "Live" },
        { id: "phone", label: "Phone", tag: "Live" },
        { id: "api", label: "API", tag: "System" },
      ],
    },
    { id: "subject", label: "Subject", valueKind: "text" },
    {
      id: "first-response-time",
      label: "First response time",
      valueKind: "number",
    },
    {
      id: "language",
      label: "Language",
      valueKind: "select",
      values: [
        { id: "english", label: "English", tag: "Locale" },
        { id: "german", label: "German", tag: "Locale" },
        { id: "french", label: "French", tag: "Locale" },
        { id: "spanish", label: "Spanish", tag: "Locale" },
      ],
    },
  ],
  customer: [
    {
      id: "plan",
      label: "Plan",
      valueKind: "select",
      values: [
        { id: "free", label: "Free", tag: "Tier" },
        { id: "starter", label: "Starter", tag: "Tier" },
        { id: "growth", label: "Growth", tag: "Tier" },
        { id: "enterprise", label: "Enterprise", tag: "Tier" },
      ],
    },
    { id: "lifetime-value", label: "Lifetime value", valueKind: "number" },
    { id: "signup-date", label: "Signup date", valueKind: "text" },
    {
      id: "region",
      label: "Region",
      valueKind: "select",
      values: [
        { id: "emea", label: "EMEA", tag: "Geo" },
        { id: "amer", label: "AMER", tag: "Geo" },
        { id: "apac", label: "APAC", tag: "Geo" },
      ],
    },
  ],
  account: [
    { id: "seats", label: "Seats", valueKind: "number" },
    { id: "renewal-date", label: "Renewal date", valueKind: "text" },
    { id: "health-score", label: "Health score", valueKind: "number" },
  ],
};

export const OPERATORS: { id: string; label: string }[] = [
  { id: "is", label: "is" },
  { id: "is not", label: "is not" },
  { id: "contains", label: "contains" },
  { id: "is greater than", label: "is greater than" },
  { id: "is less than", label: "is less than" },
  { id: "is empty", label: "is empty" },
];

export function getSourceLabel(id: string | undefined): string | undefined {
  return SOURCES.find((source) => source.id === id)?.label;
}

export function getFieldsForSource(sourceId: string | undefined): FieldDef[] {
  if (!sourceId || !(sourceId in FIELDS)) {
    return [];
  }
  return FIELDS[sourceId as SourceId];
}

export function getField(
  sourceId: string | undefined,
  fieldId: string | undefined,
) {
  return getFieldsForSource(sourceId).find((field) => field.id === fieldId);
}

export function getOperatorLabel(id: string | undefined): string | undefined {
  return OPERATORS.find((operator) => operator.id === id)?.label;
}

export function getValueLabel(
  sourceId: string | undefined,
  fieldId: string | undefined,
  valueId: string | undefined,
): string | undefined {
  if (!valueId) {
    return undefined;
  }
  const field = getField(sourceId, fieldId);
  if (!field) {
    return valueId;
  }
  if (field.valueKind !== "select") {
    return valueId;
  }
  return field.values?.find((value) => value.id === valueId)?.label ?? valueId;
}
