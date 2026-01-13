import React from "react";
import { Box, Tabs as MuiTabs, Tab } from "@mui/material";

export interface SmartTabItem {
  key: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}

interface SmartTabsProps {
  tabs: SmartTabItem[];
  value?: string; // controlled key
  onChange?: (key: string) => void;
  ariaLabel?: string;
}

export const SmartTabs: React.FC<SmartTabsProps> = ({ tabs, value, onChange, ariaLabel }) => {
  const visibleTabs = React.useMemo(() => tabs.filter((t) => !t.hidden), [tabs]);

  const defaultKey = React.useMemo(() => visibleTabs[0]?.key ?? "", [visibleTabs]);
  const [internalKey, setInternalKey] = React.useState<string>(value ?? defaultKey);

  React.useEffect(() => {
    // If controlled value changes, sync internal
    if (value !== undefined) setInternalKey(value);
  }, [value]);

  React.useEffect(() => {
    // If tabs change and current key is no longer visible, fall back to first
    if (!visibleTabs.find((t) => t.key === internalKey)) {
      setInternalKey(defaultKey);
      if (onChange && defaultKey) onChange(defaultKey);
    }
  }, [visibleTabs, internalKey, defaultKey, onChange]);

  const selectedKey = value ?? internalKey;
  const selectedIndex = Math.max(0, visibleTabs.findIndex((t) => t.key === selectedKey));
  const handleChange = (_: React.SyntheticEvent, newIndex: number) => {
    const newKey = visibleTabs[newIndex]?.key;
    if (!newKey) return;
    if (value === undefined) setInternalKey(newKey);
    onChange?.(newKey);
  };

  const current = visibleTabs.find((t) => t.key === selectedKey) ?? visibleTabs[0];

  return (
    <Box>
      <MuiTabs value={selectedIndex} onChange={handleChange} aria-label={ariaLabel} sx={{ borderBottom: "1px solid var(--border-main)" }}>
        {visibleTabs.map((t) => (
          <Tab key={t.key} label={t.label} disabled={t.disabled} />
        ))}
      </MuiTabs>
      <Box sx={{ mt: 2 }}>{current?.content}</Box>
    </Box>
  );
};
