import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
  Icon,
  Chip
} from "@mui/material";
import {
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Tab as TabIcon
} from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { CardWithHeader, EmptyState } from "../../components/ui";
import { ensureSequentialSort, moveItemDown, moveItemUp } from "../../helpers/SortHelper";

interface Props {
  onSelected?: (tab: LinkInterface) => void;
  refreshKey?: number;
}

export function AppTabs({ onSelected = () => {}, refreshKey = 0 }: Props) {
  const [tabs, setTabs] = useState<LinkInterface[]>([]);

  const loadData = () => {
    ApiHelper.get("/links?category=b1Tab", "ContentApi").then((data: any) => setTabs(data));
  };

  const saveChanges = () => {
    ApiHelper.post("/links", tabs, "ContentApi").then(loadData);
  };

  const moveUp = (idx: number) => {
    ensureSequentialSort(tabs);
    moveItemUp(tabs, idx);
    saveChanges();
  };

  const moveDown = (idx: number) => {
    ensureSequentialSort(tabs);
    moveItemDown(tabs, idx);
    saveChanges();
  };

  const handleEdit = (tab: LinkInterface) => {
    onSelected(tab);
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "everyone": return "everyone";
      case "visitors": return "logged-in";
      case "members": return "members";
      case "staff": return "staff";
      case "team": return "team";
      case "groups": return "groups";
      default: return "everyone";
    }
  };

  const renderTabItem = (tab: LinkInterface, index: number) => (
    <React.Fragment key={index}>
      <ListItem sx={{ py: 2 }}>
        <ListItemIcon sx={{ mr: 2 }}>
          {(tab as any)?.photo ? (
            <Box
              sx={{
                borderRadius: '8px',
                overflow: 'hidden',
                width: 71,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={(tab as any).photo}
                alt={tab.text || "Tab icon"}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                backgroundColor: 'primary.main',
                borderRadius: '8px',
                width: 71,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Icon sx={{ fontSize: 20 }}>{tab.icon}</Icon>
            </Box>
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {tab.text || Locale.label("settings.appTabs.untitled")}
              </Typography>
              <Chip
                label={getVisibilityLabel((tab as any).visibility)}
                size="small"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Stack>
          }
          secondary={
            <Typography variant="body2" color="text.secondary">
              {tab.linkType === 'url' ? tab.url : tab.linkType}
            </Typography>
          }
          slotProps={{
            primary: { component: 'div' },
            secondary: { component: 'div' }
          }}
        />
        <ListItemSecondaryAction>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={Locale.label("settings.appTabs.moveUp")} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  sx={{ color: 'text.secondary' }}
                >
                  <ArrowUpIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={Locale.label("settings.appTabs.moveDown")} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => moveDown(index)}
                  disabled={index === tabs.length - 1}
                  sx={{ color: 'text.secondary' }}
                >
                  <ArrowDownIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={Locale.label("settings.appTabs.editTab")} arrow>
              <IconButton
                size="small"
                onClick={() => handleEdit(tab)}
                sx={{ color: 'primary.main' }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
      {index < tabs.length - 1 && <Divider />}
    </React.Fragment>
  );

  useEffect(loadData, []);
  useEffect(loadData, [refreshKey]);

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
            {tabs.map((tab, index) => renderTabItem(tab, index))}
          </List>
        )}
    </CardWithHeader>
  );
}
