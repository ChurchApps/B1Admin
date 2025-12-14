import { useState } from "react";
import {
  Box, TextField, MenuItem, Typography, Stack, Divider, InputAdornment
} from "@mui/material";
import {
  Palette as PaletteIcon,
  SpaceBar as SpaceBarIcon,
  TextFields as TextFieldsIcon,
  BorderStyle as BorderStyleIcon
} from "@mui/icons-material";

interface TokenPickerProps {
  value?: string;
  onChange: (value: string) => void;
  tokenTypes?: ("colors" | "spacing" | "typography" | "borderRadius")[];
  label?: string;
  fullWidth?: boolean;
}

interface TokenGroup {
  label: string;
  icon: React.ReactNode;
  tokens: { value: string; label: string; preview?: string }[];
}

export function TokenPicker(props: TokenPickerProps) {
  const { value = "", onChange, tokenTypes = ["colors", "spacing", "typography", "borderRadius"], label = "Design Token", fullWidth = true } = props;
  const [open, setOpen] = useState(false);

  const colorTokens = {
    label: "Colors",
    icon: <PaletteIcon sx={{ fontSize: 18 }} />,
    tokens: [
      { value: "var(--light)", label: "Light", preview: "#FFFFFF" },
      { value: "var(--light-accent)", label: "Light Accent", preview: "#DDDDDD" },
      { value: "var(--accent)", label: "Accent", preview: "#0000DD" },
      { value: "var(--dark-accent)", label: "Dark Accent", preview: "#9999DD" },
      { value: "var(--dark)", label: "Dark", preview: "#000000" },
      { value: "var(--primary)", label: "Primary", preview: "#1976d2" },
      { value: "var(--secondary)", label: "Secondary", preview: "#dc004e" },
      { value: "var(--success)", label: "Success", preview: "#2e7d32" },
      { value: "var(--warning)", label: "Warning", preview: "#ed6c02" },
      { value: "var(--error)", label: "Error", preview: "#d32f2f" }
    ]
  };

  const spacingTokens = {
    label: "Spacing",
    icon: <SpaceBarIcon sx={{ fontSize: 18 }} />,
    tokens: [
      { value: "var(--spacing-xs)", label: "Extra Small (4px)", preview: "4px" },
      { value: "var(--spacing-sm)", label: "Small (8px)", preview: "8px" },
      { value: "var(--spacing-md)", label: "Medium (16px)", preview: "16px" },
      { value: "var(--spacing-lg)", label: "Large (24px)", preview: "24px" },
      { value: "var(--spacing-xl)", label: "Extra Large (32px)", preview: "32px" },
      { value: "var(--spacing-xxl)", label: "2X Large (48px)", preview: "48px" }
    ]
  };

  const typographyTokens = {
    label: "Typography",
    icon: <TextFieldsIcon sx={{ fontSize: 18 }} />,
    tokens: [
      { value: "var(--font-heading)", label: "Heading Font" },
      { value: "var(--font-body)", label: "Body Font" },
      { value: "var(--font-size-base)", label: "Base Size" },
      { value: "var(--font-size-sm)", label: "Small Size" },
      { value: "var(--font-size-lg)", label: "Large Size" },
      { value: "var(--line-height)", label: "Line Height" }
    ]
  };

  const borderRadiusTokens = {
    label: "Border Radius",
    icon: <BorderStyleIcon sx={{ fontSize: 18 }} />,
    tokens: [
      { value: "var(--radius-none)", label: "None (0px)", preview: "0px" },
      { value: "var(--radius-sm)", label: "Small (4px)", preview: "4px" },
      { value: "var(--radius-md)", label: "Medium (8px)", preview: "8px" },
      { value: "var(--radius-lg)", label: "Large (16px)", preview: "16px" },
      { value: "var(--radius-full)", label: "Full (9999px)", preview: "9999px" }
    ]
  };

  const allTokenGroups: Record<string, TokenGroup> = {
    colors: colorTokens,
    spacing: spacingTokens,
    typography: typographyTokens,
    borderRadius: borderRadiusTokens
  };

  const activeGroups = tokenTypes.map(type => allTokenGroups[type]).filter(Boolean);

  const renderTokenOption = (token: { value: string; label: string; preview?: string }, groupLabel: string) => {
    const isColor = groupLabel === "Colors";

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {isColor && token.preview && (
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 1,
              backgroundColor: token.preview,
              border: "1px solid",
              borderColor: "grey.300",
              flexShrink: 0
            }}
          />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">{token.label}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
            {token.value}
          </Typography>
        </Box>
      </Box>
    );
  };

  const getDisplayValue = () => {
    for (const group of activeGroups) {
      const token = group.tokens.find(t => t.value === value);
      if (token) return token.label;
    }
    return value || "Select a token";
  };

  const getCurrentPreview = () => {
    for (const group of activeGroups) {
      const token = group.tokens.find(t => t.value === value);
      if (token?.preview) return token.preview;
    }
    return null;
  };

  const preview = getCurrentPreview();
  const isColorToken = activeGroups.some(g => g.label === "Colors" && g.tokens.some(t => t.value === value));

  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth={fullWidth}
      SelectProps={{
        open,
        onOpen: () => setOpen(true),
        onClose: () => setOpen(false),
        MenuProps: {
          PaperProps: {
            sx: { maxHeight: 400 }
          }
        }
      }}
      InputProps={{
        startAdornment: preview && isColorToken ? (
          <InputAdornment position="start">
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 1,
                backgroundColor: preview,
                border: "1px solid",
                borderColor: "grey.300"
              }}
            />
          </InputAdornment>
        ) : undefined
      }}
      data-testid="token-picker"
    >
      {activeGroups.map((group, groupIndex) => [
        groupIndex > 0 && <Divider key={`divider-${groupIndex}`} />,
        <MenuItem
          key={`header-${groupIndex}`}
          disabled
          sx={{
            opacity: 1,
            backgroundColor: "grey.50",
            fontWeight: 600,
            py: 1
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {group.icon}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {group.label}
            </Typography>
          </Stack>
        </MenuItem>,
        ...group.tokens.map((token) => (
          <MenuItem key={token.value} value={token.value} sx={{ py: 1.5 }}>
            {renderTokenOption(token, group.label)}
          </MenuItem>
        ))
      ])}
    </TextField>
  );
}
