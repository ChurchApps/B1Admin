import React from "react";
import { Alert, AlertTitle, Box, Button, Skeleton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";

interface Props {
  /** linkType this admin section corresponds to (e.g. "sermons", "groups", "donation"). */
  linkType: string;
  /** When false (e.g. no sermons exist yet), the banner suppresses itself. */
  hasContent: boolean;
  /** Optional: for "page" linkType, the specific page id this banner is gating. */
  linkData?: string;
}

export const TabVisibilityBanner: React.FC<Props> = ({ linkType, hasContent, linkData }) => {
  const navigate = useNavigate();

  const { data: tabs, isLoading } = useQuery<LinkInterface[]>({
    queryKey: ["/links?category=b1Tab", "ContentApi"],
    staleTime: 60_000
  });

  if (!hasContent) return null;
  if (isLoading) return <Box sx={{ mb: 2, px: 3 }}><Skeleton variant="rounded" height={56} /></Box>;

  const tabExists = (tabs || []).some(t => {
    if (t.linkType !== linkType) return false;
    if (linkType === "page" && linkData) return t.linkData === linkData;
    return true;
  });
  if (tabExists) return null;

  const handleClick = () => {
    const params = new URLSearchParams({ linkType });
    if (linkData) params.set("linkData", linkData);
    navigate(`/mobile/navigation?${params.toString()}`);
  };

  return (
    <Box sx={{ mb: 2, px: 3 }}>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleClick}>
            {Locale.label("tabBanner.cta")}
          </Button>
        }
      >
        <AlertTitle>{Locale.label(`tabBanner.${linkType}.title`)}</AlertTitle>
        {Locale.label(`tabBanner.${linkType}.body`)}
      </Alert>
    </Box>
  );
};
