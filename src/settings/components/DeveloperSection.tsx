import React, { useState, useEffect, useCallback } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Button, Typography, Card, Stack, Chip } from "@mui/material";
import { Key as KeyIcon, Delete as DeleteIcon, Add as AddIcon, Link as LinkIcon, Webhook as WebhookIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale } from "@churchapps/apphelper";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { ApiKeyEdit } from "./ApiKeyEdit";
import { WebhooksSection } from "./WebhooksSection";

export interface ApiKeyInterface {
  id?: string;
  name?: string;
  prefix?: string;
  scopes?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt?: Date;
  key?: string; // raw key — returned only on creation
}

export interface ConnectionInterface {
  id?: string;
  clientId?: string;
  clientName?: string;
  scopes?: string;
  createdAt?: Date;
  expiresAt?: Date;
}

const fmtDate = (d?: Date) => (d ? new Date(d).toLocaleDateString() : "—");

// Scopes come back as a delimited string (e.g. "people:read,groups:edit"). Render
// each as a compact chip so the column reads as tokens rather than a wall of text.
const renderScopes = (scopes?: string) => {
  const list = (scopes || "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ maxWidth: 440 }}>
      {list.map((s) => (
        <Chip key={s} label={s} size="small" variant="outlined" sx={{ height: 22, fontFamily: "monospace", fontSize: "0.72rem", "& .MuiChip-label": { px: 0.75 } }} />
      ))}
    </Stack>
  );
};

type DeveloperTab = "apiKeys" | "webhooks" | "connections";

const sectionToolbarSx = { p: 2, borderBottom: 1, borderColor: "divider" };
const emptyStateSx = { textAlign: "center" as const, py: 6, px: 2 };

// Developer portal (API keys, webhooks, connected apps). Rendered as a section of
// the Settings landing's configuration list.
export const DeveloperSection: React.FC = () => {
  const [tab, setTab] = useState<DeveloperTab>("apiKeys");
  const [apiKeys, setApiKeys] = useState<ApiKeyInterface[]>([]);
  const [connections, setConnections] = useState<ConnectionInterface[]>([]);
  const [showKeyEdit, setShowKeyEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiHelper.get("/apiKeys", "MembershipApi"),
      ApiHelper.get("/oauth/connections", "MembershipApi")
    ])
      .then(([keys, conns]: [ApiKeyInterface[], ConnectionInterface[]]) => {
        setApiKeys(keys || []);
        setConnections(conns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteKey = async (key: ApiKeyInterface) => {
    if (!window.confirm(Locale.label("settings.developer.deleteKeyConfirm").replace("{name}", key.name || ""))) return;
    await ApiHelper.delete("/apiKeys/" + key.id, "MembershipApi");
    loadData();
  };

  const handleRevoke = async (conn: ConnectionInterface) => {
    if (!window.confirm(Locale.label("settings.developer.revokeConfirm").replace("{name}", conn.clientName || ""))) return;
    await ApiHelper.delete("/oauth/connections/" + conn.id, "MembershipApi");
    loadData();
  };

  const handleKeySaved = () => { setShowKeyEdit(false); loadData(); };

  return (
    <>
      <NavigationTabs
        selectedTab={tab}
        onTabChange={(v) => setTab(v as DeveloperTab)}
        tabs={[
          { value: "apiKeys", label: Locale.label("settings.developer.apiKeys"), icon: <KeyIcon /> },
          { value: "webhooks", label: Locale.label("settings.webhooksPage.title"), icon: <WebhookIcon /> },
          { value: "connections", label: Locale.label("settings.developer.connectedApps"), icon: <LinkIcon /> }
        ] satisfies NavigationTab[]}
      />

      <Box sx={{ pt: 3 }}>
        {tab === "apiKeys" && (showKeyEdit ? (
          <ApiKeyEdit onSave={handleKeySaved} onCancel={() => setShowKeyEdit(false)} />
        ) : (
          <Card>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={sectionToolbarSx}>
              <Typography variant="h6">{Locale.label("settings.developer.apiKeys")}</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowKeyEdit(true)}>
                {Locale.label("settings.developer.newKey")}
              </Button>
            </Stack>
            {loading ? <Loading /> : apiKeys.length === 0 ? (
              <Box sx={emptyStateSx}>
                <KeyIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{Locale.label("settings.developer.noKeys")}</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("settings.developer.name")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.prefix")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.scopes")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.lastUsed")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.expires")}</TableCell>
                      <TableCell align="right">{Locale.label("settings.developer.actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apiKeys.map((k) => (
                      <TableRow key={k.id} hover>
                        <TableCell><Typography fontWeight={600}>{k.name}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontFamily="monospace">cak_{k.prefix}…</Typography></TableCell>
                        <TableCell>{renderScopes(k.scopes)}</TableCell>
                        <TableCell>{fmtDate(k.lastUsedAt)}</TableCell>
                        <TableCell>{fmtDate(k.expiresAt)}</TableCell>
                        <TableCell align="right">
                          <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => handleDeleteKey(k)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        ))}

        {tab === "webhooks" && <WebhooksSection />}

        {tab === "connections" && (
          <Card>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={sectionToolbarSx}>
              <Typography variant="h6">{Locale.label("settings.developer.connectedApps")}</Typography>
            </Stack>
            {loading ? <Loading /> : connections.length === 0 ? (
              <Box sx={emptyStateSx}>
                <LinkIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{Locale.label("settings.developer.noConnections")}</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("settings.developer.app")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.scopes")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.authorized")}</TableCell>
                      <TableCell>{Locale.label("settings.developer.expires")}</TableCell>
                      <TableCell align="right">{Locale.label("settings.developer.actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {connections.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell><Typography fontWeight={600}>{c.clientName}</Typography></TableCell>
                        <TableCell>{renderScopes(c.scopes)}</TableCell>
                        <TableCell>{fmtDate(c.createdAt)}</TableCell>
                        <TableCell>{fmtDate(c.expiresAt)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => handleRevoke(c)}>{Locale.label("settings.developer.revoke")}</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        )}
      </Box>
    </>
  );
};
