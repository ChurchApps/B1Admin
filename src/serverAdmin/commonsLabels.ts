import { Locale } from "@churchapps/apphelper";
import type { AssetStatus, Confidence, RejectReason, RemovedReason, ReportAction, ReportReason, ReportResolution, SubmissionType } from "./commonsApi";

// Every key is a full string literal: locale-sync prunes keys it can't find in source, and a built key (`rejectReason.${r}`) is invisible to it.

export const rejectReasonLabel = (r: RejectReason | string) => ({
  quality: () => Locale.label("serverAdmin.commonsTab.rejectReason.quality"),
  duplicate: () => Locale.label("serverAdmin.commonsTab.rejectReason.duplicate"),
  licensing: () => Locale.label("serverAdmin.commonsTab.rejectReason.licensing"),
  ccli: () => Locale.label("serverAdmin.commonsTab.rejectReason.ccli"),
  ai: () => Locale.label("serverAdmin.commonsTab.rejectReason.ai"),
  offtopic: () => Locale.label("serverAdmin.commonsTab.rejectReason.offtopic"),
  incomplete: () => Locale.label("serverAdmin.commonsTab.rejectReason.incomplete"),
  other: () => Locale.label("serverAdmin.commonsTab.rejectReason.other")
} as Record<string, () => string>)[r]?.() || r;

export const submissionTypeLabel = (t: SubmissionType | string) => ({
  new: () => Locale.label("serverAdmin.commonsTab.submissionType.new"),
  translation: () => Locale.label("serverAdmin.commonsTab.submissionType.translation"),
  arrangement: () => Locale.label("serverAdmin.commonsTab.submissionType.arrangement"),
  correction: () => Locale.label("serverAdmin.commonsTab.submissionType.correction"),
  additionalFile: () => Locale.label("serverAdmin.commonsTab.submissionType.additionalFile"),
  recording: () => Locale.label("serverAdmin.commonsTab.submissionType.recording"),
  removal: () => Locale.label("serverAdmin.commonsTab.submissionType.removal")
} as Record<string, () => string>)[t]?.() || t;

export const confidenceLabel = (c: Confidence | string) => ({
  "sunday-ready": () => Locale.label("serverAdmin.commonsTab.confidence.sunday-ready"),
  "proofread-score": () => Locale.label("serverAdmin.commonsTab.confidence.proofread-score"),
  "converted-from-abc": () => Locale.label("serverAdmin.commonsTab.confidence.converted-from-abc"),
  "generated-from-midi": () => Locale.label("serverAdmin.commonsTab.confidence.generated-from-midi"),
  "chart-only": () => Locale.label("serverAdmin.commonsTab.confidence.chart-only"),
  "lyrics-only": () => Locale.label("serverAdmin.commonsTab.confidence.lyrics-only")
} as Record<string, () => string>)[c]?.() || c;

export const resolutionLabel = (r: ReportResolution | string) => ({
  upheld: () => Locale.label("serverAdmin.commonsTab.resolution.upheld"),
  dismissed: () => Locale.label("serverAdmin.commonsTab.resolution.dismissed"),
  duplicate: () => Locale.label("serverAdmin.commonsTab.resolution.duplicate")
} as Record<string, () => string>)[r]?.() || r;

export const resolveActionLabel = (a: ReportAction | string) => ({
  none: () => Locale.label("serverAdmin.commonsTab.resolveAction.none"),
  unpublish: () => Locale.label("serverAdmin.commonsTab.resolveAction.unpublish"),
  remove: () => Locale.label("serverAdmin.commonsTab.resolveAction.remove")
} as Record<string, () => string>)[a]?.() || a;

export const removeReasonLabel = (r: RemovedReason | string) => ({
  copyright: () => Locale.label("serverAdmin.commonsTab.removeReason.copyright"),
  policy: () => Locale.label("serverAdmin.commonsTab.removeReason.policy")
} as Record<string, () => string>)[r]?.() || r;

export const assetStatusLabel = (s: AssetStatus | string) => ({
  pending: () => Locale.label("serverAdmin.commonsTab.assetStatus.pending"),
  published: () => Locale.label("serverAdmin.commonsTab.assetStatus.published"),
  unpublished: () => Locale.label("serverAdmin.commonsTab.assetStatus.unpublished"),
  removed: () => Locale.label("serverAdmin.commonsTab.assetStatus.removed")
} as Record<string, () => string>)[s]?.() || s;

export const reportReasonLabel = (r: ReportReason | string) => ({
  copyright: () => Locale.label("serverAdmin.commonsTab.reportReason.copyright"),
  ai: () => Locale.label("serverAdmin.commonsTab.reportReason.ai"),
  policy: () => Locale.label("serverAdmin.commonsTab.reportReason.policy"),
  quality: () => Locale.label("serverAdmin.commonsTab.reportReason.quality"),
  other: () => Locale.label("serverAdmin.commonsTab.reportReason.other")
} as Record<string, () => string>)[r]?.() || r;

export const reportStatusLabel = (s: string) => ({
  open: () => Locale.label("serverAdmin.commonsTab.reportStatus.open"),
  reviewing: () => Locale.label("serverAdmin.commonsTab.reportStatus.reviewing"),
  resolved: () => Locale.label("serverAdmin.commonsTab.reportStatus.resolved")
} as Record<string, () => string>)[s]?.() || s;

/** The six parts of the writer's grant (WorshipCommons attestation 1.2), in the order the upload form asks them. */
export const GRANT_PARTS: { key: string; label: () => string }[] = [
  { key: "certifyAdult", label: () => Locale.label("serverAdmin.commonsTab.grant.adult") },
  { key: "certifyWrote", label: () => Locale.label("serverAdmin.commonsTab.grant.wrote") },
  { key: "certifyCowriters", label: () => Locale.label("serverAdmin.commonsTab.grant.cowriters") },
  { key: "certifyClear", label: () => Locale.label("serverAdmin.commonsTab.grant.clear") },
  { key: "certifyForever", label: () => Locale.label("serverAdmin.commonsTab.grant.forever") },
  { key: "certifyHuman", label: () => Locale.label("serverAdmin.commonsTab.grant.human") }
];
