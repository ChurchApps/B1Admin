import React from "react";
import { ApiHelper, DisplayBox, UserHelper, DateHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { TextField, Button, Chip, Link, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import UserContext from "../../UserContext";
import { type ChurchInterface } from "@churchapps/helpers";
import { useConfirmDelete } from "../../hooks";

export const ChurchesTab = () => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [churches, setChurches] = React.useState<ChurchInterface[]>([]);
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const context = React.useContext(UserContext);

  const loadData = () => {
    const term = escape(searchText.trim());
    ApiHelper.get("/churches/all?term=" + term, "MembershipApi").then((data: any) => setChurches(data));
  };

  const handleArchive = async (church: ChurchInterface) => {
    const isArchiving = !church.archivedDate;
    const msg = (isArchiving ? Locale.label("serverAdmin.churchesTab.archiveConfirm") : Locale.label("serverAdmin.churchesTab.restoreConfirm")).replace("{name}", church.name || "");
    if (!(await confirm(msg, { destructive: isArchiving, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;

    const tmpChurches = [...churches];
    const c = ArrayHelper.getOne(tmpChurches, "id", church.id);
    c.archivedDate = isArchiving ? new Date() : null;

    ApiHelper.post("/churches/" + church.id + "/archive", { archived: c.archivedDate !== null }, "MembershipApi");

    setChurches(tmpChurches);
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
          <Link component="button" type="button" underline="hover" onClick={() => handleEditAccess(c.id || "")} data-testid={`church-link-${c.id}`}>
            {c.name}
          </Link>
        </TableCell>
        <TableCell>{getLocation(c)}</TableCell>
        <TableCell>{DateHelper.prettyDate(DateHelper.toDate(c.registrationDate))}</TableCell>
        <TableCell align="right">
          <Chip
            label={c.archivedDate ? Locale.label("serverAdmin.adminPage.arch") : Locale.label("serverAdmin.adminPage.act")}
            color={c.archivedDate ? "error" : "success"}
            size="small"
            onClick={() => handleArchive(c)}
            data-testid={`toggle-church-status-${c.id}`}
            sx={{ cursor: "pointer" }}
          />
        </TableCell>
      </TableRow>
    ));
  };

  const handleEditAccess = async (churchId: string) => {
    const result = await ApiHelper.get("/churches/" + churchId + "/impersonate", "MembershipApi");

    const idx = ArrayHelper.getIndex(UserHelper.userChurches, "church.id", churchId);
    if (idx > -1) UserHelper.userChurches.splice(idx, 1);

    UserHelper.userChurches.push(...result.userChurches);
    UserHelper.selectChurch(context, result.userChurches[0].church.id, undefined);
    setRedirectUrl(`/settings`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.currentTarget.value);

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadData();
    }
  };

  React.useEffect(loadData, []);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;
  else {
    return (
      <>
        {ConfirmDialogElement}
        <DisplayBox headerIcon="church" headerText={Locale.label("serverAdmin.adminPage.churches")}>
          <TextField
            fullWidth
            variant="outlined"
            name="searchText"
            label={Locale.label("serverAdmin.adminPage.churchName")}
            value={searchText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            data-testid="church-search-input"
            aria-label={Locale.label("serverAdmin.churchesTab.churchNameSearchAria")}
            InputProps={{
              endAdornment: (
                <Button variant="contained" id="searchButton" data-cy="search-button" disableElevation onClick={loadData} data-testid="search-churches-button" aria-label={Locale.label("serverAdmin.churchesTab.searchChurchesAria")}>
                  {Locale.label("common.search")}
                </Button>
              )
            }}
          />
          <br />
          {churches.length === 0 ? (
            <>{Locale.label("serverAdmin.adminPage.noChurch")}</>
          ) : (
            <Table size="small" id="adminChurchesTable">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("serverAdmin.adminPage.church")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.adminPage.location")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.adminPage.regist")}</TableCell>
                  <TableCell align="right">{Locale.label("serverAdmin.adminPage.act")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{getChurchRows()}</TableBody>
            </Table>
          )}
        </DisplayBox>
      </>
    );
  }
};
