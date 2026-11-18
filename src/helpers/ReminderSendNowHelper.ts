export interface SendNowResult { sent?: number; textsSent?: number; textsSkipped?: number }

// "Sent to 2 people · 1 texted, 1 skipped", plus why texts get skipped (ChurchAppsSupport#1600).
export const sentNowText = (result: SendNowResult, texting: boolean, l: (k: string) => string) => {
  const count = String(Number(result.sent) || 0);
  if (!texting || result.textsSent === undefined) return l("sentNow").replace("{count}", count);
  const skipped = Number(result.textsSkipped) || 0;
  const line = l("sentNowTexts").replace("{count}", count).replace("{texts}", String(Number(result.textsSent) || 0)).replace("{skipped}", String(skipped));
  return skipped > 0 ? `${line}. ${l("skippedHint")}` : line;
};
