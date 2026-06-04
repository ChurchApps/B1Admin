import { type CampusInterface as BaseCampusInterface } from "@churchapps/helpers";

// Local extension of the published CampusInterface ({ id, name }) with the
// church-wide campus fields added by the Membership campus work. The fields
// already exist in Packages/helpers/src/interfaces/Membership.ts; swap this for
// the published @churchapps/helpers interface once that package is released.
export interface CampusInterface extends BaseCampusInterface {
  churchId?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  timezone?: string;
  website?: string;
  importKey?: string;
}
