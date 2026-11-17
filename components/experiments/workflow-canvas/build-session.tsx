"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  dismissNudge,
  emptyHelperLog,
  initialNudgeState,
  reduceHelperLog,
  showNudge,
  type HelperEvent,
  type HelperLog,
  type NudgeContext,
  type NudgeState,
} from "@/lib/experiments/workflow-canvas/build-helper";

type BuildSession = {
  nudgeDelayMs: number;
  nudge: NudgeState;
  showNudge: (context: NudgeContext) => void;
  dismissNudge: () => void;
  alwaysAllow: boolean;
  setAlwaysAllow: (value: boolean) => void;
  record: (event: HelperEvent) => void;
  log: HelperLog;
};

const BuildSessionContext = createContext<BuildSession | null>(null);

export function BuildSessionProvider({
  nudgeDelayMs,
  children,
}: {
  nudgeDelayMs: number;
  children: ReactNode;
}) {
  const [nudge, setNudge] = useState(initialNudgeState);
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const [log, setLog] = useState(emptyHelperLog);

  const show = useCallback((context: NudgeContext) => {
    setNudge((state) => showNudge(state, context));
  }, []);

  const dismiss = useCallback(() => {
    setNudge((state) => dismissNudge(state));
  }, []);

  const record = useCallback((event: HelperEvent) => {
    setLog((current) => reduceHelperLog(current, event));
  }, []);

  const value = useMemo(
    () => ({
      nudgeDelayMs,
      nudge,
      showNudge: show,
      dismissNudge: dismiss,
      alwaysAllow,
      setAlwaysAllow,
      record,
      log,
    }),
    [alwaysAllow, dismiss, log, nudge, nudgeDelayMs, record, show],
  );

  return (
    <BuildSessionContext.Provider value={value}>
      {children}
    </BuildSessionContext.Provider>
  );
}

export function useBuildSession(): BuildSession {
  const value = useContext(BuildSessionContext);
  if (!value) {
    throw new Error("BuildSessionProvider is missing");
  }
  return value;
}
