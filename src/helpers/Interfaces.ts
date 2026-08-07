import type { SessionInterface as BaseSessionInterface, ServiceTimeInterface } from "@churchapps/helpers";

export interface SessionInterface extends BaseSessionInterface {
  serviceTime?: ServiceTimeInterface;
  _updateTimestamp?: number;
}

// Mirrors @churchapps/helpers — switch to the package exports once >1.7.1 is published.
export interface CampaignInterface {
  id?: string;
  churchId?: string;
  fundId?: string;
  name?: string;
  description?: string;
  goalAmount?: number;
  startDate?: string;
  endDate?: string;
  showPublic?: boolean;
  allowSelfPledge?: boolean;
}

export interface PledgeInterface {
  id?: string;
  churchId?: string;
  campaignId?: string;
  personId?: string;
  amount?: number;
}

export type PledgeStatus = "notStarted" | "inProgress" | "fulfilled" | "beyondPledged" | "nonPledged";

export interface PledgeProgressRowInterface {
  campaignId?: string;
  campaignName?: string;
  personId?: string;
  pledgeId?: string;
  pledgedAmount?: number;
  givenAmount?: number;
  status?: PledgeStatus;
}

export interface CampaignProgressInterface {
  campaign?: CampaignInterface;
  totalPledged?: number;
  totalGiven?: number;
  pledgeCount?: number;
  donorCount?: number;
  rows?: PledgeProgressRowInterface[];
}

export interface PersonFieldChoice {
  value: string;
  text: string;
}

// First-class custom-field definitions/values, independent of the Forms module.
// Temporary local interfaces; move to @churchapps/helpers when published.
export interface PersonFieldInterface {
  id?: string;
  churchId?: string;
  name?: string;
  fieldType?: string;
  choices?: string | null; // JSON string of [{ value, text }]
  sort?: number;
}

export interface PersonFieldValueInterface {
  id?: string;
  churchId?: string;
  personId?: string;
  fieldId?: string;
  value?: string;
}

export interface PaymentGatewaysInterface {
  id?: string;
  churchId?: string;
  provider?: string;
  publicKey?: string;
  privateKey?: string;
  webhookKey?: string;
  payFees?: boolean;
  currency?: string;
  enabled?: boolean;
  settings?: Record<string, any>;
}

export interface SongInterface {
  id?: string;
  songDetailId?: string;
  name?: string;
  dateAdded: Date;
}

export interface SongDetailInterface {
  id?: string;
  praiseChartsId?: string;
  title?: string;
  artist?: string;
  album?: string;
  language?: string;
  thumbnail?: string;
  releaseDate?: Date;
  bpm?: number;
  keySignature?: string;
  seconds: number;
  meter?: string;
  tones?: string;
  // Properties from song search results
  arrangementKeyId?: string;
  shortDescription?: string;
  arrangementKeySignature?: string;
}

export interface SongDetailLinkInterface {
  id?: string;
  songDetailId?: string;
  service?: string;
  serviceKey?: string;
  url?: string;
}

export interface ArrangementInterface {
  id?: string;
  songId?: string;
  songDetailId?: string;
  name?: string;
  lyrics?: string;
  bpm?: number;
  seconds?: number;
  meter?: string;
  sequence?: string;
}

export interface ArrangementKeyInterface {
  id?: string;
  arrangementId?: string;
  keySignature?: string;
  shortDescription?: string;
}

export interface PlanItemInterface {
  id?: string;
  planId?: string;
  parentId?: string;
  sort?: number;
  itemType?: string;
  relatedId?: string;
  label?: string;
  description?: string;
  seconds?: number;
  link?: string;
  providerId?: string;
  providerPath?: string;
  providerContentPath?: string;
  thumbnailUrl?: string;

  children?: PlanItemInterface[];
}

export interface PlanTypeInterface {
  id?: string;
  churchId?: string;
  ministryId?: string;
  name?: string;
}

export interface PlanTemplateInterface {
  id?: string;
  churchId?: string;
  ministryId?: string;
  name?: string;
  data?: string;
}

export interface AssociatedGroupInterface {
  id?: string;
  churchId?: string;
  contentType?: string;
  contentId?: string;
  groupId?: string;
  settings?: string;
}

export interface PlanInterface {
  id?: string;
  churchId?: string;
  name?: string;
  ministryId?: string;
  campusId?: string;
  planTypeId?: string;
  serviceDate?: Date;
  notes?: string;
  serviceOrder?: boolean;
  contentType?: string;
  contentId?: string;
  providerId?: string;
  providerPlanId?: string;
  providerPlanName?: string;
  signupDeadlineHours?: number;
  showVolunteerNames?: boolean;
  prepared?: boolean;
  autoReplaceOnDecline?: boolean;
  lastAutofillRunId?: string;
}

export interface SchedulingPreferenceInterface {
  id?: string;
  churchId?: string;
  personId?: string;
  maxPerMonth?: number;
  preferredTimes?: string;
  householdScheduling?: string;
}

export interface ProgramInterface {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  live?: boolean;
  churchId?: string;
}

export interface StudyInterface {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  programId?: string;
  sort?: number;
}

export interface LessonInterface {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  studyId?: string;
  sort?: number;
}

export interface VenueInterface {
  id?: string;
  name?: string;
  lessonId?: string;
  sort?: number;
}

export interface ExternalVenueRefInterface {
  externalProviderId: string;
  programId: string;
  studyId: string;
  lessonId: string;
  venueId: string;
}

export interface ExternalProviderInterface {
  id?: string;
  churchId?: string;
  name?: string;
  apiUrl?: string;
}

export interface ContentProviderAuthInterface {
  id?: string;
  churchId?: string;
  ministryId?: string;
  providerId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scope?: string;
}

export type { FileInterface } from "@churchapps/helpers";

export interface SiteInterface {
  id?: string;
  churchId?: string;
  name?: string;
  subDomain?: string;
}

export interface GlobalStyleInterface {
  id?: string;
  churchId?: string;
  siteId?: string;
  fonts?: string;
  palette?: any;
  typography?: string;
  spacing?: string;
  borderRadius?: string;
  navStyles?: string;
  customCss?: string;
  customJS?: string;
}

export interface ColumnInterface {
  size: number;
  elements: ElementInterface[];
}

export interface ElementInterface {
  id?: string;
  churchId?: string;
  sectionId?: string;
  blockId?: string;
  parentId?: string;
  size?: number;
  answersJSON?: string;
  answers?: any;
  stylesJSON?: string;
  styles?: { all?: any; desktop?: any; mobile?: any };
  animationsJSON?: string;
  animations?: { onShow?: string; onShowSpeed?: string };
  sort?: number;
  elementType?: string;
  elements?: ElementInterface[];
}

export interface SectionInterface {
  id?: string;
  churchId?: string;
  pageId?: string;
  blockId?: string;
  zone?: string;
  background?: string;
  textColor?: string;
  headingColor?: string;
  linkColor?: string;
  sort?: number;
  targetBlockId?: string;
  answersJSON?: string;
  answers?: any;
  stylesJSON?: string;
  styles?: any;
  animationsJSON?: string;
  animations?: any;
  sourceId?: string;
  sections?: SectionInterface[];
  elements?: ElementInterface[];
}

export interface PageInterface {
  id?: string;
  churchId?: string;
  siteId?: string;
  url?: string;
  title?: string;
  layout?: string;
  visibility?: string;
  groupIds?: string;
  metaDescription?: string;
  publishedAt?: string;
  sections?: SectionInterface[];
}

export interface PostInterface {
  id?: string;
  churchId?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  authorId?: string | null;
  authorName?: string;
  photoUrl?: string;
  publishDate?: Date | string | null;
  category?: string;
  tags?: string;
}

export interface BlockInterface {
  id?: string;
  churchId?: string;
  siteId?: string;
  blockType?: string;
  name?: string;
  sections?: SectionInterface[];
}

export interface PageLink {
  pageId?: string;
  title: string;
  url: string;
  custom: boolean;
  children?: PageLink[];
  expanded?: boolean;
}

export interface GenericSettingInterface {
  id?: string;
  churchId?: string;
  keyName?: string;
  value?: string;
  public?: number;
}

export interface InlineStylesInterface {
  all?: any;
  desktop?: any;
  mobile?: any;
}

export interface AnimationsInterface {
  onShow: string;
  onShowSpeed: string;
}

export interface StyleOption {
  label: string;
  key: string;
  type: "color" | "px" | "select" | "text" | "text-shadow";
  default: string | number;
  options?: string[];
}

export const allStyleOptions: StyleOption[] = [
  { label: "Border Color", key: "border-color", type: "color", default: "#FF0000" },
  { label: "Border Radius", key: "border-radius", type: "px", default: "5" },
  {
    label: "Border Style",
    key: "border-style",
    type: "select",
    default: "solid",
    options: [
      "none", "solid", "dotted", "dashed", "double", "groove", "ridge", "inset", "outset"
    ]
  },
  { label: "Border Width", key: "border-width", type: "px", default: "1" },
  { label: "Background Color", key: "background-color", type: "color", default: "#FF0000" },
  { label: "Color", key: "color", type: "color", default: "#FF0000" },
  { label: "Font Family", key: "font-family", type: "text", default: "Roboto" },
  { label: "Font Size", key: "font-size", type: "px", default: "14" },
  { label: "Font Style", key: "font-style", type: "select", default: "italic", options: ["normal", "italic"] },
  { label: "Height", key: "height", type: "px", default: 500 },
  { label: "Line Height", key: "line-height", type: "px", default: "14" },
  { label: "Margin", key: "margin", type: "px", default: 0 },
  { label: "Margin Left", key: "margin-left", type: "px", default: 0 },
  { label: "Margin Right", key: "margin-right", type: "px", default: 0 },
  { label: "Margin Top", key: "margin-top", type: "px", default: 0 },
  { label: "Margin Bottom", key: "margin-bottom", type: "px", default: 0 },
  { label: "Max Width", key: "max-width", type: "px", default: 500 },
  { label: "Max Height", key: "max-height", type: "px", default: 500 },
  { label: "Min Width", key: "min-width", type: "px", default: 500 },
  { label: "Min Height", key: "min-height", type: "px", default: 500 },
  { label: "Padding", key: "padding", type: "px", default: 0 },
  { label: "Padding Left", key: "padding-left", type: "px", default: 0 },
  { label: "Padding Right", key: "padding-right", type: "px", default: 0 },
  { label: "Padding Top", key: "padding-top", type: "px", default: 0 },
  { label: "Padding Bottom", key: "padding-bottom", type: "px", default: 0 },
  { label: "Text Shadow", key: "text-shadow", type: "text-shadow", default: "1px 1px 2px black;" },
  { label: "Width", key: "width", type: "px", default: 500 }
];

export interface FeedActionInterface {
  actionType?: string;
  content?: string;
  role?: string;
  files?: FeedFileInterface[];
  id?: string;
}

export interface FeedDownloadInterface {
  name?: string;
  files?: FeedFileInterface[];
}

export interface FeedFileInterface {
  name?: string;
  url?: string;
  streamUrl?: string;
  bytes?: number;
  fileType?: string;
  seconds?: number;
  thumbnail?: string;
  loop?: boolean;
  id?: string;
  expires?: Date;
}

export interface FeedSectionInterface {
  id?: string;
  name?: string;
  actions?: FeedActionInterface[];
  materials?: string;
}

export interface FeedVenueInterface {
  id?: string;
  name?: string;
  lessonId: string;
  lessonName?: string;
  lessonImage?: string;
  lessonDescription?: string;
  studyName?: string;
  studySlug?: string;
  programName?: string;
  programSlug?: string;
  programAbout?: string;
  downloads?: FeedDownloadInterface[];
  sections?: FeedSectionInterface[];
}

