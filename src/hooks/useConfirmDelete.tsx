import React, { useCallback, useRef, useState } from "react";
import { Locale } from "@churchapps/apphelper";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  "data-testid"?: string;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  message: string;
}

interface UseConfirmDeleteResult {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  ConfirmDialogElement: React.ReactElement;
}

// Promise-based drop-in for `if (window.confirm(msg)) { ... }`. Render ConfirmDialogElement once and `await confirm(msg)`.
export const useConfirmDelete = (defaults?: ConfirmOptions): UseConfirmDeleteResult => {
  const [state, setState] = useState<DialogState>({ open: false, message: "" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    setState({ open: true, message, ...defaultsRef.current, ...options });
    return new Promise<boolean>((resolve) => { resolveRef.current = resolve; });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((s) => ({ ...s, open: false }));
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      title={state.title || Locale.label("common.confirm", "Confirm")}
      message={state.message}
      confirmLabel={state.confirmLabel || Locale.label("common.delete")}
      cancelLabel={state.cancelLabel}
      destructive={state.destructive ?? true}
      data-testid={state["data-testid"]}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, ConfirmDialogElement };
};
