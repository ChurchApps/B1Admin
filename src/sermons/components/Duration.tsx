import { Grid, TextField } from "@mui/material";
import React from "react";
import { Locale } from "@churchapps/apphelper";

interface Props { totalSeconds: number, updatedFunction?: (totalSeconds: number) => void }

export const Duration: React.FC<Props> = (props) => {
  let min = Math.floor(props.totalSeconds / 60);
  let sec = props.totalSeconds - (min * 60);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.currentTarget.value);
    switch (e.currentTarget.name) {
      case "min": min = val; break;
      case "sec": sec = val; break;
    }
    const total = min * 60 + sec;
    props.updatedFunction(total);
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label={Locale.label("sermons.duration.minutes")} type="number" InputProps={{ inputProps: { min: 0, step: 1, max: 59 } }} name="min" value={min || ""} onChange={handleChange} placeholder="45" />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label={Locale.label("sermons.duration.seconds")} type="number" InputProps={{ inputProps: { min: 0, step: 1, max: 59 } }} name="sec" value={sec || ""} onChange={handleChange} placeholder="30" />
      </Grid>
    </Grid>
  );
};
