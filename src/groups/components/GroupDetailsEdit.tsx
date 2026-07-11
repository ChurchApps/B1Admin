import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { CategorySelect, ServiceTimesEdit } from ".";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";
import { GalleryModal } from "../../components/gallery";
import { Navigate } from "react-router-dom";
import { Button, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, Stack, TextField, Box, Typography } from "@mui/material";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { type GroupInterface } from "@churchapps/helpers";
import { useMountedState } from "@churchapps/apphelper";
import { MarkdownEditor } from "@churchapps/apphelper/markdown";
import { GroupLabelsEdit } from "./GroupLabelsEdit";
import { CampusSelect } from "../../components/CampusSelect";
import { GRADE_OPTIONS } from "../../helpers/GradeOptions";

type AnyRecord = Record<string, any>;

interface Props {
  id?: string;
  group: GroupInterface;
  updatedFunction: () => void;
}

export const GroupDetailsEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
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
      joinPolicy: "open",
      publicRoster: "false",
      confidential: "false",
      minYears: "",
      minMonths: "",
      maxYears: "",
      maxMonths: "",
      minGrade: "",
      maxGrade: "",
      capacity: "",
      guestCapacity: "",
      checkinClosed: "false",
      volunteerRatio: "",
      minVolunteers: ""
    }
  });

  const numToField = (n?: number) => (n == null ? "" : String(n));
  // null (not undefined) so clearing a numeric field survives JSON and reaches the update SQL.
  const fieldToNum = (v: string): number | null => ((v ?? "") === "" ? null : Number(v));
  const monthsToParts = (m?: number) => (m == null ? { years: "", months: "" } : { years: String(Math.floor(m / 12)), months: String(m % 12) });
  const partsToMonths = (years: string, months: string): number | null => {
    // null (not undefined) so clearing a limit survives JSON and reaches the update SQL.
    if ((years ?? "") === "" && (months ?? "") === "") return null;
    return (Number(years) || 0) * 12 + (Number(months) || 0);
  };

  const { errors } = useFormState({ control });
  const e = errors as any;
  const summaryErrors = useErrorSummary(errors, ["categoryName", "name"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

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
        joinPolicy: props.group.joinPolicy || "open",
        publicRoster: (props.group as AnyRecord).publicRoster?.toString() || "false",
        confidential: (props.group as AnyRecord).confidential?.toString() || "false",
        minYears: monthsToParts(props.group.minAgeMonths).years,
        minMonths: monthsToParts(props.group.minAgeMonths).months,
        maxYears: monthsToParts(props.group.maxAgeMonths).years,
        maxMonths: monthsToParts(props.group.maxAgeMonths).months,
        minGrade: props.group.minGrade || "",
        maxGrade: props.group.maxGrade || "",
        capacity: numToField((props.group as AnyRecord).capacity),
        guestCapacity: numToField((props.group as AnyRecord).guestCapacity),
        checkinClosed: (props.group as AnyRecord).checkinClosed ? "true" : "false",
        volunteerRatio: numToField((props.group as AnyRecord).volunteerRatio),
        minVolunteers: numToField((props.group as AnyRecord).minVolunteers)
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
      labelArray,
      minAgeMonths: partsToMonths(values.minYears, values.minMonths) as number,
      maxAgeMonths: partsToMonths(values.maxYears, values.maxMonths) as number,
      minGrade: values.minGrade || null,
      maxGrade: values.maxGrade || null
    };
    // "" = Unassigned; store null so it matches campusId IS NULL.
    group.campusId = values.campusId || null;
    // Cast until the published GroupInterface includes attendanceReminders.
    (group as AnyRecord).attendanceReminders = values.attendanceReminders === "true";
    (group as AnyRecord).publicRoster = values.publicRoster === "true";
    // Explicit boolean (never undefined) so the un-set path persists — Kysely drops undefined.
    (group as AnyRecord).confidential = values.confidential === "true";
    (group as AnyRecord).capacity = fieldToNum(values.capacity);
    (group as AnyRecord).guestCapacity = fieldToNum(values.guestCapacity);
    (group as AnyRecord).checkinClosed = values.checkinClosed === "true";
    (group as AnyRecord).volunteerRatio = fieldToNum(values.volunteerRatio);
    (group as AnyRecord).minVolunteers = fieldToNum(values.minVolunteers);
    ApiHelper.post("/groups", [group], "MembershipApi").then(() => {
      props.updatedFunction();
    });
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("groups.groupDetailsEdit.confirmMsg"))) {
      ApiHelper.delete("/groups/" + props.group.id!.toString(), "MembershipApi").then(() => setRedirect("/groups"));
    }
  };

  const handleArchive = async () => {
    if (await confirm(Locale.label("groups.groupDetailsEdit.confirmArchive"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
      const group: GroupInterface = { ...props.group, archived: true };
      ApiHelper.post("/groups", [group], "MembershipApi").then(() => setRedirect("/groups"));
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
      aspectRatio={16 / 9}
    />
  );

  if (redirect !== "") return <Navigate to={redirect} />;

  return (
    <>
      {ConfirmDialogElement}
      {galleryModal}
      <FormCard id="groupDetailsBox" title={Locale.label("groups.groupDetailsEdit.groupDet")} icon="group" onSave={handleSubmit(onValid)} onCancel={handleCancel} onDelete={handleDelete} help="docs/b1-admin/groups/"
        headerActions={
          <Button size="small" onClick={handleArchive} data-testid="archive-group-button" aria-label={Locale.label("groups.groupDetailsEdit.archiveAria")}>
            {Locale.label("groups.groupDetailsEdit.archive")}
          </Button>
        }>
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
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.publicRoster")}</InputLabel>
                  <Controller name="publicRoster" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.publicRoster")} data-testid="public-roster-select">
                      <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                      <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                    </Select>
                  )} />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.confidential")}</InputLabel>
                  <Controller name="confidential" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.confidential")} data-testid="confidential-select">
                      <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                      <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
                    </Select>
                  )} />
                  <FormHelperText>{Locale.label("groups.groupDetailsEdit.confidentialHelp")}</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ backgroundColor: "primary.light", color: "primary.contrastText", p: 1.25, my: 2.5 }}>
              <b>{Locale.label("groups.groupDetailsEdit.ageGrade")}</b>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>{Locale.label("groups.groupDetailsEdit.minAge")}</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.years")} slotProps={{ htmlInput: { min: 0 } }} data-testid="min-age-years-input" {...register("minYears")} />
                  <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.months")} slotProps={{ htmlInput: { min: 0, max: 11 } }} data-testid="min-age-months-input" {...register("minMonths")} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>{Locale.label("groups.groupDetailsEdit.maxAge")}</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.years")} slotProps={{ htmlInput: { min: 0 } }} data-testid="max-age-years-input" {...register("maxYears")} />
                  <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.months")} slotProps={{ htmlInput: { min: 0, max: 11 } }} data-testid="max-age-months-input" {...register("maxMonths")} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="minGrade-label">{Locale.label("groups.groupDetailsEdit.minGrade")}</InputLabel>
                  <Controller name="minGrade" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? ""} id="minGrade" labelId="minGrade-label" label={Locale.label("groups.groupDetailsEdit.minGrade")} data-testid="min-grade-select">
                      <MenuItem value="">{Locale.label("groups.groupDetailsEdit.noLimit")}</MenuItem>
                      {GRADE_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  )} />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="maxGrade-label">{Locale.label("groups.groupDetailsEdit.maxGrade")}</InputLabel>
                  <Controller name="maxGrade" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? ""} id="maxGrade" labelId="maxGrade-label" label={Locale.label("groups.groupDetailsEdit.maxGrade")} data-testid="max-grade-select">
                      <MenuItem value="">{Locale.label("groups.groupDetailsEdit.noLimit")}</MenuItem>
                      {GRADE_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  )} />
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ backgroundColor: "primary.light", color: "primary.contrastText", p: 1.25, my: 2.5 }}>
              <b>{Locale.label("groups.groupDetailsEdit.checkinCapacity")}</b>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.capacity")} slotProps={{ htmlInput: { min: 0 } }} data-testid="capacity-input" {...register("capacity")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.guestCapacity")} slotProps={{ htmlInput: { min: 0 } }} data-testid="guest-capacity-input" {...register("guestCapacity")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.volunteerRatio")} slotProps={{ htmlInput: { min: 0 } }} data-testid="volunteer-ratio-input" {...register("volunteerRatio")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="number" label={Locale.label("groups.groupDetailsEdit.minVolunteers")} slotProps={{ htmlInput: { min: 0 } }} data-testid="min-volunteers-input" {...register("minVolunteers")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("groups.groupDetailsEdit.checkinClosed")}</InputLabel>
                  <Controller name="checkinClosed" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? "false"} label={Locale.label("groups.groupDetailsEdit.checkinClosed")} data-testid="checkin-closed-select">
                      <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                      <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
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
