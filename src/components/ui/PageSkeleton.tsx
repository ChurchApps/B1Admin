import React from "react";
import { Skeleton, Stack, Box } from "@mui/material";
import { PageContainer } from "./PageContainer";

interface PageSkeletonProps {
  /** Show a wide hero band at the top (matches `<PageHeader>`). Defaults true. */
  showHeader?: boolean;
  /** Number of content rows to render. Defaults 4. */
  rows?: number;
}

/**
 * Skeletal placeholder for pages while their lazy chunks or initial data load.
 * Layout mirrors the typical PageHeader + content shell so the page doesn't jump
 * when the real content arrives.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ showHeader = true, rows = 4 }) => (
  <>
    {showHeader && <Skeleton variant="rectangular" height={140} sx={{ width: "100%" }} />}
    <PageContainer>
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="80%" />
            </Box>
            <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Stack>
    </PageContainer>
  </>
);
