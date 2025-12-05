import React from "react";
import { Locale } from "@churchapps/apphelper";
import {
  Grid, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Card, CardContent 
} from "@mui/material";
import { Church as ChurchIcon, ShowChart as UsageIcon, Book as TranslationIcon, Settings as AdminIcon, PersonSearch as UserIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { UsageTrendsTab } from "./components/UsageTrendTab";
import { ChurchesTab } from "./components/ChurchesTab";
import { TranslationTab } from "./components/TranslationTab";
import { UsersTab } from "./components/UsersTab";

export const AdminPage = () => {
  const [selectedTab, setSelectedTab] = React.useState("churches");

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "churches":
        return <ChurchesTab key="churches" />;
      case "users":
        return <UsersTab key="users" />;
      case "usage":
        return <UsageTrendsTab key="usage" />;
      case "translation":
        return <TranslationTab key="translation" />;
      default:
        return <div></div>;
    }
  };

  const navigationItems = [
    {
      key: "churches",
      icon: <ChurchIcon />,
      label: Locale.label("serverAdmin.adminPage.churches"),
    },
    {
      key: "users",
      icon: <UserIcon />,
      label: Locale.label("serverAdmin.adminPage.users"),
    },
    {
      key: "usage",
      icon: <UsageIcon />,
      label: Locale.label("serverAdmin.adminPage.usageTrends"),
    },
    {
      key: "translation",
      icon: <TranslationIcon />,
      label: Locale.label("serverAdmin.adminPage.translationLookups"),
    },
  ];

  return (
    <>
      <PageHeader icon={<AdminIcon />} title={Locale.label("serverAdmin.adminPage.servAdmin")} subtitle={Locale.label("serverAdmin.adminPage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent sx={{ p: 0 }}>
                <List sx={{ py: 0 }}>
                  {navigationItems.map((item) => (
                    <ListItem key={item.key} disablePadding>
                      <ListItemButton
                        selected={selectedTab === item.key}
                        onClick={() => setSelectedTab(item.key)}
                        sx={{
                          "&.Mui-selected": {
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            "&:hover": { backgroundColor: "primary.dark" },
                            "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                          },
                        }}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <Box>{getCurrentTab()}</Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
