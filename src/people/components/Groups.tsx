import React, { memo, useMemo } from "react";
import { UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box, Card, CardContent, Typography, Stack, Chip, ListItem, ListItemIcon, ListItemText, ListItemButton, Avatar } from "@mui/material";
import { Group as GroupIcon, Groups as GroupsIcon, SupervisorAccount as LeaderIcon } from "@mui/icons-material";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionHeading } from "../../components/ui/SectionHeading";

interface Props {
  personId: string;
  title?: string;
  updatedFunction?: () => void;
}

export const Groups: React.FC<Props> = memo((props) => {
  const groupMembers = useQuery({
    queryKey: ["/groupmembers?personId=" + props.personId, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(props.personId),
    placeholderData: []
  });

  const body = useMemo(() => {
    if (groupMembers.isLoading) return <Loading size="sm" />;

    if (!groupMembers.data || groupMembers.data.length === 0) {
      return <EmptyState icon={<GroupsIcon />} title={Locale.label("people.groups.notMemMsg")} />;
    }

    return (
      <Stack spacing={2}>
        {groupMembers.data.map((gm) => (
          <Card
            key={gm.id}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: 2
              }
            }}>
              <CardContent sx={{ pb: 2, "&:last-child": { pb: 2 } }}>
                <ListItem sx={{ px: 0, py: 0 }}>
                  <ListItemButton
                    component={Link}
                    to={`/groups/${gm.groupId}`}
                    sx={{
                      px: 0,
                      py: 1,
                      borderRadius: 1,
                      "&:hover": { backgroundColor: "action.hover" }
                    }}>
                    <ListItemIcon sx={{ minWidth: 56 }}>
                      <Avatar src={gm.group?.photoUrl} sx={{ width: 40, height: 40, bgcolor: "primary.light" }}>
                        <GroupIcon sx={{ color: "primary.main" }} />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: "primary.main",
                            fontSize: "1rem"
                          }}>
                          {gm.group?.name || Locale.label("people.groups.unknownGroup")}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {gm.group?.categoryName && (
                              <Chip
                                label={gm.group.categoryName}
                                variant="outlined"
                                size="small"
                                sx={{
                                  color: "text.secondary",
                                  borderColor: "divider",
                                  fontSize: "0.75rem"
                                }}
                              />
                            )}
                            {gm.leader && (
                              <Chip
                                icon={<LeaderIcon />}
                                label={Locale.label("people.groups.leader")}
                                variant="filled"
                                size="small"
                                color="secondary"
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      }
                      slotProps={{
                        primary: { component: "div" },
                        secondary: { component: "div" }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </CardContent>
            </Card>
        ))}
      </Stack>
    );
  }, [groupMembers.isLoading, groupMembers.data]);

  if (!props.title) return body;

  return (
    <Box>
      <SectionHeading title={props.title} />
      {body}
    </Box>
  );
});
