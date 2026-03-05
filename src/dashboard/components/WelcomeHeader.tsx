import React from "react";
import { Box, Typography, Container } from "@mui/material";

interface Props {
  title: string;
  subtitle: string;
}

export const WelcomeHeader: React.FC<Props> = ({ title, subtitle }) => (
  <Box
    sx={{
      background: "linear-gradient(135deg, var(--c1d3) 0%, var(--c1) 40%, var(--c1l2) 100%)",
      color: "white",
      py: 6,
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: "''",
        position: "absolute",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
      },
      "&::after": {
        content: "''",
        position: "absolute",
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
      },
    }}
  >
    <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
      <Typography variant="h3" sx={{ fontWeight: 500, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 400 }}>
        {subtitle}
      </Typography>
    </Container>
  </Box>
);
