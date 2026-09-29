import React from "react";
import { Skeleton, Stack, Box } from "@mui/material";
import { PageContainer } from "./PageContainer";

interface PageSkeletonProps {
  /** Show a page-title placeholder at the top (matches ui `<PageHeader>`). Defaults true. */
  showHeader?: boolean;
  /** Number of content rows to render. Defaults 4. */
  rows?: number;
}

/** Skeletal placeholder while lazy chunks/initial data load. Mirrors PageHeader + content shell to prevent jumping. */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ showHeader = true, rows = 4 }) => (
  <>
    <PageContainer>
      <Stack spacing={2} aria-busy="true">
        {showHeader && <Skeleton variant="text" width={280} height={48} />}
        <Skeleton variant="rectangular" height={44} sx={{ borderRadius: "var(--b1-radius-control)" }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="80%" />
            </Box>
            <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: "var(--b1-radius-control)" }} />
          </Box>
        ))}
      </Stack>
    </PageContainer>
  </>
);
