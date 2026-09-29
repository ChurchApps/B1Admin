import React from "react";
import { useCookies } from "react-cookie";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { Box, Button, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack } from "@mui/material";
import { EmptyState, SearchField, StatusBadge, tableScrollSx } from "../../components/ui";
import { AdminPanel } from "./AdminPanel";

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  registrationDate?: string;
  lastLogin?: string;
}

interface UserDetails extends UserSearchResult {
  churches: { id: string; name: string; subDomain: string; viaMembership: boolean; viaRoles: boolean }[];
}

export const UsersTab = () => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [users, setUsers] = React.useState<UserSearchResult[]>([]);
  const [details, setDetails] = React.useState<UserDetails | null>(null);
  const [confirmImpersonate, setConfirmImpersonate] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [, , removeCookie] = useCookies(["jwt"]);

  const loadData = (override?: string) => {
    const term = encodeURIComponent((override ?? searchText).trim());
    if (term) ApiHelper.get("/users/search?term=" + term, "MembershipApi").then((data: UserSearchResult[]) => setUsers(data));
  };

  const loadDetails = (userId: string) => {
    ApiHelper.get("/users/" + userId + "/details", "MembershipApi").then((data: UserDetails) => setDetails(data));
  };

  const handleImpersonate = async () => {
    if (!details) return;
    setSubmitting(true);
    try {
      const result = await ApiHelper.get("/users/" + details.id + "/impersonate", "MembershipApi");
      removeCookie("jwt", { path: "/" });
      window.location.href = "/login#" + new URLSearchParams({ jwt: result.jwt }).toString();
    } catch (err) {
      setSubmitting(false);
      console.error("Impersonation failed", err);
    }
  };

  const getName = (user: UserSearchResult) => [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
  const prettyDate = (value?: string) => (value ? DateHelper.prettyDateTime(DateHelper.toDate(value)) : "-");

  return (
    <>
      <AdminPanel headerText={Locale.label("serverAdmin.usersTab.title")} subtitle={Locale.label("serverAdmin.usersTab.description")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }} sx={{ mb: 3 }}>
          <SearchField
            label={Locale.label("serverAdmin.usersTab.searchLabel")}
            value={searchText}
            onChange={setSearchText}
            onSearch={(term) => loadData(term)}
            data-testid="admin-users-search-input" />
          <Button variant="contained" disableElevation onClick={() => loadData()} data-testid="admin-users-search-button" aria-label={Locale.label("serverAdmin.usersTab.searchAria")} sx={{ flexShrink: 0, minHeight: 56 }}>
            {Locale.label("common.search")}
          </Button>
        </Stack>
        {users.length === 0 && searchText && <EmptyState variant="plain" title={Locale.label("serverAdmin.adminPage.noUsers")} />}
        {users.length > 0 && (
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("serverAdmin.usersTab.title")} tabIndex={0}>
            <Table id="adminUsersTable">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("serverAdmin.usersTab.name")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.usersTab.email")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.usersTab.lastLogin")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.adminPage.regist")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link component="button" type="button" underline="hover" onClick={() => loadDetails(u.id)} data-testid={`admin-user-link-${u.id}`} sx={{ fontWeight: 600, textAlign: "left" }}>
                        {getName(u)}
                      </Link>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{prettyDate(u.lastLogin)}</TableCell>
                    <TableCell>{prettyDate(u.registrationDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </AdminPanel>

      <Dialog open={details !== null} onClose={() => !submitting && setDetails(null)} fullWidth maxWidth="sm">
        <DialogTitle>{details ? getName(details) === "-" ? details.email : getName(details) : ""}</DialogTitle>
        <DialogContent>
          {details && (
            <Stack spacing={1}>
              <Typography variant="body2">{details.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("serverAdmin.usersTab.lastLogin")}: {prettyDate(details.lastLogin)} &nbsp;•&nbsp; {Locale.label("serverAdmin.adminPage.regist")}: {prettyDate(details.registrationDate)}
              </Typography>
              {details.churches.length === 0 ? (
                <Typography variant="body2">{Locale.label("serverAdmin.usersTab.noChurches")}</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("serverAdmin.adminPage.church")}</TableCell>
                      <TableCell>{Locale.label("serverAdmin.usersTab.subDomain")}</TableCell>
                      <TableCell>{Locale.label("serverAdmin.usersTab.access")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.churches.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.subDomain}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {c.viaMembership && <StatusBadge>{Locale.label("serverAdmin.usersTab.member")}</StatusBadge>}
                            {c.viaRoles && <StatusBadge tone="info">{Locale.label("serverAdmin.usersTab.staff")}</StatusBadge>}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetails(null)} disabled={submitting}>{Locale.label("common.close")}</Button>
          <Button onClick={() => setConfirmImpersonate(true)} variant="contained" color="warning" disabled={submitting} data-testid="admin-user-impersonate-button">
            {Locale.label("serverAdmin.impersonateTab.impersonate")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmImpersonate} onClose={() => !submitting && setConfirmImpersonate(false)}>
        <DialogTitle>{Locale.label("serverAdmin.impersonateTab.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{Locale.label("serverAdmin.impersonateTab.confirmMessage").replace("{email}", details?.email || "")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmImpersonate(false)} disabled={submitting}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleImpersonate} variant="contained" color="warning" disabled={submitting}>
            {Locale.label("serverAdmin.impersonateTab.impersonate")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
