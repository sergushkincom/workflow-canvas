import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  CONNECT_ANOTHER_ACCOUNT,
  CONNECT_ANOTHER_NOTE,
  MOCK_CREDENTIALS,
  credentialUsages,
  describeCredentialUse,
  findCredential,
  formatCredential,
  nodeAcceptsCredential,
} from "./credentials";
import { flowReducer, initialFlowState } from "./flow-reducer";
import {
  isNodeIncomplete,
  type ActionNode,
  type Flow,
} from "./types";

function emailStep(
  id: string,
  credentialId?: string,
  nodeTypeId = "send-email",
): ActionNode {
  return {
    id,
    kind: "action",
    nodeTypeId,
    title: nodeTypeId === "send-email" ? "Send email" : "Assign to queue",
    subtitle: "Sends a message",
    width: 440,
    credentialId,
  };
}

function flowWith(steps: Flow["steps"]): Flow {
  return {
    trigger: initialFlowState.flow.trigger,
    steps,
  };
}

describe("mock credentials", () => {
  test("lists two Gmail accounts by label and reserved example address", () => {
    assert.deepEqual(
      MOCK_CREDENTIALS.map(formatCredential),
      [
        "Work Gmail · denys@work.example",
        "Personal Gmail · denys@personal.example",
      ],
    );
    for (const credential of MOCK_CREDENTIALS) {
      assert.match(credential.email, /@[\w.-]+\.example$/);
      assert.equal(findCredential(credential.id), credential);
    }
    assert.equal(findCredential(undefined), undefined);
    assert.equal(findCredential("gmail-other"), undefined);
    assert.equal(CONNECT_ANOTHER_ACCOUNT, "Connect another account");
    assert.match(CONNECT_ANOTHER_NOTE, /prototype/i);
  });

  test("only Send email accepts an account", () => {
    assert.equal(nodeAcceptsCredential("send-email"), true);
    assert.equal(nodeAcceptsCredential("assign-to-queue"), false);
  });

  test("usage names the workflow and step that store the account", () => {
    const workflows = [
      {
        name: "Welcome new accounts",
        flow: flowWith([
          {
            id: "gate",
            conjunction: "and",
            width: 440,
            rows: [{ id: "row-1", source: "customer", field: "plan" }],
          },
          emailStep("welcome-mail", "gmail-work"),
          emailStep("ignored", "gmail-work", "assign-to-queue"),
        ]),
      },
      {
        name: "Renewal watch",
        flow: flowWith([
          emailStep("renewal-mail", "gmail-personal"),
          emailStep("other-mail", "gmail-work"),
        ]),
      },
    ];

    const work = credentialUsages("gmail-work", workflows);
    assert.deepEqual(work, [
      {
        workflowName: "Welcome new accounts",
        stepId: "welcome-mail",
        stepTitle: "Send email",
      },
      {
        workflowName: "Renewal watch",
        stepId: "other-mail",
        stepTitle: "Send email",
      },
    ]);
    assert.equal(
      describeCredentialUse(work),
      "Used in Welcome new accounts · Send email, Renewal watch · Send email",
    );

    const personal = credentialUsages("gmail-personal", workflows);
    assert.equal(
      describeCredentialUse(personal),
      "Used in Renewal watch · Send email",
    );
    assert.deepEqual(credentialUsages("gmail-missing", workflows), []);
    assert.equal(describeCredentialUse([]), "Not used yet");
  });

  test("choosing an account is stored on the Send email node", () => {
    const inserted = flowReducer(structuredClone(initialFlowState), {
      type: "insertNode",
      id: "email",
      nodeTypeId: "send-email",
      index: 1,
    });
    const chosen = flowReducer(inserted, {
      type: "setNodeCredential",
      id: "email",
      credentialId: "gmail-personal",
    });
    const step = chosen.flow.steps.find((node) => node.id === "email");
    assert.ok(step && "kind" in step);
    assert.equal(step.credentialId, "gmail-personal");
    assert.equal(isNodeIncomplete(step), true);

    const usages = credentialUsages("gmail-personal", [
      { name: "Untitled workflow", flow: chosen.flow },
    ]);
    assert.equal(
      describeCredentialUse(usages),
      "Used in Untitled workflow · Send email",
    );

    const renamed = flowReducer(chosen, {
      type: "renameNode",
      id: "email",
      name: "Ping customer",
    });
    const namedUsages = credentialUsages("gmail-personal", [
      { name: "Untitled workflow", flow: renamed.flow },
    ]);
    assert.equal(
      describeCredentialUse(namedUsages),
      "Used in Untitled workflow · Ping customer",
    );
  });
});
