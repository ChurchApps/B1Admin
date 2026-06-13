import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { CategorySelect, ServiceTimesEdit } from ".";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { GalleryModal } from "../../components/gallery";
import { Navigate } from "react-router-dom";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Box, Typography } from "@mui/material";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { type GroupInterface } from "@churchapps/helpers";
import { useMountedState } from "@churchapps/apphelper";
import { MarkdownEditor } from "@churchapps/apphelper/markdown";
import { GroupLabelsEdit } from "./GroupLabelsEdit";
import { CampusSelect } from "../../components/CampusSelect";

type AnyRecord = Record<string, any>;

interface Props {
  id?: string;
  group: GroupInterface;
  updatedFunction: () => void;
}

export const GroupDetailsEdit: React.FC<Props> = (props) => {
  const [redirect, setRedirect] = React.useState("");
  const [showGalleryModal, setShowGalleryModal] = React.useState(false);
  // Non-RHF state for external widgets
  const [about, setAbout] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [labelArray, setLabelArray] = React.useState<string[]>([]);
  const isMounted = useMountedState();

  const { control, register, handleSubmit, reset } = useForm<AnyRecord>({
    defaultValues: {
      name: "",
      categoryName: "",
      meetingTime: "",
      meetingLocation: "",
      trackAttendance: "false",
      attendanceReminders: "false",
      parentPickup: "false",
      printNametag: "false",
      slug: "",
      campusId: "",
      joinPolicy: "open"
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.categoryName?.message) errs.push(e.categoryName.message);
    if (e.name?.message) errs.push(e.name.message);
    return errs;
  }, [errors]);

  React.useEffect(() => {
    if (isMounted() && props.group) {
      reset({
        name: props.group.name || "",
        categoryName: props.group.categoryName || "",
        meetingTime: props.group.meetingTime || "",
        meetingLocation: props.group.meetingLocation || "",
        trackAttendance: props.group.trackAttendance?.toString() || "false",
        attendanceReminders: (props.group as AnyRecord).attendanceReminders?.toString() || "false",
        parentPickup: props.group.parentPickup?.toString() || "false",
        printNametag: props.group.printNametag?.toString() || "false",
        slug: props.group.slug || "",
        campusId: props.group.campusId || "",
        joinPolicy: props.group.joinPolicy || "open"
      });
      setAbout(props.group.about || "");
      setPhotoUrl(props.group.photoUrl || "");
      setLabelArray(props.group.labelArray || []);
    }
  }, [props.group, isMounted, reset]);

  const handleCancel = () => props.updatedFunction();

  const onValid = (values: AnyRecord) => {
    const group: GroupInterface = {
      ...props.group,
      name: values.name,
      categoryName: values.categoryName,
      meetingTime: values.meetingTime,
      meetingLocation: values.meetingLocation,
      trackAttendance: values.trackAttendance === "true",
      parentPickup: values.parentPickup === "true",
      printNametag: values.printNametag === "true",
      slug: values.slug,
      joinPolicy: values.joinPolicy as GroupInterface["joinPolicy"],
      about,
      photoUrl,
      labelArray
    };
    // "" = Unassigned; store null so it matches campusId IS NULL.
    group.campusId = values.campusId || null;
    // Cast until the published GroupInterface includes attendanceReminders.
    (group as AnyRecord).attendanceReminders = values.attendanceReminders === "true";
    ApiHelper.post("/groups", [group], "MembershipApi").then(() => {
      props.updatedFunction();
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("groups.groupDetailsEdit.confirmMsg"))) {
      ApiHelper.delete("/groups/" + props.group.id.toString(), "MembershipApi").then(() => setRedirect("/groups"));
    }
  };

  const handlePhotoSelected = (newPhotoUrl: string) => {
    setPhotoUrl(newPhotoUrl);
    setShowGalleryModal(false);
  };

  const toggleGalleryModal = (show: boolean) => {
    setShowGalleryModal(show);
  };

  const teamMode = props.group?.tags?.indexOf("team") !== -1;

  const getAttendance = () => {
    if (teamMode) return <></>;
    return (
      <>
        <Box sx={{ backgroundColor: "primary.light", color: "primary.contrastText", p: 1.25, my: 2.5 }}>
          <b>{Locale.label("groups.groupDetailsEdit.attendance")}</b>
        </Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction={{ xs: "column", md: "row" }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("groups.groupDetailsEdit.attTrack")}</InputLabel>
                <Controller name="trackAttendance" control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.attTrack")} id="trackAttendance" data-cy="select-attendance-type">
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                )} />
              </FormControl>
              <FormControl fullWidth sx={{ marginLeft: { md: 2 } }}>
                <InputLabel>{Locale.label("groups.groupDetailsEdit.attendanceReminders")}</InputLabel>
                <Controller name="attendanceReminders" control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.attendanceReminders")} data-testid="attendance-reminders-select">
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                )} />
              </FormControl>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction={{ xs: "column", md: "row" }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("groups.groupDetailsEdit.parPick")}</InputLabel>
                <Controller name="parentPickup" control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.parPick")}>
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                )} />
              </FormControl>
              <FormControl fullWidth sx={{ marginLeft: { md: 2 } }}>
                <InputLabel>{Locale.label("groups.groupDetailsEdit.prinName")}</InputLabel>
                <Controller name="printNametag" control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.prinName")}>
                    <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                    <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                  </Select>
                )} />
              </FormControl>
            </Stack>
          </Grid>
        </Grid>
        <ServiceTimesEdit group={props.group} />
      </>
    );
  };

  const galleryModal = showGalleryModal && (
    <GalleryModal
      onSelect={handlePhotoSelected}
      onCancel={() => setShowGalleryModal(false)}
      contentRoot="https://contentdemo.churchapps.org"
      aspectRatio={16 / 9}
    />
  );

  if (redirect !== "") return <Navigate to={redirect} />;

  return (
    <>
      {galleryModal}
      <FormCard id="groupDetailsBox" title={Locale.label("groups.groupDetailsEdit.groupDet")} icon="group" onSave={handleSubmit(onValid)} onCancel={handleCancel} onDelete={handleDelete} help="docs/b1-admin/groups/">
        <ErrorMessages errors={summaryErrors} />
        <Grid container spacing={3}>
          {!teamMode && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="categoryName" control={control} rules={{ required: Locale.label("groups.groupDetailsEdit.catNameMsg") }} render={({ field }) => (
                <CategorySelect
                  value={field.value}
                  onChange={field.onChange}
                  label={Locale.label("groups.groupDetailsEdit.catName")}
                  tags={props.group?.tags}
                  testId="category-name"
                />
              )} />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("groups.groupDetailsEdit.groupName")} type="text" placeholder={Locale.label("placeholders.group.name")} data-testid="group-name-input" aria-label={Locale.label("groups.groupDetailsEdit.groupNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("groups.groupDetailsEdit.groupNameMsg") })} />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          {!teamMode && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="text" placeholder={Locale.label("groups.groupDetails.meetingTimePlaceholder")} label={Locale.label("groups.groupDetailsEdit.meetingTime")} data-testid="meeting-time-input" aria-label={Locale.label("groups.groupDetailsEdit.meetingTimeAria")} {...register("meetingTime")} />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth type="text" placeholder={Locale.label("groups.groupDetails.locationPlaceholder")} label={Locale.label("groups.groupDetailsEdit.meetingLocation")} data-testid="meeting-location-input" aria-label={Locale.label("groups.groupDetailsEdit.meetingLocationAria")} {...register("meetingLocation")} />
          </Grid>
        </Grid>
        {!teamMode && (
          <>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <MarkdownEditor
                  value={about}
                  onChange={(val) => setAbout(val)}
                  style={{ maxHeight: 200, overflowY: "scroll" }}
                  placeholder={Locale.label("groups.groupDetailsEdit.groupDesc")}
                  data-testid="group-description-editor"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: 280,
                      height: 158,
                      borderRadius: 2,
                      overflow: "hidden",
                      mx: "auto",
                      mb: 2,
                      backgroundColor: photoUrl ? "transparent" : "grey.100",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid",
                      borderColor: "grey.300",
                      cursor: "pointer",
                      "&:hover": { borderColor: "primary.main" }
                    }}
                    onClick={(ev) => { ev.preventDefault(); toggleGalleryModal(true); }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt={Locale.label("groups.groupDetailsEdit.groupPhotoAlt")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Stack alignItems="center" spacing={1} sx={{ color: "grey.500" }}>
                        <PhotoCameraIcon sx={{ fontSize: 32 }} />
                        <Typography variant="body2" color="grey.500">{Locale.label("groups.groupDetailsEdit.clickToAddPhoto")}</Typography>
                      </Stack>
                    )}
                  </Box>
                  <Button variant="outlined" onClick={(ev) => { ev.preventDefault(); toggleGalleryModal(true); }} data-testid="change-photo-button" aria-label={Locale.label("groups.groupDetailsEdit.changePhotoAria")} size="small">
                    {photoUrl ? Locale.label("common.changePhoto") : Locale.label("groups.groupDetailsEdit.addPhoto")}
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="text" label={Locale.label("groups.groupDetailsEdit.slug")} placeholder={Locale.label("groups.groupDetails.slugPlaceholder")} data-testid="group-slug-input" aria-label={Locale.label("groups.groupDetailsEdit.groupSlugAria")} {...register("slug")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <GroupLabelsEdit group={{ ...props.group, labelArray }} onUpdate={(val) => setLabelArray(val)} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CampusSelect control={control} testId="group-campus-select" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.enrollment") || "Enrollment"}</InputLabel>
                  <Controller name="joinPolicy" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? "open"} label={Locale.label("groups.groupDetailsEdit.enrollment") || "Enrollment"} data-testid="join-policy-select">
                      <MenuItem value="open">Open (members can join immediately)</MenuItem>
                      <MenuItem value="request">Request to Join (leader approval required)</MenuItem>
                      <MenuItem value="closed">Closed (admin-add only)</MenuItem>
                    </Select>
                  )} />
                </FormControl>
              </Grid>
            </Grid>
          </>
        )}
        {getAttendance()}
      </FormCard>
    </>
  );
};
