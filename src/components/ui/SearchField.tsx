import React from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter. Omit for live filtering. */
  onSearch?: (value: string) => void;
  /** Visible label; falls back to "Search". */
  label?: string;
  placeholder?: string;
  size?: TextFieldProps["size"];
  autoFocus?: boolean;
  "data-testid"?: string;
  sx?: TextFieldProps["sx"];
}

export const SearchField: React.FC<Props> = ({ value, onChange, onSearch, label, placeholder, size, autoFocus, sx, ...rest }) => {
  const clearLabel = Locale.label("common.clear", "Clear");
  return (
    <TextField
      fullWidth
      type="search"
      margin="none"
      size={size}
      autoFocus={autoFocus}
      label={label || Locale.label("common.search")}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onSearch) { e.preventDefault(); onSearch(value); } }}
      sx={[{ "& input::-webkit-search-cancel-button": { display: "none" } }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{
        htmlInput: { "data-testid": rest["data-testid"] },
        input: {
          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "text.secondary" }} /></InputAdornment>,
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label={clearLabel} onClick={() => { onChange(""); onSearch?.(""); }} edge="end">
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined
        }
      }}
    />
  );
};
