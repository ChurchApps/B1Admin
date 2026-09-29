import React from "react";
import { ApiHelper, UserHelper, DateHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { Box, Button, ButtonBase, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import UserContext from "../../UserContext";
import { type ChurchInterface } from "@churchapps/helpers";
import { useConfirmDelete } from "../../hooks";
import { EmptyState, SearchField, StatusBadge, tableScrollSx } from "../../components/ui";
import { AdminPanel } from "./AdminPanel";

const toggleSx = { borderRadius: "var(--b1-radius-pill)", "&:hover": { opacity: 0.8 }, "&.Mui-focusVisible": { outline: "2px solid var(--b1-focus)", outlineOffset: 2 } } as const;

type ChurchRow = ChurchInterface & { emailApprovedDate?: Date };

export const ChurchesTab = () => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [churches, setChurches] = React.useState<ChurchRow[]>([]);
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const context = React.useContext(UserContext);

  const loadData = (override?: string) => {
    const term = encodeURIComponent((override ?? searchText).trim());
    ApiHelper.get("/churches/all?term=" + term, "MembershipApi").then((data: any) => setChurches(data));
  };

  const handleArchive = async (church: ChurchInterface) => {
    const isArchiving = !church.archivedDate;
    const msg = (isArchiving ? Locale.label("serverAdmin.churchesTab.archiveConfirm") : Locale.label("serverAdmin.churchesTab.restoreConfirm")).replace("{name}", church.name || "");
    if (!(await confirm(msg, { destructive: isArchiving, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;

    try {
      await ApiHelper.post("/churches/" + church.id + "/archive", { archived: isArchiving }, "MembershipApi");
      setChurches((prev) => prev.map((c) => (c.id === church.id ? { ...c, archivedDate: isArchiving ? new Date() : undefined } : c)));
    } catch { /* surfaced by ErrorHelper */ }
  };

  const handleEmailApproval = async (church: ChurchRow) => {
    const approving = !church.emailApprovedDate;
    const msg = (approving ? Locale.label("serverAdmin.churchesTab.emailApproveConfirm") : Locale.label("serverAdmin.churchesTab.emailRevokeConfirm")).replace("{name}", church.name || "");
    if (!(await confirm(msg, { destructive: !approving, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;

    try {
      const updated: ChurchRow = await ApiHelper.post("/churches/" + church.id + "/emailApproval", { approved: approving }, "MembershipApi");
      setChurches((prev) => prev.map((c) => (c.id === church.id ? { ...c, emailApprovedDate: updated?.emailApprovedDate } : c)));
    } catch { /* surfaced by ErrorHelper */ }
  };

  const getLocation = (church: ChurchInterface) => {
    const parts = [church.city, church.state, church.country].filter(part => part && part.trim());
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  const getChurchRows = () => {
    if (churches === null) return null;
    return churches.map((c) => (
      <TableRow key={c.id}>
        <TableCell>
          <Link component="button" type="button" underline="hover" onClick={() => handleEditAccess(c.id || "")} data-testid={`church-link-${c.id}`} sx={{ fontWeight: 600, textAlign: "left" }}>
            {c.name}
          </Link>
        </TableCell>
        <TableCell>{getLocation(c)}</TableCell>
        <TableCell>{DateHelper.prettyDate(DateHelper.toDate(c.registrationDate))}</TableCell>
        <TableCell>
          <ButtonBase onClick={() => handleEmailApproval(c)} data-testid={`toggle-church-email-${c.id}`} sx={toggleSx}>
            <StatusBadge tone={c.emailApprovedDate ? "success" : "neutral"}>
              {c.emailApprovedDate ? Locale.label("serverAdmin.churchesTab.emailApproved") : Locale.label("serverAdmin.churchesTab.emailNotApproved")}
            </StatusBadge>
          </ButtonBase>
        </TableCell>
        <TableCell>
          <ButtonBase onClick={() => handleArchive(c)} data-testid={`toggle-church-status-${c.id}`} sx={toggleSx}>
            <StatusBadge variant="dot" tone={c.archivedDate ? "danger" : "success"}>
              {c.archivedDate ? Locale.label("serverAdmin.adminPage.arch") : Locale.label("serverAdmin.adminPage.act")}
            </StatusBadge>
          </ButtonBase>
        </TableCell>
      </TableRow>
    ));
  };

  const handleEditAccess = async (churchId: string) => {
    let result: any;
    try {
      result = await ApiHelper.get("/churches/" + churchId + "/impersonate", "MembershipApi");
    } catch { return; }
    if (!result?.userChurches?.length) return;

    const idx = ArrayHelper.getIndex(UserHelper.userChurches, "church.id", churchId);
    if (idx > -1) UserHelper.userChurches.splice(idx, 1);

    UserHelper.userChurches.push(...result.userChurches);
    UserHelper.selectChurch(context, result.userChurches[0].church.id, undefined);
    setRedirectUrl(`/settings`);
  };

  React.useEffect(() => loadData(), []);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;
  else {
    return (
      <>
        {ConfirmDialogElement}
        <AdminPanel
          headerText={Locale.label("serverAdmin.adminPage.churches")}
          subtitle={Locale.label("serverAdmin.adminPage.churchesSubtitle")}
          aside={churches.length > 0 ? Locale.label("serverAdmin.adminPage.churchCount", "{count} churches").replace("{count}", String(churches.length)) : undefined}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }} sx={{ mb: 3 }}>
            <SearchField
              label={Locale.label("serverAdmin.adminPage.churchName")}
              placeholder={Locale.label("serverAdmin.churchesTab.churchNameSearchAria")}
              value={searchText}
              onChange={setSearchText}
              onSearch={(term) => loadData(term)}
              data-testid="church-search-input" />
            <Button variant="contained" id="searchButton" data-cy="search-button" disableElevation onClick={() => loadData()} data-testid="search-churches-button" aria-label={Locale.label("serverAdmin.churchesTab.searchChurchesAria")} sx={{ flexShrink: 0, minHeight: 56 }}>
              {Locale.label("common.search")}
            </Button>
          </Stack>
          {churches.length === 0 ? (
            <EmptyState variant="plain" title={Locale.label("serverAdmin.adminPage.noChurch")} />
          ) : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("serverAdmin.adminPage.churches")} tabIndex={0}>
              <Table id="adminChurchesTable">
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("serverAdmin.adminPage.church")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.adminPage.location")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.adminPage.regist")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.churchesTab.groupEmail")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.adminPage.status", "Status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{getChurchRows()}</TableBody>
              </Table>
            </Box>
          )}
        </AdminPanel>
      </>
    );
  }
};
