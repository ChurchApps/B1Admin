import React from "react";
import { useCookies } from "react-cookie";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { TextField, Button, Box, Typography, List, ListItem, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";

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

  const loadData = () => {
    const term = escape(searchText.trim());
    if (term) {
      ApiHelper.get("/users/search?term=" + term, "MembershipApi").then((data: UserSearchResult[]) => setUsers(data));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.currentTarget.value);

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadData();
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
      window.location.href = "/login?jwt=" + encodeURIComponent(result.jwt);
    } catch (err) {
      setSubmitting(false);
      console.error("Impersonation failed", err);
    }
  };

  return (
    <>
      <DisplayBox headerIcon="switch_account" headerText={Locale.label("serverAdmin.adminPage.impersonateUser")}>
        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          {Locale.label("serverAdmin.impersonateTab.description")}
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          name="searchText"
          type="email"
          label={Locale.label("serverAdmin.impersonateTab.searchLabel")}
          value={searchText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={Locale.label("serverAdmin.impersonateTab.searchPlaceholder")}
          data-testid="impersonate-search-input"
          aria-label={Locale.label("serverAdmin.impersonateTab.searchAria")}
          InputProps={{
            endAdornment: (
              <Button
                variant="contained"
                disableElevation
                onClick={loadData}
                data-testid="impersonate-search-button"
                aria-label={Locale.label("serverAdmin.impersonateTab.searchAria")}
              >
                {Locale.label("common.search")}
              </Button>
            )
          }}
        />
        <br />

        {users.length === 0 && searchText && (
          <Typography>{Locale.label("serverAdmin.adminPage.noUsers")}</Typography>
        )}

        {users.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {Locale.label("serverAdmin.adminPage.searchResults")}
            </Typography>
            <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
              {users.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton onClick={() => setConfirmTarget(user)}>
                    <ListItemText
                      primary={getUserDisplayName(user)}
                      secondary={user.email}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DisplayBox>

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
