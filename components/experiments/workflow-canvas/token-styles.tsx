"use client";

import { tokensToCssVars } from "@/lib/experiments/workflow-canvas/tokens";

/** Injects design tokens as CSS variables so stylesheets never hardcode hex. */
export function TokenStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{${tokensToCssVars()}}`,
      }}
    />
  );
}
