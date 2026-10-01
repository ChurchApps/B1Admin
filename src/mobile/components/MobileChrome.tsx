import React from "react";
import { Box, ButtonBase } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { SecondaryMenuHelper } from "../../helpers/SecondaryMenuHelper";
import { PageContainer, PageHeader, VerbRow, filterChipSx } from "../../components/ui";

const pillIds: Record<string, string> = {
  "/mobile/navigation": "pill-mobile-nav",
  "/mobile/theme": "pill-mobile-theme",
  "/mobile/b1-mobile": "pill-mobile-portal",
  "/mobile/checkin": "pill-mobile-checkin",
  "/mobile/checkin/labels": "pill-mobile-labels"
};

interface Props {
  title: string;
  subtitle?: string;
  verbs?: React.ReactNode;
  /** Page-header actions; the primary one (a HeaderPrimaryButton) goes last. */
  actions?: React.ReactNode;
  maxWidth?: "md" | "lg" | false;
  children: React.ReactNode;
}

// Shared shell for the five mobile pages: title, section pills (same gates as the secondary menu), then the page.
export const MobileChrome: React.FC<Props> = ({ title, subtitle, verbs, actions, maxWidth, children }) => {
  const location = useLocation();
  const { menuItems } = SecondaryMenuHelper.getMobileMenu(location.pathname);
  const current = menuItems.map((m) => m.url).filter((u) => location.pathname.startsWith(u)).sort((a, b) => b.length - a.length)[0];

  const pills = menuItems.length > 1 && (
    <Box component="nav" aria-label={Locale.label("common.mobile")} sx={{ display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" }, pb: { xs: 0.5, sm: 0 } }}>
      {menuItems.map((m) => (
        <ButtonBase key={m.url} component={Link} to={m.url} aria-current={m.url === current ? "page" : undefined} data-testid={pillIds[m.url]} sx={{ ...filterChipSx(m.url === current), flexShrink: 0, whiteSpace: "nowrap" }}>
          {m.label}
        </ButtonBase>
      ))}
    </Box>
  );

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} tabs={pills || undefined}>{actions}</PageHeader>
      <PageContainer maxWidth={maxWidth}>
        {verbs && <VerbRow sx={{ mb: 3 }}>{verbs}</VerbRow>}
        {children}
      </PageContainer>
    </>
  );
};
