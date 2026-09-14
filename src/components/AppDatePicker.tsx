import { forwardRef } from "react";
import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

export const AppDatePicker = forwardRef((props: TextFieldProps, ref: any) => {
  const { InputLabelProps, inputRef, ...rest } = props;
  return (
    <TextField
      type="date"
      InputLabelProps={{ shrink: true, ...InputLabelProps }}
      inputRef={ref || inputRef}
      {...rest}
    />
  );
});
