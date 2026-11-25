import React from "react";
import { ApiHelper } from "@churchapps/apphelper";
import type { ApiListType } from "@churchapps/helpers";

// What a failed ApiHelper call may carry: an Error message and/or an HTTP status.
export type SendDialogError = { message?: string; status?: number; response?: { status?: number } } | null | undefined;

interface UseSendDialogOptions {
  previewUrl: string | null;
  // Sent as a POST body when set, for previews keyed by a list of people too long for a URL.
  previewBody?: Record<string, unknown>;
  sendUrl: string;
  buildPayload: () => Record<string, unknown> | null;
  fallbackError: string;
  apiName?: ApiListType;
  buildError?: (err: SendDialogError) => string;
}

interface UseSendDialogResult<TPreview, TResult> {
  sending: boolean;
  result: TResult | null;
  error: string;
  preview: TPreview | null;
  loadingPreview: boolean;
  handleSend: () => Promise<void>;
}

export function useSendDialog<TPreview = unknown, TResult = unknown>(options: UseSendDialogOptions): UseSendDialogResult<TPreview, TResult> {
  const { previewUrl, previewBody, sendUrl, buildPayload, fallbackError, apiName = "MessagingApi", buildError } = options;
  const previewBodyJson = previewBody ? JSON.stringify(previewBody) : "";
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<TResult | null>(null);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState<TPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  React.useEffect(() => {
    if (!previewUrl) return;
    setLoadingPreview(true);
    (previewBodyJson ? ApiHelper.post(previewUrl, JSON.parse(previewBodyJson), apiName) : ApiHelper.get(previewUrl, apiName))
      .then((data: TPreview) => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [previewUrl, previewBodyJson, apiName]);

  // State alone lets a fast double-click through before the disabled button re-renders.
  const sendingRef = React.useRef(false);

  const handleSend = async () => {
    if (sendingRef.current) return;
    const payload = buildPayload();
    if (!payload) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const resp = await ApiHelper.post(sendUrl, payload, apiName);
      if (resp?.error) setError(resp.error);
      else setResult(resp ?? ({} as TResult));
    } catch (caught) {
      const err = caught as SendDialogError;
      setError(buildError ? buildError(err) : (err?.message || fallbackError));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return { sending, result, error, preview, loadingPreview, handleSend };
}
