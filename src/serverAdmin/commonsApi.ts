import { ApiHelper } from "@churchapps/apphelper";

// @churchapps/helpers' ApiListType union doesn't know about the commons module yet.
// Isolate the cast here rather than scattering "as any" through CommonsTab.
export const CommonsApi = {
  get: (path: string): Promise<any> => ApiHelper.get(path, "CommonsApi" as any),
  post: (path: string, data: any[] | Record<string, unknown> = {}): Promise<any> => ApiHelper.post(path, data, "CommonsApi" as any)
};

export const getWorshipCommonsOrigin = (): string => {
  const fromEnv = (import.meta.env as ImportMetaEnv & Record<string, string | undefined>).VITE_WORSHIPCOMMONS_ORIGIN;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return window.location.hostname === "localhost" ? "http://localhost:3104" : "https://worshipcommons.org";
};

// Shapes copied from Packages/helpers/src/interfaces/Commons.ts (not yet published for B1Admin to import)
// plus the /commons/admin response shapes documented on CommonsAdminController. Keep in sync by hand.

export type AssetStatus = "pending" | "published" | "unpublished" | "removed";
export type FileAction = "add" | "replace" | "remove";
export type RejectReason = "quality" | "duplicate" | "licensing" | "ccli" | "offtopic" | "incomplete" | "other";
export type ReportReason = "copyright" | "policy" | "quality" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved";
export type ReportResolution = "upheld" | "dismissed" | "duplicate";
export type ReportAction = "none" | "unpublish" | "remove";
export type RemovedReason = "copyright" | "policy";
export type SubmissionType = "new" | "translation" | "arrangement" | "correction" | "additionalFile" | "removal";
export type Confidence = "sunday-ready" | "proofread-score" | "converted-from-abc" | "generated-from-midi" | "chart-only" | "lyrics-only";

export const REJECT_REASONS: RejectReason[] = ["quality", "duplicate", "licensing", "ccli", "offtopic", "incomplete", "other"];
export const RESOLUTIONS: ReportResolution[] = ["upheld", "dismissed", "duplicate"];
export const RESOLVE_ACTIONS: ReportAction[] = ["none", "unpublish", "remove"];
export const REMOVE_REASONS: RemovedReason[] = ["copyright", "policy"];
export const SUBMISSION_TYPES: SubmissionType[] = ["new", "translation", "arrangement", "correction", "additionalFile", "removal"];

// /admin/status: { admin, pendingCount } today; musicEditor arrives with COMMONS_MUSIC_EDITORS.
export interface CommonsAdminStatus {
  admin?: boolean;
  musicEditor?: boolean;
  pendingCount?: number;
}

// One row of a package's sources/manifest.json (files[]); the review drawer shows them as "Sources".
export interface CommonsManifestRow {
  file: string;
  url?: string;
  acquired?: string;
  sha256?: string;
  licenseBasis?: string;
  original?: boolean;
  submittedBy?: string;
  submissionId?: string;
  note?: string;
}

export interface CommonsManifest {
  files?: CommonsManifestRow[];
  sources?: CommonsManifestRow[];
}

export interface CommonsContributor {
  name: string;
  what: string;
  submissionId?: string;
  at?: string;
}

// Song summary rows of GET /songs (subset B1Admin reads) — see the package-model contract.
export interface CommonsSongSummary {
  id: string;
  title: string;
  writer?: string;
  license?: string;
  confidence?: Confidence;
  sundayReady?: boolean;
  songKey?: string;
  hasScore?: boolean;
  hasChords?: boolean;
  hasSlides?: boolean;
  firstLine?: string | null;
}

// Song detail of GET /songs/:id — the listen-gate fields plus what the summary has.
export interface CommonsSongDetail extends CommonsSongSummary {
  publishedKeys?: string[];
  listenedKeys?: string[];
  recommendedKey?: string | null;
  sundayReadyAt?: string | null;
  sundayReadyBy?: string | null;
  contributors?: CommonsContributor[];
}

export interface CommonsDeclinedFile {
  name: string;
  reason: string;
}

export interface CommonsTypeDef {
  key: string;
  label: string;
  product: string;
  productLabel: string;
  hasPreview: boolean;
}

export interface CommonsFileSummary {
  name: string;
  action: FileAction;
  role?: string;
}

export interface CommonsSubmitterStats {
  total: number;
  approved: number;
}

export interface CommonsQualityDetail {
  heuristic?: number;
  llm?: number;
  parts?: string[];
  notes?: string;
}

export interface CommonsDetailField {
  key: string;
  label: string;
}

export interface CommonsAttestation {
  key: string;
  label: string;
}

export interface CommonsQueueRow {
  id: string;
  assetId: string;
  assetType: string;
  assetName: string;
  assetStatus: AssetStatus;
  typeLabel: string;
  product: string;
  productLabel: string;
  submittedBy?: string;
  submittedByName?: string;
  publisherName?: string;
  submitterStats?: CommonsSubmitterStats;
  isNewAsset: boolean;
  isThirdParty: boolean;
  note?: string;
  triageScore?: number;
  qualityDetail?: CommonsQualityDetail;
  submittedAt?: string;
  createdAt?: string;
  filesChanged: CommonsFileSummary[];
  rightsFlag?: boolean;
  possibleDuplicate?: boolean;
  type?: SubmissionType;
  confidence?: Confidence;
}

export interface CommonsSubmissionFile {
  name: string;
  action: FileAction;
  role?: string;
  sizeBytes?: number;
  url?: string;
}

export interface CommonsDiffField {
  key: string;
  from?: unknown;
  to?: unknown;
}

export interface CommonsPayload {
  type?: SubmissionType;
  name?: string;
  description?: string;
  tags?: string;
  language?: string;
  license?: string;
  publisherChurchId?: string;
  detail?: Record<string, unknown>;
  qualityDetail?: CommonsQualityDetail;
}

export interface CommonsLiveAsset {
  id?: string;
  name?: string;
  status?: AssetStatus;
  publisherName?: string;
  files?: CommonsSubmissionFile[];
  fileUrls?: Record<string, string>;
  payload?: CommonsPayload;
  manifest?: CommonsManifest;
  contributors?: CommonsContributor[];
  confidence?: Confidence;
}

export interface CommonsSubmissionDetail extends CommonsQueueRow {
  payload?: CommonsPayload;
  files: CommonsSubmissionFile[];
  live?: CommonsLiveAsset;
  diff: { fields: CommonsDiffField[]; files: CommonsFileSummary[] };
  previewUrl?: string;
  detailFields?: CommonsDetailField[];
  attestations?: CommonsAttestation[];
  manifest?: CommonsManifest;
  contributors?: CommonsContributor[];
}

export interface CommonsReport {
  id: string;
  assetId?: string;
  assetName?: string;
  assetStatus?: AssetStatus;
  contentText?: string;
  reason: ReportReason;
  reporterRole?: string;
  details?: string;
  name?: string;
  email?: string;
  signature?: string;
  status: ReportStatus;
  resolution?: ReportResolution;
  resolutionNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
}

export interface CommonsAsset {
  id: string;
  assetType: string;
  typeLabel?: string;
  name: string;
  status: AssetStatus;
  publisherName?: string;
  featured?: boolean;
  downloadCount?: number;
  ratingCount?: number;
  removedReason?: RemovedReason;
  publishedAt?: string;
  modifiedAt?: string;
  confidence?: Confidence;
  sundayReadyAt?: string | null;
  sundayReadyBy?: string | null;
}
