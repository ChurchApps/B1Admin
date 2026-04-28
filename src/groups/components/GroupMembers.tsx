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
  Loading,
  ArrayHelper,
  Locale,
  PersonAvatar
} from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, IconButton, Tooltip } from "@mui/material";
import { Send as SendIcon, KeyOff as KeyOffIcon, Key as KeyIcon, PersonRemove as PersonRemoveIcon, EditNote as EditNoteIcon } from "@mui/icons-material";
import { SendInviteDialog } from "../../components";

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

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];

    if (groupMembers.data.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("groups.groupMembers.noMem")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < groupMembers.data.length; i++) {
      const gm = groupMembers.data[i];
      const personName = gm.person?.name?.display || Locale.label("groups.groupMembers.unknown");
      const editLinks = [];
      if (canEdit) {
        if (gm.leader) {
          editLinks.push(
            <Tooltip key={`leader-${gm.id}`} title={Locale.label("groups.groupMembers.removeLeaderAccess")}>
              <IconButton size="small" color="error" onClick={() => handleToggleLeader(gm)} data-testid={`remove-leader-button-${gm.id}`} aria-label={Locale.label("groups.groupMembers.removeLeaderAccessAria").replace("{name}", personName)}><KeyOffIcon fontSize="small" /></IconButton>
            </Tooltip>
          );
        } else {
          editLinks.push(
            <Tooltip key={`leader-${gm.id}`} title={Locale.label("groups.groupMembers.promoteToLeader")}>
              <IconButton size="small" color="success" onClick={() => handleToggleLeader(gm)} data-testid={`promote-leader-button-${gm.id}`} aria-label={Locale.label("groups.groupMembers.promoteToLeaderAria").replace("{name}", personName)}><KeyIcon fontSize="small" /></IconButton>
            </Tooltip>
          );
        }
        editLinks.push(
          <Tooltip key={`remove-${gm.id}`} title={Locale.label("common.remove")}>
            <IconButton size="small" color="error" onClick={() => handleRemove(gm)} data-testid={`remove-member-button-${gm.id}`} aria-label={Locale.label("groups.groupMembers.removeFromGroupAria").replace("{name}", personName)}><PersonRemoveIcon fontSize="small" /></IconButton>
          </Tooltip>
        );
      }

      rows.push(
        <TableRow key={gm.id}>
          <TableCell>
            <PersonAvatar person={gm.person} size="small" />
          </TableCell>
          <TableCell>
            <Link to={"/people/" + gm.personId}>{personName}</Link>
          </TableCell>
          <TableCell style={{ textAlign: "right" }}>{editLinks}</TableCell>
        </TableRow>
      );
    }
    return rows;
  }, [groupMembers.data, canEdit, handleToggleLeader, handleRemove]);

  const tableHeader = useMemo(() => {
    const rows: JSX.Element[] = [];
    if (groupMembers.data.length === 0) {
      return rows;
    }

    rows.push(
      <TableRow key="header" sx={{ textAlign: "left" }}>
        <th></th>
        <th>{Locale.label("common.name")}</th>
        <th></th>
      </TableRow>
    );
    return rows;
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

  const getTable = () => {
    if (groupMembers.isLoading) return <Loading />;
    else {
      return (
        <Table id="groupMemberTable">
          <TableHead>{tableHeader}</TableHead>
          <TableBody>{tableRows}</TableBody>
        </Table>
      );
    }
  };

  return (
    <DisplayBox id="groupMembersBox" data-cy="group-members-tab" headerText={Locale.label("groups.groupMembers.groupMem")} headerIcon="group" editContent={getEditContent()} help="docs/b1-admin/groups/">
      {show === true && (
        <div style={{ marginTop: "18px", marginBottom: "18px" }}>
          {showTemplates === true ? (
            <FormControl fullWidth>
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
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              style={{ paddingLeft: "5px", background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
              {Locale.label("groups.groupMembers.showTemplates")}
            </button>
          )}
          <TextField
            fullWidth
            multiline
            helperText={selectedTemplate ? "" : count + "/140"}
            inputProps={{ maxLength: selectedTemplate ? null : 140 }}
            value={message}
            onChange={(e) => {
              setCount(e.target.value.length);
              setMessage(e.target.value);
            }}
            sx={{ margin: 0, marginTop: 1 }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "end",
              alignItems: "center",
              marginTop: "15px"
            }}>
            <Button
              size="small"
              variant="contained"
              endIcon={<SendIcon fontSize="small" />}
              onClick={() => {
                handleSend();
                setShow(false);
                setMessage("");
                setShowTemplates(false);
                setSelectedTemplate("");
              }}>
              {Locale.label("groups.groupMembers.send")}
            </Button>
          </div>
        </div>
      )}
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
