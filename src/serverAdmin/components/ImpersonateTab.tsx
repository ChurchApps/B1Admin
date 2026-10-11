import React from "react";
import { useCookies } from "react-cookie";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Button, Box, Stack, Typography, List, ListItem, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { EmptyState, SearchField } from "../../components/ui";
import { AdminPanel } from "./AdminPanel";

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const ImpersonateTab = () => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [users, setUsers] = React.useState<UserSearchResult[]>([]);
  const [confirmTarget, setConfirmTarget] = React.useState<UserSearchResult | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [, , removeCookie] = useCookies(["jwt"]);

  const loadData = (override?: string) => {
    const term = encodeURIComponent((override ?? searchText).trim());
    if (term) {
      ApiHelper.get("/users/search?term=" + term, "MembershipApi").then((data: UserSearchResult[]) => setUsers(data));
    }
  };

  const getUserDisplayName = (user: UserSearchResult) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  };

  const handleImpersonate = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    try {
      const result = await ApiHelper.get("/users/" + confirmTarget.id + "/impersonate", "MembershipApi");
      removeCookie("jwt", { path: "/" });
      window.location.href = "/login#" + new URLSearchParams({ jwt: result.jwt }).toString();
    } catch (err) {
      setSubmitting(false);
      console.error("Impersonation failed", err);
    }
  };

  return (
    <>
      <AdminPanel headerText={Locale.label("serverAdmin.adminPage.impersonateUser")} subtitle={Locale.label("serverAdmin.impersonateTab.description")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }} sx={{ mb: 3 }}>
          <SearchField
            label={Locale.label("serverAdmin.impersonateTab.searchLabel")}
            placeholder={Locale.label("serverAdmin.impersonateTab.searchPlaceholder")}
            value={searchText}
            onChange={setSearchText}
            onSearch={(term) => loadData(term)}
            data-testid="impersonate-search-input" />
          <Button variant="contained" disableElevation onClick={() => loadData()} data-testid="impersonate-search-button" aria-label={Locale.label("serverAdmin.impersonateTab.searchAria")} sx={{ flexShrink: 0, minHeight: 52 }}>
            {Locale.label("common.search")}
          </Button>
        </Stack>

        {users.length === 0 && searchText && <EmptyState variant="plain" title={Locale.label("serverAdmin.adminPage.noUsers")} />}

        {users.length > 0 && (
          <Box>
            <Typography variant="h3" component="h3" sx={{ mb: 1 }}>
              {Locale.label("serverAdmin.adminPage.searchResults")}
            </Typography>
            <List disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)" }}>
              {users.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton onClick={() => setConfirmTarget(user)}>
                    <ListItemText primary={getUserDisplayName(user)} secondary={user.email} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </AdminPanel>

      <Dialog open={confirmTarget !== null} onClose={() => !submitting && setConfirmTarget(null)}>
        <DialogTitle>{Locale.label("serverAdmin.impersonateTab.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {Locale.label("serverAdmin.impersonateTab.confirmMessage").replace("{email}", confirmTarget?.email || "")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)} disabled={submitting}>
            {Locale.label("common.cancel")}
          </Button>
          <Button onClick={handleImpersonate} variant="contained" color="warning" disabled={submitting}>
            {Locale.label("serverAdmin.impersonateTab.impersonate")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
