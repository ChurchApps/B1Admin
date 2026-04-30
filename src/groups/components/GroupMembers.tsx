import React, { useState, memo, useMemo, useCallback, useRef } from "react";
import {
  type GroupInterface,
  type GroupMemberInterface,
  type PersonInterface
} from "@churchapps/helpers";
import {
  ApiHelper,
  DisplayBox,
  UserHelper,
  ExportLink,
  Permissions,
  ArrayHelper,
  Locale,
  PersonAvatar
} from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import {
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  EditNote as EditNoteIcon,
  Groups as GroupsIcon,
  PersonRemove as PersonRemoveIcon,
  Send as SendIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from "@mui/icons-material";
import { SendInviteDialog } from "../../components";
import { EmptyState } from "../../components/ui/EmptyState";

interface Props {
  group: GroupInterface;
  addedPerson?: PersonInterface;
  addedCallback?: () => void;
}

export const GroupMembers: React.FC<Props> = memo((props) => {
  const [show, setShow] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [count, setCount] = useState<number>(0);
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false);

  const canView = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view), []);

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: [`/groupmembers?groupId=${props.group?.id}`, "MembershipApi"],
    placeholderData: [],
    enabled: !!props.group?.id && canView
  });

  const handleRemove = useCallback(
    (member: GroupMemberInterface) => {
      ApiHelper.delete("/groupmembers/" + member.id, "MembershipApi").then(() => {
        groupMembers.refetch();
      });
    },
    [groupMembers]
  );

  const handleToggleLeader = useCallback(
    (member: GroupMemberInterface) => {
      // Don't mutate the cached object — React Query's structural sharing
      // would then see the refetched data as unchanged and skip the re-render.
      const updated = { ...member, leader: !member.leader };
      ApiHelper.post("/groupmembers", [updated], "MembershipApi").then(() => {
        groupMembers.refetch();
      });
    },
    [groupMembers]
  );

  const getMemberByPersonId = useCallback(
    (personId: string) => {
      let result = null;
      for (let i = 0; i < groupMembers.data.length; i++) if (groupMembers.data[i].personId === personId) result = groupMembers.data[i];
      return result;
    },
    [groupMembers.data]
  );

  const addedPersonIdRef = useRef<string>(null);

  const handleAdd = useCallback(async () => {
    if (addedPersonIdRef.current === props.addedPerson.id) return;
    if (getMemberByPersonId(props.addedPerson.id) === null) {
      addedPersonIdRef.current = props.addedPerson.id;
      const gm = { groupId: props.group.id, personId: props.addedPerson.id, person: props.addedPerson } as GroupMemberInterface;
      await ApiHelper.post("/groupmembers", [gm], "MembershipApi");
      groupMembers.refetch();
      if (props.addedPerson.contactInfo?.email) {
        setShowInviteDialog(true);
      } else {
        props.addedCallback();
      }
    }
  }, [props, getMemberByPersonId, groupMembers]);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);

  const bodyCellSx = {
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1.5,
    "&&:first-of-type": { pl: 2.5 },
    "&&:last-of-type": { pr: 1.5 }
  } as const;

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];

    for (let i = 0; i < groupMembers.data.length; i++) {
      const gm = groupMembers.data[i];
      const personName = gm.person?.name?.display || Locale.label("groups.groupMembers.unknown");
      const isLast = i === groupMembers.data.length - 1;
      const cellSx = isLast ? { ...bodyCellSx, borderBottom: 0 } : bodyCellSx;

      const roleCell = gm.leader ? (
        <Chip
          size="small"
          variant="filled"
          color="warning"
          icon={<StarIcon sx={{ fontSize: 14 }} />}
          label={Locale.label("groups.groupMembers.leader")}
          sx={{
            fontWeight: 600,
            letterSpacing: "0.02em",
            height: 22,
            "& .MuiChip-icon": { ml: 0.75, mr: -0.25 },
            "& .MuiChip-label": { px: 1 }
          }}
        />
      ) : null;

      let leaderToggle: JSX.Element | null = null;
      if (canEdit) {
        leaderToggle = gm.leader ? (
          <Tooltip title={Locale.label("groups.groupMembers.removeLeaderAccess")}>
            <IconButton
              size="small"
              onClick={() => handleToggleLeader(gm)}
              data-testid={`remove-leader-button-${gm.id}`}
              aria-label={Locale.label("groups.groupMembers.removeLeaderAccessAria").replace("{name}", personName)}
              sx={{
                color: "warning.main",
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: "warning.50" }
              }}>
              <StarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={Locale.label("groups.groupMembers.makeLeader")}>
            <IconButton
              size="small"
              onClick={() => handleToggleLeader(gm)}
              data-testid={`promote-leader-button-${gm.id}`}
              aria-label={Locale.label("groups.groupMembers.promoteToLeaderAria").replace("{name}", personName)}
              sx={{
                color: "text.disabled",
                transition: "color 0.15s, background-color 0.15s",
                "&:hover": { color: "warning.main", bgcolor: "warning.50" }
              }}>
              <StarBorderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      }

      const removeButton = canEdit ? (
        <Tooltip title={Locale.label("common.remove")}>
          <IconButton
            size="small"
            onClick={() => handleRemove(gm)}
            data-testid={`remove-member-button-${gm.id}`}
            aria-label={Locale.label("groups.groupMembers.removeFromGroupAria").replace("{name}", personName)}
            sx={{
              color: "text.disabled",
              transition: "color 0.15s, background-color 0.15s",
              "&:hover": { color: "error.main", bgcolor: "error.50" }
            }}>
            <PersonRemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null;

      rows.push(
        <TableRow
          key={gm.id}
          sx={{
            transition: "background-color 0.15s ease",
            "&:hover": { backgroundColor: "action.hover" }
          }}>
          <TableCell sx={{ ...cellSx, width: 56 }}>
            <PersonAvatar person={gm.person} size="small" />
          </TableCell>
          <TableCell sx={cellSx}>
            <Link
              to={"/people/" + gm.personId}
              style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 500,
                  color: "text.primary",
                  transition: "color 0.15s",
                  "&:hover": { color: "primary.main" }
                }}>
                {personName}
              </Typography>
            </Link>
          </TableCell>
          <TableCell sx={{ ...cellSx, width: 120 }}>{roleCell}</TableCell>
          <TableCell sx={{ ...cellSx, width: 110, textAlign: "right", whiteSpace: "nowrap" }}>
            {canEdit && (
              <Stack
                direction="row"
                spacing={0.25}
                justifyContent="flex-end"
                alignItems="center"
                divider={
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ height: 16, alignSelf: "center", borderColor: "divider", opacity: 0.6 }}
                  />
                }>
                {leaderToggle}
                {removeButton}
              </Stack>
            )}
          </TableCell>
        </TableRow>
      );
    }
    return rows;
  }, [groupMembers.data, canEdit, handleToggleLeader, handleRemove]);

  const headerCellSx = {
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1,
    bgcolor: "grey.50",
    "&&:first-of-type": { pl: 2.5 },
    "&&:last-of-type": { pr: 1.5 }
  } as const;

  const tableHeader = useMemo(() => {
    if (groupMembers.data.length === 0) return null;
    return (
      <TableRow>
        <TableCell sx={{ ...headerCellSx, width: 56 }} />
        <TableCell sx={headerCellSx}>{Locale.label("common.name")}</TableCell>
        <TableCell sx={{ ...headerCellSx, width: 120 }}>{Locale.label("groups.groupMembers.role")}</TableCell>
        <TableCell sx={{ ...headerCellSx, width: 110, textAlign: "right" }} />
      </TableRow>
    );
  }, [groupMembers.data.length]);

  const handleTemplateMessage = (templateType: string) => {
    let newMessage = "";
    if (templateType !== "") {
      switch (templateType) {
        case "welcome_volunteers": newMessage = Locale.label("groups.groupMembers.templates.welcome_volunteers.message"); break;
        default: newMessage = ""; break;
      }
    }
    setMessage(newMessage);
  };

  const getEditContent = () => (
    <>
      {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit) && (
        <Tooltip title={Locale.label("groups.groupMembers.sendMemMsg")}>
          <IconButton size="small" onClick={() => { setCount(0); setShow(!show); }} data-testid="send-message-button" aria-label={Locale.label("groups.groupMembers.sendMessageAria")}><EditNoteIcon fontSize="small" /></IconButton>
        </Tooltip>
      )}
      <ExportLink data={groupMembers.data} spaceAfter={true} filename="groupmembers.csv" />
    </>
  );

  const handleSend = async () => {
    const peopleIds = ArrayHelper.getIds(groupMembers.data, "personId");
    const ids = peopleIds.filter((id) => id !== UserHelper.person.id); //remove the one that is sending the message.
    const data: any = {
      peopleIds: ids,
      contentType: "groupMessage",
      contentId: props.group.id,
      message: `Message from ${UserHelper.person.name.first}: ${message}`
    };
    await ApiHelper.post("/notifications/create", data, "MessagingApi");
  };

  // Query automatically refetches when props.group.id changes

  React.useEffect(() => {
    if (props.addedPerson?.id !== undefined) {
      handleAdd();
    }
  }, [props.addedPerson, handleAdd]);

  const renderSkeleton = () => (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
      <Stack divider={<Divider />}>
        {[0, 1, 2].map((i) => (
          <Stack
            key={i}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ px: 2, py: 1.75 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={120 + i * 30} height={18} />
            <Box sx={{ flex: 1 }} />
            {i % 2 === 0 && <Skeleton variant="rounded" width={72} height={22} />}
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="circular" width={28} height={28} />
          </Stack>
        ))}
      </Stack>
    </Box>
  );

  const renderTable = () => (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden"
      }}>
      <Table id="groupMemberTable" sx={{ "& td, & th": { borderBottomColor: "divider" } }}>
        <TableHead>{tableHeader}</TableHead>
        <TableBody>{tableRows}</TableBody>
      </Table>
    </Box>
  );

  const getTable = () => {
    if (groupMembers.isLoading) return renderSkeleton();
    if (groupMembers.data.length === 0) {
      return (
        <EmptyState
          variant="card"
          icon={<GroupsIcon />}
          title={Locale.label("groups.groupMembers.noMemTitle")}
          description={Locale.label("groups.groupMembers.noMemDesc")}
        />
      );
    }
    return renderTable();
  };

  const memberCount = groupMembers.data.length;
  const leaderCount = groupMembers.data.filter((m) => m.leader).length;
  const showCounts = !groupMembers.isLoading && memberCount > 0;

  const closeComposer = () => {
    setShow(false);
    setMessage("");
    setCount(0);
    setShowTemplates(false);
    setSelectedTemplate("");
  };

  const onSend = () => {
    handleSend();
    closeComposer();
  };

  const composer = show && (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        mt: 0.5,
        mb: 2.5,
        borderRadius: 1.5,
        borderColor: "divider",
        bgcolor: "grey.50"
      }}>
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: "text.primary", letterSpacing: "0.01em" }}>
            {Locale.label("groups.groupMembers.sendMemMsg")}
          </Typography>
          <IconButton
            size="small"
            onClick={closeComposer}
            aria-label={Locale.label("common.close")}
            sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {showTemplates ? (
          <FormControl size="small" sx={{ alignSelf: "flex-start", minWidth: 240 }}>
            <InputLabel id="message_templates">{Locale.label("groups.groupMembers.templates.templates")}</InputLabel>
            <Select
              name="templates"
              labelId="message_templates"
              label={Locale.label("groups.groupMembers.templates.templates")}
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                handleTemplateMessage(e.target.value);
              }}>
              <MenuItem value="">{Locale.label("groups.groupMembers.templates.none")}</MenuItem>
              <MenuItem value="welcome_volunteers">{Locale.label("groups.groupMembers.templates.welcome_volunteers.heading")}</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <Button
            size="small"
            variant="text"
            startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            onClick={() => setShowTemplates(true)}
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              fontWeight: 500,
              color: "text.secondary",
              px: 1,
              py: 0.25,
              "&:hover": { bgcolor: "action.hover", color: "primary.main" }
            }}>
            {Locale.label("groups.groupMembers.showTemplates")}
          </Button>
        )}

        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          placeholder={Locale.label("groups.groupMembers.messagePlaceholder")}
          value={message}
          onChange={(e) => {
            setCount(e.target.value.length);
            setMessage(e.target.value);
          }}
          helperText={
            selectedTemplate ? " " : (
              <Box
                component="span"
                sx={{
                  display: "block",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: count >= 140 ? "warning.main" : count >= 120 ? "warning.dark" : "text.disabled",
                  fontWeight: count >= 120 ? 600 : 400
                }}>
                {count} / 140
              </Box>
            )
          }
          slotProps={{
            htmlInput: { maxLength: selectedTemplate ? undefined : 140 },
            formHelperText: { component: "div", sx: { m: 0, mt: 0.5 } }
          }}
          sx={{
            "& .MuiOutlinedInput-root": { bgcolor: "background.paper" }
          }}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="text"
            onClick={closeComposer}
            sx={{ textTransform: "none", color: "text.secondary" }}>
            {Locale.label("common.cancel")}
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            endIcon={<SendIcon fontSize="small" />}
            disabled={!message.trim()}
            onClick={onSend}
            sx={{ textTransform: "none", fontWeight: 600, px: 2 }}>
            {Locale.label("groups.groupMembers.send")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );

  return (
    <DisplayBox id="groupMembersBox" data-cy="group-members-tab" headerText={Locale.label("groups.groupMembers.groupMem")} headerIcon="group" editContent={getEditContent()} help="docs/b1-admin/groups/">
      {showCounts && (
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ mt: -0.5, mb: 2, color: "text.secondary" }}>
          <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{memberCount}</Box>{" "}
            {Locale.label(memberCount === 1 ? "groups.groupMembers.member" : "groups.groupMembers.members")}
          </Typography>
          {leaderCount > 0 && (
            <>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "text.disabled" }} />
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarIcon sx={{ fontSize: 14, color: "warning.main" }} />
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{leaderCount}</Box>{" "}
                  {Locale.label(leaderCount === 1 ? "groups.groupMembers.leaderLower" : "groups.groupMembers.leadersLower")}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      )}
      {composer}
      {getTable()}
      {showInviteDialog && props.addedPerson && (
        <SendInviteDialog
          open={showInviteDialog}
          personName={props.addedPerson.name?.display || `${props.addedPerson.name?.first || ""} ${props.addedPerson.name?.last || ""}`.trim()}
          personEmail={props.addedPerson.contactInfo.email}
          contextName={props.group.name}
          onClose={() => { setShowInviteDialog(false); props.addedCallback(); }}
        />
      )}
    </DisplayBox>
  );
});
