import React from "react";
import { PageContainer, PageHeader, VerbRow } from "../../components/ui";

interface Props {
  title: string;
  subtitle?: string;
  verbs?: React.ReactNode;
  /** Page-header actions; the primary one (a HeaderPrimaryButton) goes last. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Shared shell for the mobile pages; section switching lives in the main menu.
export const MobileChrome: React.FC<Props> = ({ title, subtitle, verbs, actions, children }) => (
  <>
    <PageHeader title={title} subtitle={subtitle}>{actions}</PageHeader>
    <PageContainer>
      {verbs && <VerbRow sx={{ mb: 3 }}>{verbs}</VerbRow>}
      {children}
    </PageContainer>
  </>
);
