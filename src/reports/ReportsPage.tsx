import React from "react";
import { Locale, PageHeader } from "@churchapps/apphelper";
import { Box, Card, CardContent, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Container, Paper } from "@mui/material";
import { Summarize as SummarizeIcon, CakeOutlined as BirthdayIcon, TrendingUp as TrendIcon, Groups as GroupsIcon, Today as DailyIcon, VolunteerActivism as DonationIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";

export const ReportsPage = () => {
  const reportItems = [
    {
      path: "/reports/birthdays",
      label: Locale.label("reports.reportsPage.bDays"),
      icon: <BirthdayIcon />,
      description: Locale.label("reports.reportsPage.bDaysDesc")
    },
    {
      path: "/reports/attendanceTrend",
      label: Locale.label("reports.reportsPage.attTrend"),
      icon: <TrendIcon />,
      description: Locale.label("reports.reportsPage.attTrendDesc")
    },
    {
      path: "/reports/groupAttendance",
      label: Locale.label("reports.reportsPage.groupAtt"),
      icon: <GroupsIcon />,
      description: Locale.label("reports.reportsPage.groupAttDesc")
    },
    {
      path: "/reports/dailyGroupAttendance",
      label: Locale.label("reports.reportsPage.dailyGroupAtt"),
      icon: <DailyIcon />,
      description: Locale.label("reports.reportsPage.dailyGroupAttDesc")
    },
    {
      path: "/reports/donationSummary",
      label: Locale.label("reports.reportsPage.donSum"),
      icon: <DonationIcon />,
      description: Locale.label("reports.reportsPage.donSumDesc")
    }
  ];

  return (
    <>
      <PageHeader
        icon={<SummarizeIcon />}
        title={Locale.label("reports.reportsPage.reports")}
        subtitle={Locale.label("reports.reportsPage.subtitle")}
      />

      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Reports Grid */}
          <Card
            elevation={2}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider"
            }}>
            <CardContent sx={{ p: 0 }}>
              <List sx={{ p: 0 }}>
                {reportItems.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <ListItem disablePadding>
                      <ListItemButton
                        component={Link}
                        to={item.path}
                        sx={{
                          py: 2.5,
                          px: 3,
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            backgroundColor: "action.hover",
                            transform: "translateX(4px)",
                            "& .MuiListItemIcon-root": {
                              color: "primary.main",
                              transform: "scale(1.1)"
                            }
                          }
                        }}>
                        <ListItemIcon
                          sx={{
                            minWidth: 48,
                            color: "text.secondary",
                            transition: "all 0.2s ease-in-out"
                          }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 500,
                                color: "text.primary"
                              }}>
                              {item.label}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {item.description}
                            </Typography>
                          }
                          slotProps={{
                            primary: { component: "div" },
                            secondary: { component: "div" }
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < reportItems.length - 1 && (
                      <Box
                        sx={{
                          height: 1,
                          backgroundColor: "divider",
                          mx: 3
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Help Text */}
          <Paper
            sx={{
              mt: 3,
              p: 3,
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2
            }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              {Locale.label("reports.reportsPage.helpText")}
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
};
