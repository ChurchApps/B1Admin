import { useQuery } from "@tanstack/react-query";
import { Locale } from "@churchapps/apphelper";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { StatusBadge, tableScrollSx } from "../../components/ui";
import { AdminPanel } from "./AdminPanel";

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
  const { data, isLoading: loading } = useQuery<ServerHealthResponse>({ queryKey: ["/serverHealth", "MembershipApi"] });

  const renderStatus = (configured: boolean) => (
    <StatusBadge variant="dot" tone={configured ? "success" : "neutral"}>
      {configured ? Locale.label("serverAdmin.serverHealth.yes") : Locale.label("serverAdmin.serverHealth.no")}
    </StatusBadge>
  );

  const renderGroup = (group: ConfigGroup) => {
    const configuredCount = group.items.filter((i) => i.configured).length;
    return (
      <Box key={group.group}>
        <Box sx={{ pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h3" component="h3">{group.group}</Typography>
          <Typography variant="caption" color="text.secondary">{configuredCount} / {group.items.length}</Typography>
        </Box>
        <Box sx={tableScrollSx} role="region" aria-label={group.group} tabIndex={0}>
          <Table sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "45%" }}>{Locale.label("serverAdmin.serverHealth.setting")}</TableCell>
                <TableCell sx={{ width: 96 }}>{Locale.label("serverAdmin.serverHealth.status")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.serverHealth.detail")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.items.map((item) => (
                <TableRow key={item.key}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{renderStatus(item.configured)}</TableCell>
                  <TableCell sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>{item.detail || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    );
  };

  return (
    <AdminPanel headerText={Locale.label("serverAdmin.serverHealth.title")} subtitle={data ? Locale.label("serverAdmin.serverHealth.subtitle") : undefined}>
      {loading && <Typography>{Locale.label("common.loading")}</Typography>}
      {!loading && !data && <Typography color="error">{Locale.label("serverAdmin.serverHealth.loadError")}</Typography>}
      {!loading && data && (
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("serverAdmin.serverHealth.environment")}: <strong>{data.environment || "—"}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "repeat(2, minmax(0,1fr))" }, columnGap: 4, rowGap: 3, alignItems: "start" }}>
            {data.groups.map(renderGroup)}
          </Box>
        </Stack>
      )}
    </AdminPanel>
  );
};
