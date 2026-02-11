import React from "react";
import { ApiHelper, DisplayBox, UserHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { TextField, Button, Box, Typography, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import UserContext from "../../UserContext";
import { type UserChurchInterface } from "@churchapps/helpers";

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const UsersTab = () => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [users, setUsers] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<UserSearchResult | null>(null);
  const [userChurches, setUserChurches] = React.useState<UserChurchInterface[]>([]);
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");

  const context = React.useContext(UserContext);

  const loadData = () => {
    const term = escape(searchText.trim());
    if (term) {
      ApiHelper.get("/users/search?term=" + term, "MembershipApi").then((data) => {
        setUsers(data);
        setSelectedUser(null);
        setUserChurches([]);
      });
    }
  };

  const handleUserClick = (user: UserSearchResult) => {
    setSelectedUser(user);
    ApiHelper.get("/userchurch/user/" + user.id, "MembershipApi").then((data: UserChurchInterface[]) => {
      setUserChurches(data);
    });
  };

  const handleChurchClick = async (userChurch: UserChurchInterface) => {
    const churchId = userChurch.church.id;

    const result = await ApiHelper.get("/churches/" + churchId + "/impersonate", "MembershipApi");

    const idx = ArrayHelper.getIndex(UserHelper.userChurches, "church.id", churchId);
    if (idx > -1) UserHelper.userChurches.splice(idx, 1);

    UserHelper.userChurches.push(...result.userChurches);
    UserHelper.selectChurch(context, result.userChurches[0].church.id, null);
    setRedirectUrl(`/settings`);
  };

  const getUserDisplayName = (user: UserSearchResult) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.currentTarget.value);

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadData();
    }
  };

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

  return (
    <>
      <DisplayBox headerIcon="person_search" headerText={Locale.label("serverAdmin.adminPage.users")}>
        <TextField
          fullWidth
          variant="outlined"
          name="searchText"
          label={Locale.label("serverAdmin.adminPage.userSearch")}
          value={searchText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={Locale.label("serverAdmin.adminPage.userSearchPlaceholder")}
          data-testid="user-search-input"
          aria-label="User name or email search"
          InputProps={{
            endAdornment: (
              <Button
                variant="contained"
                disableElevation
                onClick={loadData}
                data-testid="search-users-button"
                aria-label="Search users"
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

        {users.length > 0 && !selectedUser && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {Locale.label("serverAdmin.adminPage.searchResults")}
            </Typography>
            <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
              {users.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton
                    selected={selectedUser?.id === user.id}
                    onClick={() => handleUserClick(user)}
                  >
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

        {selectedUser && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setSelectedUser(null)}
              sx={{ mb: 2 }}
            >
              ← {Locale.label("common.back")}
            </Button>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {Locale.label("serverAdmin.adminPage.userChurches")} - {getUserDisplayName(selectedUser)}
            </Typography>
            {userChurches.length === 0 ? (
              <Typography>{Locale.label("serverAdmin.adminPage.noUserChurches")}</Typography>
            ) : (
              <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
                {userChurches.map((uc) => (
                  <ListItem key={uc.id} disablePadding>
                    <ListItemButton onClick={() => handleChurchClick(uc)}>
                      <ListItemText
                        primary={uc.church.name}
                        secondary={uc.person?.name?.display || "No person linked"}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DisplayBox>
    </>
  );
};
