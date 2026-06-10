import React from "react";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { CheckCircle as YesIcon, Cancel as NoIcon } from "@mui/icons-material";

interface ConfigItem {
  key: string;
  label: string;
  configured: boolean;
  detail?: string;
}

interface ConfigGroup {
  group: string;
  items: ConfigItem[];
}

interface ServerHealthResponse {
  environment: string;
  groups: ConfigGroup[];
}

export const ServerHealthTab = () => {
  const [data, setData] = React.useState<ServerHealthResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const loadData = React.useCallback(() => {
    setLoading(true);
    ApiHelper.get("/serverHealth", "MembershipApi")
      .then((d: any) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(loadData, [loadData]);

  const renderStatus = (configured: boolean) => (
    <Chip
      icon={configured ? <YesIcon fontSize="small" /> : <NoIcon fontSize="small" />}
      label={configured ? Locale.label("serverAdmin.serverHealth.yes") : Locale.label("serverAdmin.serverHealth.no")}
      size="small"
      color={configured ? "success" : "default"}
      variant={configured ? "filled" : "outlined"}
    />
  );

  const renderGroup = (group: ConfigGroup) => {
    const configuredCount = group.items.filter((i) => i.configured).length;
    return (
      <Paper key={group.group} sx={{ width: "100%", overflowX: "auto", mb: 2 }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{group.group}</Typography>
          <Typography variant="caption" color="text.secondary">{configuredCount} / {group.items.length}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{Locale.label("serverAdmin.serverHealth.setting")}</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>{Locale.label("serverAdmin.serverHealth.status")}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{Locale.label("serverAdmin.serverHealth.detail")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.items.map((item) => (
              <TableRow key={item.key}>
                <TableCell>{item.label}</TableCell>
                <TableCell>{renderStatus(item.configured)}</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{item.detail || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  return (
    <DisplayBox headerIcon="health_and_safety" headerText={Locale.label("serverAdmin.serverHealth.title")}>
      {loading && <Typography>{Locale.label("common.loading")}</Typography>}
      {!loading && !data && <Typography color="error">{Locale.label("serverAdmin.serverHealth.loadError")}</Typography>}
      {!loading && data && (
        <Stack spacing={1}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("serverAdmin.serverHealth.environment")}: <strong>{data.environment || "—"}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Locale.label("serverAdmin.serverHealth.subtitle")}
            </Typography>
          </Box>
          {data.groups.map(renderGroup)}
        </Stack>
      )}
    </DisplayBox>
  );
};
