import React, { useState } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Button, Typography, Stack, Chip } from "@mui/material";
import { Key as KeyIcon, Delete as DeleteIcon, Link as LinkIcon, Webhook as WebhookIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { NavigationTabs, type NavigationTab, SectionListCard } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";
import { formatDateSafe } from "../../helpers/DateFormatHelper";
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

const fmtDate = (d?: Date) => formatDateSafe(d, "—");

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

// Developer portal (API keys, webhooks, connected apps). Rendered as a section of
// the Settings landing's configuration list.
export const DeveloperSection: React.FC = () => {
  const [tab, setTab] = useState<DeveloperTab>("apiKeys");
  const [showKeyEdit, setShowKeyEdit] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const apiKeysQuery = useQuery<ApiKeyInterface[]>({ queryKey: ["/apiKeys", "MembershipApi"], placeholderData: [] });
  const connectionsQuery = useQuery<ConnectionInterface[]>({ queryKey: ["/oauth/connections", "MembershipApi"], placeholderData: [] });
  const apiKeys = apiKeysQuery.data || [];
  const connections = connectionsQuery.data || [];
  const loading = apiKeysQuery.isLoading || connectionsQuery.isLoading;

  const handleDeleteKey = async (key: ApiKeyInterface) => {
    if (!(await confirm(Locale.label("settings.developer.deleteKeyConfirm").replace("{name}", key.name || "")))) return;
    await ApiHelper.delete("/apiKeys/" + key.id, "MembershipApi");
    apiKeysQuery.refetch();
  };

  const handleRevoke = async (conn: ConnectionInterface) => {
    if (!(await confirm(Locale.label("settings.developer.revokeConfirm").replace("{name}", conn.clientName || ""), { confirmLabel: Locale.label("settings.developer.revoke") }))) return;
    await ApiHelper.delete("/oauth/connections/" + conn.id, "MembershipApi");
    connectionsQuery.refetch();
  };

  const handleKeySaved = () => { setShowKeyEdit(false); apiKeysQuery.refetch(); };

  return (
    <>
      {ConfirmDialogElement}
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
          <SectionListCard
            icon={<KeyIcon />}
            title={Locale.label("settings.developer.apiKeys")}
            count={apiKeys.length}
            onAdd={() => setShowKeyEdit(true)}
            addLabel={Locale.label("settings.developer.newKey")}
            loading={loading}
            empty={{ icon: <KeyIcon />, title: Locale.label("settings.developer.noKeys") }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("settings.developer.name")}</TableCell>
                    <TableCell>{Locale.label("settings.developer.prefix")}</TableCell>
                    <TableCell>{Locale.label("settings.developer.scopes")}</TableCell>
                    <TableCell>{Locale.label("settings.developer.lastUsed")}</TableCell>
                    <TableCell>{Locale.label("settings.developer.expires")}</TableCell>
                    <TableCell align="right"></TableCell>
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
                      <TableCell align="right" className="rowActions">
                        <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => handleDeleteKey(k)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionListCard>
        ))}

        {tab === "webhooks" && <WebhooksSection />}

        {tab === "connections" && (
          <SectionListCard
            icon={<LinkIcon />}
            title={Locale.label("settings.developer.connectedApps")}
            count={connections.length}
            loading={loading}
            empty={{ icon: <LinkIcon />, title: Locale.label("settings.developer.noConnections") }}>
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
                      <TableCell align="right" className="rowActions">
                        <Button size="small" onClick={() => handleRevoke(c)}>{Locale.label("settings.developer.revoke")}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionListCard>
        )}
      </Box>
    </>
  );
};
