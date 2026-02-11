import React, { memo, useMemo } from "react";
import { GroupDetailsEdit, ServiceTimes } from ".";
import { type GroupInterface } from "@churchapps/helpers";
import { Loading, Locale, ImageEditor } from "@churchapps/apphelper";
import { MarkdownPreview } from "@churchapps/apphelper-markdown";
import { Chip, Grid, Box, Typography, Stack, Card, CardContent, Divider } from "@mui/material";
import { LocationOn as LocationIcon, Schedule as ScheduleIcon, Category as CategoryIcon, Label as LabelIcon, Group as GroupIcon } from "@mui/icons-material";

interface Props {
  group: GroupInterface;
  updatedFunction: (group: GroupInterface) => void;
  loadData: () => void;
  inPhotoEditMode: boolean;
  setInPhotoEditMode: (show: boolean) => void;
  editMode: string;
  setEditMode: (mode: string) => void;
}

export const GroupDetails = memo((props: Props) => {
  const [group, setGroup] = React.useState<GroupInterface>(props.group);
  const { inPhotoEditMode, setInPhotoEditMode, editMode, setEditMode } = props;

  React.useEffect(() => setGroup(props.group), [props.group]);

  const handlePhotoUpdated = (dataUrl: string) => {
    const updatedGroup = { ...group };
    updatedGroup.photoUrl = dataUrl;
    setGroup(updatedGroup);
    setInPhotoEditMode(false);
  };

  const togglePhotoEditor = (show: boolean, updatedGroup?: GroupInterface) => {
    setInPhotoEditMode(show);
    if (updatedGroup) {
      setGroup(updatedGroup);
    }
  };

  const imageEditor = inPhotoEditMode && <ImageEditor aspectRatio={16 / 9} photoUrl={group.photoUrl} onCancel={() => togglePhotoEditor(false)} onUpdate={handlePhotoUpdated} />;

  const handleUpdated = () => {
    setEditMode("display");
    props.loadData();
  };

  const isStandard = useMemo(() => group?.tags?.indexOf("standard") > -1, [group?.tags]);

  const labelChips = useMemo(
    () => group?.labelArray?.map((label, index) => <Chip key={`${group.id}-${label}-${index}`} label={label} variant="outlined" size="medium" sx={{ mr: 1, mb: 1 }} />) || [],
    [group?.labelArray, group?.id]
  );

  const booleanDisplays = useMemo(
    () => ({
      trackAttendance: group?.trackAttendance?.toString().replace("false", Locale.label("common.no")).replace("true", Locale.label("common.yes")) || "",
      parentPickup: group?.parentPickup?.toString().replace("false", Locale.label("common.no")).replace("true", Locale.label("common.yes")) || "",
      printNametag: group?.printNametag?.toString().replace("false", Locale.label("common.no")).replace("true", Locale.label("common.yes")) || ""
    }),
    [group?.trackAttendance, group?.parentPickup, group?.printNametag]
  );

  const getDisplayContent = useMemo(() => {
    if (!group) return <Loading />;

    return (
      <Card elevation={0} sx={{ backgroundColor: "transparent" }}>
        <CardContent sx={{ p: 0 }}>
          <Grid container spacing={3}>
            {/* Group Photo and Basic Info */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    width: { xs: 280, md: 320 },
                    height: { xs: 158, md: 180 }, // 16:9 aspect ratio
                    borderRadius: 3,
                    overflow: "hidden",
                    mx: "auto",
                    mb: 2,
                    backgroundColor: group.photoUrl ? "transparent" : "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid",
                    borderColor: "grey.300",
                    position: "relative"
                  }}>
                  {group.photoUrl ? (
                    <img
                      src={group.photoUrl}
                      alt={group.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1} sx={{ color: "grey.500" }}>
                      <GroupIcon sx={{ fontSize: 48 }} />
                      <Typography variant="body2" color="grey.500">
                        {Locale.label("groups.groupDetails.noPhoto")}
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Typography variant="h5" gutterBottom>
                  {group.name}
                </Typography>
                {isStandard && group.categoryName && (
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 2 }}>
                    <CategoryIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    <Typography variant="body1" color="text.secondary">
                      {group.categoryName}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Grid>

            {/* Group Details */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                {/* Meeting Info */}
                {isStandard && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
                      {Locale.label("groups.groupDetails.meetingInfo")}
                    </Typography>
                    <Stack spacing={2}>
                      {group.meetingTime && (
                        <Stack direction="row" spacing={2} alignItems="center">
                          <ScheduleIcon sx={{ color: "text.secondary" }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {Locale.label("groups.groupDetails.meetingTime")}
                            </Typography>
                            <Typography variant="body1">{group.meetingTime}</Typography>
                          </Box>
                        </Stack>
                      )}
                      {group.meetingLocation && (
                        <Stack direction="row" spacing={2} alignItems="center">
                          <LocationIcon sx={{ color: "text.secondary" }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {Locale.label("groups.groupDetails.meetingLocation")}
                            </Typography>
                            <Typography variant="body1">{group.meetingLocation}</Typography>
                          </Box>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Attendance Settings */}
                {isStandard && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
                      {Locale.label("groups.groupDetails.attendanceSettings")}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {Locale.label("groups.groupDetails.trackAttendance")}
                        </Typography>
                        <Typography variant="body1">{booleanDisplays.trackAttendance}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {Locale.label("groups.groupDetails.parentPickup")}
                        </Typography>
                        <Typography variant="body1">{booleanDisplays.parentPickup}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {Locale.label("groups.groupDetails.printNametag")}
                        </Typography>
                        <Typography variant="body1">{booleanDisplays.printNametag}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Labels */}
                {labelChips.length > 0 && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <LabelIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                      <Typography variant="h6" sx={{ color: "primary.main" }}>
                        {Locale.label("groups.groupDetails.labels")}
                      </Typography>
                    </Stack>
                    <Box>{labelChips}</Box>
                  </Box>
                )}

                {/* About Section */}
                {isStandard && group.about && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
                      {Locale.label("groups.groupDetails.about")}
                    </Typography>
                    <MarkdownPreview value={group.about} />
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Service Times */}
          {isStandard && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 3 }} />
              <ServiceTimes group={group} />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }, [group, isStandard, labelChips, booleanDisplays]);

  if (!group) return null;

  return (
    <>
      {imageEditor}

      {editMode === "edit" ? <GroupDetailsEdit id="groupDetailsBox" group={group} updatedFunction={handleUpdated} togglePhotoEditor={togglePhotoEditor} /> : <>{getDisplayContent}</>}
    </>
  );
});
