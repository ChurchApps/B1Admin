import { Button, Grid, Box } from "@mui/material";
import React from "react";
import { Locale } from "@churchapps/apphelper";

export const PersonBanner: React.FC = () => {
  return (
    <Box sx={{ backgroundColor: "primary.light", color: "primary.contrastText", px: 3, py: 1.5 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 1 }} sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-start" } }}>
          <Box
            component="img"
            src="https://content.churchapps.org/Hchi650pfrH/membership/people/rNW0TQFFJ00.png?dt=1654567191000"
            alt="Jeremy Zongker"
            sx={{
              width: 100,
              height: 100,
              objectFit: "cover",
              borderRadius: "50%",
              border: 5,
              borderColor: "background.paper",
              float: "left",
              mr: 3.75
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }} sx={{ textAlign: { xs: "center", sm: "left" } }}>
          <h1
            style={{
              borderBottom: "none",
              fontSize: 30,
              fontWeight: "normal",
              marginBottom: 0,
              lineHeight: 1
            }}>
            Jeremy Zongker
          </h1>
          <div>918-282-2011 &nbsp; jeremy@zongker.net</div>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} style={{ textAlign: "right", display: "flex", alignItems: "center" }} sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" } }}>
          <Button variant="contained" color="success">
            {Locale.label("ui.personBanner.memberStatus")}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};
