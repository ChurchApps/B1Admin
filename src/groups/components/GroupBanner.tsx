import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import { Typography, Chip, IconButton, Stack, Box, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Event as CalendarIcon,
  Sms as SmsIcon
} from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { SendTextDialog } from "./SendTextDialog";

interface Props {
  group: GroupInterface;
  onEdit?: () => void;
  editMode?: boolean;
}

export const GroupBanner = memo((props: Props) => {
  const { group, onEdit, editMode } = props;
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [showTextDialog, setShowTextDialog] = React.useState(false);
  const [hasTextingProvider, setHasTextingProvider] = React.useState(false);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groups.edit), []);
  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.edit), []);

  React.useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi")
        .then((data: any[]) => setHasTextingProvider(data?.length > 0))
        .catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  React.useEffect(() => {
    if (group?.id) {
      ApiHelper.get("/groupservicetimes?groupId=" + group.id, "AttendanceApi")
        .then((data) => setGroupServiceTimes(data))
        .catch(() => setGroupServiceTimes([]));
    }
  }, [group?.id]);

  const isStandard = useMemo(() => group?.tags?.indexOf("standard") > -1, [group?.tags]);

  const groupType = useMemo(() => {
    if (!group?.tags) return null;
    if (group.tags.indexOf("team") > -1) {
      return (
        <Chip
          label={Locale.label("groups.groupBanner.team")}
          size="small"
          sx={{
            backgroundColor: "#e3f2fd",
            color: "#1565c0",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}
        />
      );
    }
    if (group.categoryName) {
      return (
        <Chip
          label={group.categoryName}
          size="small"
          sx={{
            backgroundColor: "#f3e5f5",
            color: "#6a1b9a",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}
        />
      );
    }
    return null;
  }, [group?.tags, group?.categoryName]);

  const quickStats = useMemo(() => {
    if (!group) return [];
    const stats = [];

    if (isStandard && group.meetingTime) {
      stats.push({
        icon: <ScheduleIcon sx={{ color: "#fff", fontSize: 16, mr: 0.5 }} />,
        value: group.meetingTime
      });
    }

    if (group.meetingLocation) {
      stats.push({
        icon: <LocationIcon sx={{ color: "#fff", fontSize: 16, mr: 0.5 }} />,
        value: group.meetingLocation
      });
    }

    return stats;
  }, [group, isStandard, groupServiceTimes]);

  const attendanceInfo = useMemo(() => {
    if (!group || !isStandard) return [];
    const info = [];

    if (group.trackAttendance !== undefined) {
      info.push({
        icon: group.trackAttendance ? <CheckIcon sx={{ color: "#4caf50", fontSize: 16, mr: 0.5 }} /> : <CancelIcon sx={{ color: "#f44336", fontSize: 16, mr: 0.5 }} />,
        label: Locale.label("groups.groupBanner.trackAttendance"),
        value: group.trackAttendance ? Locale.label("common.yes") : Locale.label("common.no")
      });
    }

    if (group.printNametag !== undefined) {
      info.push({
        icon: group.printNametag ? <CheckIcon sx={{ color: "#4caf50", fontSize: 16, mr: 0.5 }} /> : <CancelIcon sx={{ color: "#f44336", fontSize: 16, mr: 0.5 }} />,
        label: Locale.label("groups.groupBanner.printNametag"),
        value: group.printNametag ? Locale.label("common.yes") : Locale.label("common.no")
      });
    }

    if (group.parentPickup !== undefined) {
      info.push({
        icon: group.parentPickup ? <CheckIcon sx={{ color: "#4caf50", fontSize: 16, mr: 0.5 }} /> : <CancelIcon sx={{ color: "#f44336", fontSize: 16, mr: 0.5 }} />,
        label: Locale.label("groups.groupBanner.parentPickup"),
        value: group.parentPickup ? Locale.label("common.yes") : Locale.label("common.no")
      });
    }

    return info;
  }, [group, isStandard]);

  if (!group) return null;

  return (
    <div style={{ backgroundColor: "var(--c1l2)", color: "#FFF", padding: "20px" }}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        {/* Main Layout: Photo on left, Content on right */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 3, md: 4 }} alignItems={{ xs: "center", md: "flex-start" }} sx={{ width: "100%" }}>
          {/* Left: Photo */}
          <Box
            sx={{
              width: { xs: 120, md: 160 },
              height: { xs: 68, md: 90 }, // 16:9 aspect ratio
              borderRadius: 2,
              overflow: "hidden",
              border: "3px solid #FFF",
              flexShrink: 0,
              backgroundColor: group.photoUrl ? "transparent" : "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
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
              <GroupIcon sx={{ fontSize: { xs: 32, md: 40 }, color: "rgba(255,255,255,0.7)" }} />
            )}
          </Box>

          {/* Right: Content Area */}
          <Stack spacing={1.5} sx={{ flex: 1, width: "100%" }}>
            {/* Row 1: Group Name, Category, Edit - Full Width */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ width: "100%" }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography
                  sx={{
                    color: "#FFF",
                    fontWeight: 400,
                    mb: 0,
                    wordBreak: "break-word",
                    fontSize: { xs: "1.75rem", md: "2.125rem" },
                    lineHeight: 1.1
                  }}>
                  {group.name}
                </Typography>
                {groupType}
              </Stack>
              {canText && hasTextingProvider && (
                <Tooltip title="Text this group">
                  <IconButton size="small" sx={{ color: "#FFF" }} onClick={() => setShowTextDialog(true)}>
                    <SmsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canEdit && (
                <IconButton size="small" sx={{ color: "#FFF" }} onClick={onEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>

            {/* Row 2: Three Columns */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.5, md: 2 }} sx={{ width: "100%" }}>
              {/* Column 1: Time/Place */}
              <Stack spacing={1} sx={{ flex: 1 }}>
                {quickStats.length > 0 && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: { xs: "0.75rem", md: "0.875rem" },
                      fontWeight: 600,
                      mb: 1,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                    {Locale.label("groups.groupBanner.meetingInfo")}
                  </Typography>
                )}
                {quickStats.map((stat, idx) => (
                  <Stack key={`quickstat-${stat.value}-${idx}`} direction="row" alignItems="center">
                    {stat.icon}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#FFF",
                        fontSize: { xs: "0.875rem", md: "1rem" }
                      }}>
                      {stat.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Column 2: Settings and Labels */}
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                {attendanceInfo.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: { xs: "0.75rem", md: "0.875rem" },
                        fontWeight: 600,
                        mb: 1,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                      {Locale.label("groups.groupBanner.settings")}
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      {attendanceInfo.map((info, idx) => (
                        <Stack key={`attendance-${info.label}-${idx}`} direction="row" alignItems="center" spacing={0.5}>
                          {info.icon}
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(255,255,255,0.9)",
                              fontSize: { xs: "0.75rem", md: "0.875rem" },
                              fontWeight: 500,
                              whiteSpace: "nowrap"
                            }}>
                            {info.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Labels */}
                {(() => {
                  // Filter out empty, null, or whitespace-only labels
                  const validLabels = group.labelArray?.filter((label) => label && typeof label === "string" && label.trim() !== "") || [];

                  if (validLabels.length === 0) return null;

                  return (
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: { xs: "0.75rem", md: "0.875rem" },
                          fontWeight: 600,
                          mb: 1,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                        {Locale.label("groups.groupBanner.labels")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {validLabels.slice(0, 4).map((label, idx) => (
                          <Chip
                            key={`label-${label.trim()}-${idx}`}
                            label={label.trim()}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(255,255,255,0.2)",
                              color: "#FFF",
                              fontSize: "0.75rem",
                              height: 20
                            }}
                          />
                        ))}
                        {validLabels.length > 4 && (
                          <Chip
                            label={Locale.label("groups.groupBanner.moreLabels").replace("{count}", (validLabels.length - 4).toString())}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.7)",
                              fontSize: "0.75rem",
                              height: 20
                            }}
                          />
                        )}
                      </Stack>
                    </Box>
                  );
                })()}
              </Stack>

            </Stack>
          </Stack>
        </Stack>

        {/* Services Row - Full Width */}
        {groupServiceTimes.length > 0 && (
          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", pt: 1.5 }}>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: { xs: "0.75rem", md: "0.875rem" },
                fontWeight: 600,
                mb: 1,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
              {Locale.label("groups.groupBanner.associatedServices")}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {groupServiceTimes.map((gst, idx) => (
                <Chip
                  key={`servicetime-${gst.serviceTime.name}-${idx}`}
                  icon={<CalendarIcon sx={{ fontSize: 14 }} />}
                  label={gst.serviceTime.name}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "#FFF",
                    fontSize: "0.875rem",
                    height: 24,
                    "& .MuiChip-icon": { color: "#FFF" }
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Bottom Row: Description - Spans All Columns */}
        {isStandard && group.about && (
          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", pt: 1.5, mt: groupServiceTimes.length > 0 ? 0 : 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontSize: { xs: "0.875rem", md: "0.95rem" },
                lineHeight: 1.4,
                fontStyle: "italic"
              }}>
              {group.about.replace(/[#*_`]/g, "")}
            </Typography>
          </Box>
        )}
      </Stack>
      {showTextDialog && (
        <SendTextDialog
          groupId={group?.id}
          groupName={group?.name}
          onClose={() => setShowTextDialog(false)}
        />
      )}
    </div>
  );
});
