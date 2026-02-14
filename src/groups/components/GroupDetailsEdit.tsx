import React from "react";
import { CategorySelect, ServiceTimesEdit } from ".";
import { ApiHelper, InputBox, ErrorMessages, Locale, GalleryModal } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Box, Typography, type SelectChangeEvent } from "@mui/material";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { type GroupInterface } from "@churchapps/helpers";
import { useMountedState } from "@churchapps/apphelper";
import { MarkdownEditor } from "@churchapps/apphelper-markdown";
import { GroupLabelsEdit } from "./GroupLabelsEdit";

interface Props {
  id?: string;
  group: GroupInterface;
  updatedFunction: () => void;
}

export const GroupDetailsEdit: React.FC<Props> = (props) => {
  const [group, setGroup] = React.useState<GroupInterface>({} as GroupInterface);
  const [errors, setErrors] = React.useState([]);
  const [redirect, setRedirect] = React.useState("");
  const [showGalleryModal, setShowGalleryModal] = React.useState(false);
  const isMounted = useMountedState();

  const handleCancel = () => props.updatedFunction();

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    const g = { ...group };
    switch (e.target.name) {
      case "name": g.name = e.target.value; break;
      case "meetingTime": g.meetingTime = e.target.value; break;
      case "meetingLocation": g.meetingLocation = e.target.value; break;
      case "trackAttendance": g.trackAttendance = e.target.value === "true"; break;
      case "parentPickup": g.parentPickup = e.target.value === "true"; break;
      case "printNametag": g.printNametag = e.target.value === "true"; break;
      case "slug": g.slug = e.target.value; break;
    }
    setGroup(g);
  };

  const handleCategoryChange = (value: string) => {
    setGroup({ ...group, categoryName: value });
  };

  const handleArrayChange = (val: string[]) => {
    const g = { ...group };
    g.labelArray = val;
    setGroup(g);
  };

  const handleMarkdownChange = (newValue: string) => {
    if (group.id) {
      const g = { ...group };
      g.about = newValue;
      setGroup(g);
    }
  };

  const validate = () => {
    const errors = [];
    if (group.categoryName === "") errors.push(Locale.label("groups.groupDetailsEdit.catNameMsg"));
    if (group.name === "") errors.push(Locale.label("groups.groupDetailsEdit.groupNameMsg"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      ApiHelper.post("/groups", [group], "MembershipApi").then((data) => {
        setGroup(data);
        props.updatedFunction();
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("groups.groupDetailsEdit.confirmMsg"))) {
      ApiHelper.delete("/groups/" + group.id.toString(), "MembershipApi").then(() => setRedirect("/groups"));
    }
  };

  const handlePhotoSelected = (photoUrl: string) => {
    const updatedGroup = { ...group, photoUrl: photoUrl };
    setGroup(updatedGroup);
    setShowGalleryModal(false);
  };

  const toggleGalleryModal = (show: boolean) => {
    setShowGalleryModal(show);
  };

  React.useEffect(() => {
    if (isMounted()) {
      setGroup(props.group);
    }
  }, [props.group, isMounted]);

  const getAttendance = () => {
    if (teamMode) return <></>;
    else {
      return (
        <>
          <div
            style={{
              backgroundColor: "var(--c1l2)",
              color: "#FFF",
              padding: 10,
              marginTop: 20,
              marginBottom: 20
            }}>
            <b>{Locale.label("groups.groupDetailsEdit.attendance")}</b>
          </div>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("groups.groupDetailsEdit.attTrack")}</InputLabel>
                <Select
                  label={Locale.label("groups.groupDetailsEdit.attTrack")}
                  id="trackAttendance"
                  name="trackAttendance"
                  data-cy="select-attendance-type"
                  value={group.trackAttendance?.toString() || "false"}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}>
                  <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                  <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction={{ xs: "column", md: "row" }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.parPick")}</InputLabel>
                  <Select
                    label={Locale.label("groups.groupDetailsEdit.parPick")}
                    name="parentPickup"
                    value={group.parentPickup?.toString() || "false"}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}>
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ marginLeft: { md: 2 } }}>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.prinName")}</InputLabel>
                  <Select
                    label={Locale.label("groups.groupDetailsEdit.prinName")}
                    name="printNametag"
                    value={group.printNametag?.toString() || "false"}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}>
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
          </Grid>
          <ServiceTimesEdit group={group} />
        </>
      );
    }
  };

  const teamMode = group?.tags?.indexOf("team") !== -1;

  const galleryModal = showGalleryModal && (
    <GalleryModal
      onSelect={handlePhotoSelected}
      onCancel={() => setShowGalleryModal(false)}
      contentRoot="https://contentdemo.churchapps.org"
      aspectRatio={16 / 9}
    />
  );

  if (redirect !== "") return <Navigate to={redirect} />;
  else {
    return (
      <>
        {galleryModal}
        <InputBox id="groupDetailsBox" headerText={Locale.label("groups.groupDetailsEdit.groupDet")} headerIcon="group" saveFunction={handleSave} cancelFunction={handleCancel} deleteFunction={handleDelete} help="docs/b1-admin/groups/">
          <ErrorMessages errors={errors} />
          <Grid container spacing={3}>
            {!teamMode && (
              <Grid size={{ xs: 12, md: 6 }}>
                <CategorySelect
                  value={group.categoryName || ""}
                  onChange={handleCategoryChange}
                  label={Locale.label("groups.groupDetailsEdit.catName")}
                  tags={group.tags}
                  testId="category-name"
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={Locale.label("groups.groupDetailsEdit.groupName")}
                type="text"
                name="name"
                value={group.name || ""}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={Locale.label("placeholders.group.name")}
                data-testid="group-name-input"
                aria-label="Group name"
              />
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            {!teamMode && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="text"
                  name="meetingTime"
                  placeholder={Locale.label("groups.groupDetails.meetingTimePlaceholder")}
                  label={Locale.label("groups.groupDetailsEdit.meetingTime")}
                  value={group.meetingTime || ""}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  data-testid="meeting-time-input"
                  aria-label="Meeting time"
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="text"
                name="meetingLocation"
                placeholder={Locale.label("groups.groupDetails.locationPlaceholder")}
                label={Locale.label("groups.groupDetailsEdit.meetingLocation")}
                value={group.meetingLocation || ""}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                data-testid="meeting-location-input"
                aria-label="Meeting location"
              />
            </Grid>
          </Grid>
          {!teamMode && (
            <>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <MarkdownEditor
                    value={group.about || ""}
                    onChange={(val) => handleMarkdownChange(val)}
                    style={{ maxHeight: 200, overflowY: "scroll" }}
                    placeholder={Locale.label("groups.groupDetailsEdit.groupDesc")}
                    data-testid="group-description-editor"
                    ariaLabel="Group description"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 280,
                        height: 158, // 16:9 aspect ratio
                        borderRadius: 2,
                        overflow: "hidden",
                        mx: "auto",
                        mb: 2,
                        backgroundColor: group.photoUrl ? "transparent" : "grey.100",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid",
                        borderColor: "grey.300",
                        cursor: "pointer",
                        "&:hover": { borderColor: "primary.main" }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGalleryModal(true);
                      }}>
                      {group.photoUrl ? (
                        <img
                          src={group.photoUrl}
                          alt="group"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <Stack alignItems="center" spacing={1} sx={{ color: "grey.500" }}>
                          <PhotoCameraIcon sx={{ fontSize: 32 }} />
                          <Typography variant="body2" color="grey.500">
                            {Locale.label("groups.groupDetailsEdit.clickToAddPhoto")}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGalleryModal(true);
                      }}
                      data-testid="change-photo-button"
                      aria-label="Change group photo"
                      size="small">
                      {group.photoUrl ? Locale.label("common.changePhoto") : Locale.label("groups.groupDetailsEdit.addPhoto")}
                    </Button>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="text"
                    name="slug"
                    label={Locale.label("groups.groupDetailsEdit.slug")}
                    value={group.slug || ""}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={Locale.label("groups.groupDetails.slugPlaceholder")}
                    data-testid="group-slug-input"
                    aria-label="Group slug"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <GroupLabelsEdit group={group} onUpdate={handleArrayChange} />
                </Grid>
              </Grid>
            </>
          )}
          {getAttendance()}
        </InputBox>
      </>
    );
  }
};
