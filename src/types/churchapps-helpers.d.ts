// Local augmentation: the church-wide campus work adds `campusId` to people and
// groups, but the installed @churchapps/helpers predates those fields. Declaring
// them here (forward-compatible: the published interfaces will add the same
// optional field) lets call sites use `person.campusId` / `group.campusId`
// without `as any` casts. Remove once @churchapps/helpers is republished.
import "@churchapps/helpers";

declare module "@churchapps/helpers" {
  interface PersonInterface {
    campusId?: string;
  }
  interface GroupInterface {
    campusId?: string;
  }
}
