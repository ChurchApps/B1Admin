import React, { memo, useMemo } from "react";
import { UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Stack, Chip, Paper, ListItem, ListItemIcon, ListItemText, ListItemButton, Avatar
} from "@mui/material";
import { Group as GroupIcon, Groups as GroupsIcon, SupervisorAccount as LeaderIcon } from "@mui/icons-material";

interface Props {
  personId: string;
  title?: string;
  updatedFunction?: () => void;
}

export const Groups: React.FC<Props> = memo((props) => {
  const groupMembers = useQuery({
    queryKey: ["/groupmembers?personId=" + props.personId, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(props.personId),
    placeholderData: [],
  });

  const recordsContent = useMemo(() => {
    if (groupMembers.isLoading) return <Loading size="sm" />;

    if (!groupMembers.data || groupMembers.data.length === 0) {
      return (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "var(--bg-sub)",
            border: "1px dashed",
            borderColor: "var(--border-main)",
          }}>
          <GroupsIcon sx={{ fontSize: 48, color: "var(--text-muted)", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {Locale.label("people.groups.notMemMsg")}
          </Typography>
        </Paper>
      );
    }

    return (
      <Box
        sx={{
          "& .MuiCard-root": {
            borderRadius: 2,
            border: "1px solid",
            borderColor: "var(--border-light)",
          },
        }}>
        <Stack spacing={2}>
          {groupMembers.data.map((gm) => (
            <Card
              key={gm.id}
              sx={{
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: 2,
                },
              }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <ListItem sx={{ px: 0, py: 0 }}>
                  <ListItemButton
                    component={Link}
                    to={`/groups/${gm.groupId}`}
                    sx={{
                      px: 0,
                      py: 1,
                      borderRadius: 1,
                      "&:hover": { backgroundColor: "action.hover" },
                    }}>
                    <ListItemIcon sx={{ minWidth: 56 }}>
                      {gm.group?.photoUrl ? (
                        <Avatar
                          src={gm.group.photoUrl}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "primary.light",
                          }}>
                          <GroupIcon sx={{ color: "primary.main" }} />
                        </Avatar>
                      ) : (
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "primary.light",
                          }}>
                          <GroupIcon sx={{ color: "primary.main" }} />
                        </Avatar>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: "primary.main",
                            fontSize: "1rem",
                          }}>
                          {gm.group?.name || "Unknown Group"}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {/* Group Type/Category if available */}
                            {gm.group?.categoryName && (
                              <Chip
                                label={gm.group.categoryName}
                                variant="outlined"
                                size="small"
                                sx={{
                                  color: "text.secondary",
                                  borderColor: "var(--border-main)",
                                  fontSize: "0.75rem",
                                }}
                              />
                            )}
                            {/* Leader indicator */}
                            {gm.leader && (
                              <Chip
                                icon={<LeaderIcon />}
                                label="Leader"
                                variant="filled"
                                size="small"
                                color="secondary"
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      }
                      slotProps={{
                        primary: { component: 'div' },
                        secondary: { component: 'div' }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }, [groupMembers.isLoading, groupMembers.data]);

  return recordsContent;
});
