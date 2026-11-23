"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface AssistantOpenOptions {
  message?: string;
  /** Title of a video the user is looking at (sent as untrusted data). */
  videoTitle?: string;
}

interface AssistantApi {
  open: (opts?: AssistantOpenOptions) => void;
}

const AssistantContext = createContext<AssistantApi | null>(null);

// The conversational UI (and the recipe data it needs) loads only when first opened.
const AssistantSheet = dynamic(() => import("./assistant-sheet").then((m) => m.AssistantSheet), { ssr: false });

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; request: AssistantOpenOptions & { nonce: number } } | null>(null);
  const open = useCallback((opts: AssistantOpenOptions = {}) => setState({ open: true, request: { ...opts, nonce: Date.now() } }), []);
  const api = useMemo(() => ({ open }), [open]);
  return (
    <AssistantContext.Provider value={api}>
      {children}
      {state && <AssistantSheet open={state.open} request={state.request} onClose={() => setState((s) => (s ? { ...s, open: false } : s))} />}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within <AssistantProvider>");
  return ctx;
}
