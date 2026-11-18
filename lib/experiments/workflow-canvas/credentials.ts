import type { Flow } from "./types";
import { isActionNode } from "./types";

/** Palette id for the only step that picks an account in this prototype. */
export const SEND_EMAIL_NODE_TYPE = "send-email";

export const CONNECT_ANOTHER_ACCOUNT = "Connect another account";

export const CONNECT_ANOTHER_NOTE =
  "Connecting another account is not part of this prototype.";

export type MockCredential = {
  id: string;
  service: "gmail";
  label: string;
  email: string;
};

export const MOCK_CREDENTIALS: readonly MockCredential[] = [
  {
    id: "gmail-work",
    service: "gmail",
    label: "Work Gmail",
    email: "denys@work.example",
  },
  {
    id: "gmail-personal",
    service: "gmail",
    label: "Personal Gmail",
    email: "denys@personal.example",
  },
];

export type NamedWorkflow = {
  name: string;
  flow: Flow;
};

export type CredentialUsage = {
  workflowName: string;
  stepId: string;
  stepTitle: string;
};

export function formatCredential(credential: MockCredential): string {
  return `${credential.label} · ${credential.email}`;
}

export function findCredential(
  id: string | undefined,
): MockCredential | undefined {
  if (!id) {
    return undefined;
  }
  return MOCK_CREDENTIALS.find((credential) => credential.id === id);
}

export function nodeAcceptsCredential(nodeTypeId: string): boolean {
  return nodeTypeId === SEND_EMAIL_NODE_TYPE;
}

export function credentialUsages(
  credentialId: string,
  workflows: readonly NamedWorkflow[],
): CredentialUsage[] {
  const usages: CredentialUsage[] = [];
  for (const workflow of workflows) {
    for (const step of workflow.flow.steps) {
      if (
        !isActionNode(step) ||
        !nodeAcceptsCredential(step.nodeTypeId) ||
        step.credentialId !== credentialId
      ) {
        continue;
      }
      usages.push({
        workflowName: workflow.name,
        stepId: step.id,
        stepTitle: step.title,
      });
    }
  }
  return usages;
}

export function describeCredentialUse(
  usages: readonly CredentialUsage[],
): string {
  if (usages.length === 0) {
    return "Not used yet";
  }
  const places = usages.map(
    (usage) => `${usage.workflowName} · ${usage.stepTitle}`,
  );
  return `Used in ${places.join(", ")}`;
}
