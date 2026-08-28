import { ApiHelper } from "@churchapps/apphelper";

// @churchapps/helpers' ApiListType union doesn't know about the commons module yet.
// Isolate the cast here rather than scattering "as any" through CommonsTab.
export const CommonsApi = {
  get: (path: string): Promise<any> => ApiHelper.get(path, "CommonsApi" as any),
  post: (path: string, data: any[] | Record<string, unknown> = {}): Promise<any> => ApiHelper.post(path, data, "CommonsApi" as any)
};

// Shapes copied from Packages/helpers/src/interfaces/Commons.ts (not yet published for B1Admin to import)
// plus the /commons/admin response shapes documented on CommonsAdminController. Keep in sync by hand.

export type AssetStatus = "pending" | "published" | "unpublished" | "removed";
export type FileAction = "add" | "replace" | "remove";
export type RejectReason = "quality" | "duplicate" | "licensing" | "offtopic" | "incomplete" | "other";
export type ReportReason = "copyright" | "policy" | "quality" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved";
export type ReportResolution = "upheld" | "dismissed" | "duplicate";
export type ReportAction = "none" | "unpublish" | "remove";
export type RemovedReason = "copyright" | "policy";

export const REJECT_REASONS: RejectReason[] = ["quality", "duplicate", "licensing", "offtopic", "incomplete", "other"];
export const RESOLUTIONS: ReportResolution[] = ["upheld", "dismissed", "duplicate"];
export const RESOLVE_ACTIONS: ReportAction[] = ["none", "unpublish", "remove"];
export const REMOVE_REASONS: RemovedReason[] = ["copyright", "policy"];

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
}

export interface CommonsSubmissionDetail extends CommonsQueueRow {
  payload?: CommonsPayload;
  files: CommonsSubmissionFile[];
  live?: CommonsLiveAsset;
  diff: { fields: CommonsDiffField[]; files: CommonsFileSummary[] };
  previewUrl?: string;
  detailFields?: CommonsDetailField[];
  attestations?: CommonsAttestation[];
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
}
