import React, { memo, useMemo } from "react";
import { UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { type GroupMemberInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Typography, Stack, List, ListItemButton, ListItemText } from "@mui/material";
import { Groups as GroupsIcon } from "@mui/icons-material";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardWithHeader } from "../../components/ui/CardWithHeader";
import { CountChip } from "../../components/ui/CountChip";

interface Props {
  personId: string;
  title?: string;
  updatedFunction?: () => void;
}

export const Groups: React.FC<Props> = memo((props) => {
  const groupMembers = useQuery<GroupMemberInterface[]>({
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
            sx={{ px: 1, py: 1, borderRadius: "var(--b1-radius-control)" }}>
            <ListItemText
              primary={<Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>{gm.group?.name || Locale.label("people.groups.unknownGroup")}</Typography>}
              slotProps={{ primary: { component: "div" } }}
            />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              {gm.group?.categoryName && (
                <StatusBadge tone="neutral">{gm.group.categoryName}</StatusBadge>
              )}
              {gm.leader && (
                <StatusBadge tone="info">{Locale.label("people.groups.leader")}</StatusBadge>
              )}
            </Stack>
          </ListItemButton>
        ))}
      </List>
    );
  }, [groupMembers.isLoading, groupMembers.data]);

  return (
    <CardWithHeader
      title={props.title || Locale.label("people.personNavigation.groups")}
      icon={<GroupsIcon />}
      actions={count > 0 ? <CountChip count={count} /> : undefined}>
      {recordsContent}
    </CardWithHeader>
  );
});
