import React from "react";
import { Container, Box } from "@mui/material";
import type { ContainerProps } from "@mui/material";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: ContainerProps["maxWidth"];
  py?: number;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, maxWidth = "xl", py = 3 }) => (
  <Container maxWidth={maxWidth}>
    <Box sx={{ py }}>{children}</Box>
  </Container>
);
