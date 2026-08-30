import { Tabs, Tab, Menu, MenuItem, Stack, useTheme } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import React, { memo, useState } from "react";

export interface NavigationTab {
  value: string;
  label: string;
  icon?: string | React.ReactElement;
  testId?: string;
}

export interface NavigationDropdown<T = any> {
  value: string;
  label: string;
  icon?: string | React.ReactElement;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onItemSelect: (item: T) => void;
}

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  dropdown?: NavigationDropdown;
  testId?: string;
  // Renders transparent, left-aligned, white-on-blue for use inside the gradient page header
  onHeader?: boolean;
}

// Shared with SmartTabs so every page/local tab bar renders identically.
export const navigationTabsSx = {
  minHeight: 48,
  "& .MuiTab-root": {
    minHeight: 48,
    textTransform: "none",
    fontSize: "0.95rem",
    fontWeight: 700
  }
};

// First tab flush left so its label shares the banner's left edge with the title/stats.
const headerTabsSx = {
  minHeight: 44,
  "& .MuiTab-root:first-of-type": { paddingLeft: 0, minWidth: "auto" },
  "& .MuiTab-root": {
    minHeight: 44,
    textTransform: "none",
    fontSize: "13px",
    fontWeight: 600,
    color: "rgba(255,255,255,.66)",
    "& .MuiSvgIcon-root": { color: "inherit" },
    "&:hover": { color: "rgba(255,255,255,.9)" },
    "&.Mui-selected": { color: "#fff" }
  },
  "& .MuiTabs-indicator": {
    backgroundColor: "#fff",
    height: "2.5px"
  }
};

export const NavigationTabs = memo((props: Props) => {
  const { selectedTab, onTabChange, tabs, dropdown, testId, onHeader } = props;
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

  const tabValues = tabs.map((t) => t.value).filter(Boolean);
  const tabsValue = tabValues.includes(selectedTab) ? selectedTab : (tabValues[0] || false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    if (newValue !== dropdown?.value) onTabChange(newValue);
  };

  const containerStyle: React.CSSProperties = onHeader
    ? { backgroundColor: "transparent" }
    : { backgroundColor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` };

  return (
    <div style={containerStyle}>
      <Tabs
        value={tabsValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={onHeader ? headerTabsSx : navigationTabsSx}
        data-testid={testId}>
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{ gap: 1 }}
            data-testid={tab.testId}
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
              mt: 0.5
            }
          }}>
          {dropdown.items?.map((item: any, index) => (
            <MenuItem
              key={item.id || index}
              onClick={() => handleItemSelect(item)}
              sx={{
                py: 1.5,
                px: 2,
                "&:hover": { backgroundColor: "action.hover" }
              }}>
              {dropdown.renderItem(item)}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
});
