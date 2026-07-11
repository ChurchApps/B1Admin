import React from "react";
import { Link } from "react-router-dom";
import { Box, Button, Icon, Paper, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

export const NotFound: React.FC = () => (
  <Box sx={{ p: 3 }} data-testid="not-found">
    <Paper sx={{ p: 6, textAlign: "center", maxWidth: 480, mx: "auto" }}>
      <Icon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}>error_outline</Icon>
      <Typography variant="h5" gutterBottom>
        {Locale.label("notFound.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {Locale.label("notFound.message")}
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/">
        {Locale.label("notFound.backHome")}
      </Button>
    </Paper>
  </Box>
);
