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
  /** Accessible name; also the placeholder when none is given. Falls back to "Search". */
  label?: string;
  placeholder?: string;
  /** "small" for dialogs and toolbars; the default is the prominent page search. */
  size?: TextFieldProps["size"];
  autoFocus?: boolean;
  id?: string;
  "data-testid"?: string;
  sx?: TextFieldProps["sx"];
}

// The page's search box: a full rounded field filled with the page background so it reads as the place to start.
export const SearchField: React.FC<Props> = ({ value, onChange, onSearch, label, placeholder, size, autoFocus, id, sx, ...rest }) => {
  const clearLabel = Locale.label("common.clear", "Clear");
  const name = label || placeholder || Locale.label("common.search");
  const small = size === "small";
  return (
    <TextField
      fullWidth
      type="search"
      margin="none"
      size={size}
      autoFocus={autoFocus}
      placeholder={placeholder || name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onSearch) { e.preventDefault(); onSearch(value); } }}
      sx={[
        {
          "& input::-webkit-search-cancel-button": { display: "none" },
          "& .MuiOutlinedInput-root": {
            bgcolor: "background.default",
            borderRadius: small ? "var(--b1-radius-control)" : "12px",
            ...(small ? {} : { minHeight: 52, typography: "body1", fontSize: "1.0625rem" }),
            "&.Mui-focused": { bgcolor: "background.paper" }
          }
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
      slotProps={{
        htmlInput: { id, name: id, "aria-label": name, autoComplete: "off", "data-testid": rest["data-testid"] },
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
