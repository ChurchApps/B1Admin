import React from "react";
import { Card, CardContent, Typography, Button, Box, Chip, Avatar } from "@mui/material";
import { Icon } from "@mui/material";
import { type SessionInterface } from "@churchapps/helpers";
import { DateHelper, Locale } from "@churchapps/apphelper";

interface Props {
  session: SessionInterface;
  attendanceCount: number;
  isSelected: boolean;
  onView: (session: SessionInterface) => void;
  onEdit: (session: SessionInterface) => void;
  canEdit: boolean;
}

export const SessionCard: React.FC<Props> = ({ session, attendanceCount, isSelected, onView, onEdit, canEdit }) => {
  const getAttendanceIcon = (count: number) => {
    if (count >= 10) return "🟢";
    if (count >= 5) return "🟡";
    return "🔴";
  };

  const getSessionTitle = () => {
    // Use displayName if available, otherwise format the date
    if (session.displayName) {
      return session.displayName;
    }

    if (!session.sessionDate) return "No Date";

    try {
      const date = new Date(session.sessionDate);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return DateHelper.formatDate(date);
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", session.sessionDate);
      return "Invalid Date";
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        cursor: "pointer",
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? "primary.main" : "divider",
        boxShadow: isSelected ? 3 : 1,
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)"
        },
        transition: "all 0.2s ease-in-out"
      }}
      onClick={() => onView(session)}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            {getSessionTitle()}
          </Typography>
          {isSelected && <Chip label={Locale.label("groups.sessionCard.active")} color="primary" size="small" variant="outlined" />}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: "12px" }}>{getAttendanceIcon(attendanceCount)}</Avatar>
          <Typography variant="body2" color="text.secondary">
            {attendanceCount} {attendanceCount === 1 ? Locale.label("groups.sessionCard.person") : Locale.label("groups.sessionCard.people")}
          </Typography>
        </Box>

        {session.serviceTime && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {session.serviceTime.name}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <Button
            size="small"
            variant={isSelected ? "contained" : "outlined"}
            onClick={(e) => {
              e.stopPropagation();
              onView(session);
            }}
            startIcon={<Icon>visibility</Icon>}
            fullWidth>
            {Locale.label("groups.sessionCard.view")}
          </Button>
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(session);
              }}
              startIcon={<Icon>edit</Icon>}
              fullWidth>
              {Locale.label("groups.sessionCard.edit")}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
