import React, { memo, useMemo } from "react";
import { UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, Typography, Stack, Chip, List, ListItemButton, ListItemAvatar, ListItemText, Avatar } from "@mui/material";
import { Group as GroupIcon, Groups as GroupsIcon, SupervisorAccount as LeaderIcon } from "@mui/icons-material";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardWithHeader } from "../../components/ui/CardWithHeader";
import { CountChip } from "../../components/ui/CountChip";

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

  const count = groupMembers.data?.length || 0;

  const recordsContent = useMemo(() => {
    if (groupMembers.isLoading) return <Loading size="sm" />;

    if (!groupMembers.data || groupMembers.data.length === 0) {
      return <EmptyState icon={<GroupsIcon />} title={Locale.label("people.groups.notMemMsg")} />;
    }

    return (
      <List disablePadding>
        {groupMembers.data.map((gm, index) => (
          <ListItemButton
            key={gm.id}
            component={Link}
            to={`/groups/${gm.groupId}`}
            divider={index < groupMembers.data.length - 1}
            sx={{ px: 1, py: 1, borderRadius: 1 }}>
            <ListItemAvatar sx={{ minWidth: 52 }}>
              <Avatar src={gm.group?.photoUrl} sx={{ width: 36, height: 36, bgcolor: "primary.light" }}>
                <GroupIcon sx={{ color: "primary.main" }} />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={<Typography sx={{ fontWeight: 600, color: "primary.main", fontSize: "0.95rem" }}>{gm.group?.name || Locale.label("people.groups.unknownGroup")}</Typography>}
              slotProps={{ primary: { component: "div" } }}
            />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              {gm.group?.categoryName && (
                <Chip label={gm.group.categoryName} variant="outlined" size="small" sx={{ color: "text.secondary", borderColor: "divider", fontSize: "0.75rem" }} />
              )}
              {gm.leader && (
                <Chip icon={<LeaderIcon />} label={Locale.label("people.groups.leader")} variant="filled" size="small" color="secondary" sx={{ fontSize: "0.75rem", fontWeight: 600 }} />
              )}
            </Stack>
          </ListItemButton>
        ))}
      </List>
    );
  }, [groupMembers.isLoading, groupMembers.data]);

  if (props.title) {
    return (
      <CardWithHeader
        title={props.title}
        icon={<GroupsIcon sx={{ color: "primary.main", fontSize: 20 }} />}
        actions={count > 0 ? <CountChip count={count} /> : undefined}>
        {recordsContent}
      </CardWithHeader>
    );
  }

  return (
    <Card>
      <CardContent>{recordsContent}</CardContent>
    </Card>
  );
});
