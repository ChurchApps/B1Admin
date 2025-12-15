import { Tabs, Tab, Menu, MenuItem, Stack, Typography, useTheme } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import React, { memo, useState } from "react";

export interface NavigationTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface NavigationDropdown<T = any> {
  value: string;
  label: string;
  icon?: React.ReactNode;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onItemSelect: (item: T) => void;
}

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  dropdown?: NavigationDropdown;
}

export const NavigationTabs = memo((props: Props) => {
  const { selectedTab, onTabChange, tabs, dropdown } = props;
  const [dropdownAnchor, setDropdownAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  const handleDropdownOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setDropdownAnchor(event.currentTarget);
  };

  const handleDropdownClose = () => {
    setDropdownAnchor(null);
  };

  const handleItemSelect = (item: any) => {
    dropdown?.onItemSelect(item);
    handleDropdownClose();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    if (newValue !== dropdown?.value) onTabChange(newValue);
  };

  return (
    <div style={{ backgroundColor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          minHeight: 48,
          "& .MuiTab-root": {
            minHeight: 48,
            textTransform: "none",
            fontSize: "0.95rem",
            fontWeight: 700,
          },
        }}>
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        ))}

        {dropdown && dropdown.items && dropdown.items.length > 0 && (
          <Tab
            value={dropdown.value}
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <span>{dropdown.label}</span>
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
              </Stack>
            }
            icon={dropdown.icon}
            iconPosition="start"
            onClick={handleDropdownOpen}
            sx={{ gap: 1 }}
          />
        )}
      </Tabs>

      {dropdown && (
        <Menu
          anchorEl={dropdownAnchor}
          open={Boolean(dropdownAnchor)}
          onClose={handleDropdownClose}
          PaperProps={{
            sx: {
              minWidth: 200,
              maxHeight: 300,
              mt: 0.5,
            },
          }}>
          {dropdown.items?.map((item: any, index) => (
            <MenuItem
              key={item.id || index}
              onClick={() => handleItemSelect(item)}
              sx={{
                py: 1.5,
                px: 2,
                "&:hover": { backgroundColor: "action.hover" },
              }}>
              {dropdown.renderItem(item)}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
});
