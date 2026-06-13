import React, { memo } from "react";
import { Household, Merge, PersonEdit, PersonExportDialog, PersonProfileTabs, PersonView } from "./";
import { type PersonInterface } from "@churchapps/helpers";
import { ImageEditor, Locale, Permissions, PersonHelper, UserHelper } from "@churchapps/apphelper";
import { Button } from "@mui/material";
import { FileDownload as ExportIcon } from "@mui/icons-material";

interface Props {
  person: PersonInterface;
  updatedFunction: () => void;
  inPhotoEditMode: boolean;
  setInPhotoEditMode: (show: boolean) => void;
  editMode: string;
  setEditMode: (mode: string) => void;
}
export const PersonDetails = memo((props: Props) => {
  const [person, setPerson] = React.useState<PersonInterface>(props.person);
  const [showMergeSearch, setShowMergeSearch] = React.useState<boolean>(false);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const { inPhotoEditMode, setInPhotoEditMode, editMode, setEditMode } = props;
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  React.useEffect(() => setPerson(props.person), [props.person]);

  const handlePhotoUpdated = (dataUrl: string) => {
    const updatedPerson = { ...person };
    updatedPerson.photo = dataUrl;
    if (!dataUrl) {
      updatedPerson.photoUpdated = null;
    }
    setPerson(updatedPerson);
    setInPhotoEditMode(false);
  };

  const togglePhotoEditor = (show: boolean, updatedPerson?: PersonInterface) => {
    setInPhotoEditMode(show);
    if (updatedPerson) {
      setPerson(updatedPerson);
    }
  };

  const imageEditor = inPhotoEditMode && <ImageEditor aspectRatio={4 / 3} photoUrl={PersonHelper.getPhotoUrl(person)} onCancel={() => togglePhotoEditor(false)} onUpdate={handlePhotoUpdated} />;

  const handleShowSearch = () => {
    setShowMergeSearch(true);
  };

  const hideMergeBox = () => {
    setShowMergeSearch(false);
  };

  const addMergeSearch = showMergeSearch ? <Merge hideMergeBox={hideMergeBox} person={person} /> : null;

  const handleUpdated = () => {
    setEditMode("display");
    props.updatedFunction();
  };

  if (!person) return null;

  return (
    <>
      {addMergeSearch}
      {imageEditor}
      <PersonExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} person={person} />

      {editMode === "edit" ? (
        <PersonEdit id="personDetailsBox" person={person} updatedFunction={handleUpdated} togglePhotoEditor={togglePhotoEditor} showMergeSearch={handleShowSearch} />
      ) : (
        <PersonProfileTabs
          person={person}
          updatedFunction={props.updatedFunction}
          profileContent={(
            <>
              <PersonView
                person={person}
                editFunction={() => setEditMode("edit")}
                updatedFunction={props.updatedFunction}
                showForms={false}
                headerActions={formPermission ? (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={() => setShowExportDialog(true)} sx={{ minWidth: "auto" }}>
                    {Locale.label("people.peoplePage.export") || "Export"}
                  </Button>
                ) : undefined}
              />
              <Household person={person} reload={person?.photoUpdated} />
            </>
          )}
        />
      )}
    </>
  );
});
