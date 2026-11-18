"use client";

import { CredentialServiceIcon } from "./credential-select";
import {
  MOCK_CREDENTIALS,
  credentialUsages,
  describeCredentialUse,
  type NamedWorkflow,
} from "@/lib/experiments/workflow-canvas/credentials";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

export function CredentialsPanel({
  workflows,
}: {
  workflows: readonly NamedWorkflow[];
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex h-14 shrink-0 items-center border-b px-5"
        style={{ borderColor: color.border, background: color.surface }}
      >
        <h1 className="text-[14px] font-semibold" style={{ color: color.ink }}>
          Credentials
        </h1>
      </header>
      <div className="canvas-dots min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-6 py-8">
          <p
            className="text-[13px] leading-[1.4]"
            style={{ color: color.muted }}
          >
            Sample Gmail accounts for Send email. Each row shows the address
            and the steps that use it. Nothing here connects to a real inbox.
          </p>
          <ul className="flex flex-col gap-2" aria-label="Accounts">
            {MOCK_CREDENTIALS.map((credential) => {
              const usages = credentialUsages(credential.id, workflows);
              return (
                <li
                  key={credential.id}
                  className="flex items-start gap-3 rounded-[12px] border p-3"
                  style={{
                    background: color.surface,
                    borderColor: color.border,
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <CredentialServiceIcon />
                  <span className="min-w-0">
                    <span
                      className="block text-[13px] leading-5 font-semibold"
                      style={{ color: color.ink }}
                    >
                      {credential.label}
                    </span>
                    <span
                      className="mt-0.5 block text-[13px] leading-[1.4]"
                      style={{ color: color.ink }}
                    >
                      {credential.email}
                    </span>
                    <span
                      className="mt-1 block text-[12px] leading-[1.4]"
                      style={{ color: color.muted }}
                    >
                      {describeCredentialUse(usages)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
