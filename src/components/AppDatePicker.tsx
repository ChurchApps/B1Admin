import { forwardRef, type ForwardedRef } from "react";
import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

export const AppDatePicker = forwardRef((props: TextFieldProps, ref: ForwardedRef<HTMLInputElement>) => {
  const { InputLabelProps, inputRef, ...rest } = props;
  return (
    <TextField
      type="date"
      InputLabelProps={{ shrink: true, ...InputLabelProps }}
      inputRef={ref || inputRef}
      {...rest}
      value={rest.value ?? ""}
    />
  );
});
