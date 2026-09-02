import React, { forwardRef } from "react";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useFirstDayOfWeek, applyWeekStart } from "../hooks";
import type { TextFieldProps } from "@mui/material";

export const AppDatePicker = forwardRef((props: TextFieldProps, ref: any) => {
  const firstDayOfWeek = useFirstDayOfWeek();
  React.useEffect(() => {
    applyWeekStart(firstDayOfWeek);
  }, [firstDayOfWeek]);

  const { value, onChange, label, error, helperText, InputLabelProps, inputProps, fullWidth, size, name, onBlur, inputRef, ...rest } = props;

  const handleChange = (newValue: any) => {
    const formatted = newValue && newValue.isValid() ? newValue.format("YYYY-MM-DD") : "";
    if (onChange) {
      onChange({ target: { value: formatted, name } } as any);
    }
  };

  const restAny = rest as any;
  const testId = restAny["data-testid"] || restAny["data-cy"];

  const cleanRest = { ...restAny };
  delete cleanRest["data-testid"];
  delete cleanRest["data-cy"];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} key={firstDayOfWeek}>
      <DatePicker
        label={label}
        value={value ? dayjs(value as string) : null}
        onChange={handleChange}
        slotProps={{
          textField: {
            fullWidth,
            size,
            error,
            helperText,
            name,
            onBlur,
            inputRef: ref || inputRef,
            InputLabelProps: { shrink: true, ...InputLabelProps },
            inputProps: { ...inputProps, "data-testid": testId },
            ...cleanRest
          }
        }}
      />
    </LocalizationProvider>
  );
});
