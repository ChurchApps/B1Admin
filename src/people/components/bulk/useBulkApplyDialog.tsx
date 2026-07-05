import React from "react";
import { Locale } from "@churchapps/apphelper";
import { type BulkResult } from "./BulkFieldDialog";

interface UseBulkApplyDialogParams<T> {
  open: boolean;
  apply: () => Promise<BulkResult>;
  onComplete: (result: BulkResult) => void;
  onClose: () => void;
  loadOptions?: () => Promise<T[] | undefined>;
  onOpen?: () => void;
}

export function useBulkApplyDialog<T = any>(params: UseBulkApplyDialogParams<T>) {
  const { open, apply, onComplete, onClose, loadOptions, onOpen } = params;
  const [options, setOptions] = React.useState<T[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    onOpen?.();
    if (loadOptions) loadOptions().then((data) => setOptions(data || []));
  }, [open]);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const result = await apply();
      onComplete(result);
      onClose();
    } catch (error) {
      onComplete({ message: error instanceof Error ? error.message : Locale.label("people.bulk.error"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { options, isSubmitting, handleApply };
}
