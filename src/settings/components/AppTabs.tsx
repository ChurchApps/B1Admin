import React from "react";
import {
  Box,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Icon
} from "@mui/material";
import {
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Tab as TabIcon,
  SubdirectoryArrowRight as ChildIcon
} from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { CardWithHeader, EmptyState, StatusBadge } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useReorderableLinks } from "../../hooks";

interface Props {
  onSelected?: (tab: LinkInterface) => void;
  refreshKey?: number;
}

export function AppTabs({ onSelected = () => {}, refreshKey = 0 }: Props) {
  const { links: tabs, moveUp, moveDown } = useReorderableLinks("b1Tab", { refresh: refreshKey });

  // Folders hold one level of tabs. A tab whose folder is gone is listed at the top level.
  const topLevel = tabs.filter(t => !t.parentId || !tabs.some(p => p.id === t.parentId && p.linkType === "folder"));
  const childrenOf = (folder: LinkInterface) => (folder.linkType === "folder" ? tabs.filter(t => t.parentId === folder.id) : []);
  const rows = topLevel.flatMap((tab, index) => [
    { tab, index, siblings: topLevel, nested: false },
    ...childrenOf(tab).map((child, childIndex, children) => ({ tab: child, index: childIndex, siblings: children, nested: true }))
  ]);

  const getTypeLabel = (tab: LinkInterface) => {
    if (tab.linkType === "url") return tab.url;
    if (tab.linkType !== "folder") return tab.linkType;
    const count = childrenOf(tab).length;
    return count === 1 ? Locale.label("settings.appTabs.folderOneTab") : Locale.label("settings.appTabs.folderTabs").replace("{}", String(count));
  };

  const handleEdit = (tab: LinkInterface) => {
    onSelected(tab);
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "visitors": return Locale.label("settings.appEdit.loggedInUsers");
      case "members": return Locale.label("settings.appEdit.membersStaff");
      case "staff": return Locale.label("settings.appEdit.staffOnly");
      case "team": return Locale.label("settings.appEdit.team");
      case "groups": return Locale.label("settings.appEdit.groups");
      default: return Locale.label("settings.appEdit.everyone");
    }
  };

  const renderTabItem = ({ tab, index, siblings, nested }: typeof rows[number], rowIndex: number) => (
    <React.Fragment key={tab.id || rowIndex}>
      <ListItem sx={{ py: 2, pl: nested ? 6 : 2 }} data-nested={nested ? "true" : "false"}>
        {nested && <ChildIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />}
        <ListItemIcon sx={{ mr: 2 }}>
          {(tab as any)?.photo ? (
            <Box
              sx={{
                borderRadius: "var(--b1-radius-control)",
                overflow: "hidden",
                width: 71,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={(tab as any).photo}
                alt={tab.text || Locale.label("settings.appEdit.tabIconAlt")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                backgroundColor: "action.hover",
                borderRadius: "var(--b1-radius-control)",
                width: 71,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary"
              }}
            >
              <Icon sx={{ fontSize: 20 }}>{tab.icon}</Icon>
            </Box>
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" component="h3" sx={{ fontWeight: 600 }}>
                {tab.text || Locale.label("settings.appTabs.untitled")}
              </Typography>
              <StatusBadge>{getVisibilityLabel((tab as any).visibility)}</StatusBadge>
            </Stack>
          }
          secondary={
            <Typography variant="body2" color="text.secondary">
              {getTypeLabel(tab)}
            </Typography>
          }
          slotProps={{
            primary: { component: "div" },
            secondary: { component: "div" }
          }}
        />
        <ListItemSecondaryAction>
          <Stack direction="row" spacing={0.5}>
            <AppIconButton label={Locale.label("settings.appTabs.moveUp")} icon={<ArrowUpIcon />} onClick={() => moveUp(index, siblings)} disabled={index === 0} />
            <AppIconButton label={Locale.label("settings.appTabs.moveDown")} icon={<ArrowDownIcon />} onClick={() => moveDown(index, siblings)} disabled={index === siblings.length - 1} />
            <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={() => handleEdit(tab)} />
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
      {rowIndex < rows.length - 1 && <Divider />}
    </React.Fragment>
  );

  return (
    <CardWithHeader
      title={Locale.label("settings.appTabs.title")}
      icon={<TabIcon />}
    >
      {tabs.length === 0
        ? (
          <EmptyState
            icon={<TabIcon />}
            title={Locale.label("settings.appTabs.noTabs")}
            description={Locale.label("settings.appTabs.noTabsDesc")}
            variant="card"
          />
        )
        : (
          <List sx={{ p: 0 }}>
            {rows.map((row, rowIndex) => renderTabItem(row, rowIndex))}
          </List>
        )}
    </CardWithHeader>
  );
}
