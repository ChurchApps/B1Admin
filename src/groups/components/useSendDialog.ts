import React from "react";
import { ApiHelper } from "@churchapps/apphelper";
import type { ApiListType } from "@churchapps/helpers";

interface UseSendDialogOptions {
  previewUrl: string | null;
  sendUrl: string;
  buildPayload: () => Record<string, any> | null;
  fallbackError: string;
  apiName?: ApiListType;
  buildError?: (err: any) => string;
}

interface UseSendDialogResult<TPreview, TResult> {
  sending: boolean;
  result: TResult | null;
  error: string;
  preview: TPreview | null;
  loadingPreview: boolean;
  handleSend: () => Promise<void>;
}

export function useSendDialog<TPreview = any, TResult = any>(options: UseSendDialogOptions): UseSendDialogResult<TPreview, TResult> {
  const { previewUrl, sendUrl, buildPayload, fallbackError, apiName = "MessagingApi", buildError } = options;
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<TResult | null>(null);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState<TPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  React.useEffect(() => {
    if (!previewUrl) return;
    setLoadingPreview(true);
    ApiHelper.get(previewUrl, apiName)
      .then((data: any) => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [previewUrl, apiName]);

  const handleSend = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSending(true);
    setError("");
    try {
      const resp = await ApiHelper.post(sendUrl, payload, apiName);
      if (resp.error) setError(resp.error);
      else setResult(resp);
    } catch (err: any) {
      setError(buildError ? buildError(err) : (err?.message || fallbackError));
    } finally {
      setSending(false);
    }
  };

  return { sending, result, error, preview, loadingPreview, handleSend };
}
