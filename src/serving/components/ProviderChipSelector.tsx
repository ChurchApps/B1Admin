import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { LinkOff as LinkOffIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type ContentProviderAuthInterface } from "../../helpers";
import { type IProvider } from "@churchapps/content-provider-helper";

interface ProviderInfo {
  id: string;
  name: string;
  requiresAuth?: boolean;
  implemented?: boolean;
}

interface Props {
  selectedProviderId: string;
  onProviderChange: (id: string) => void;
  availableProviders: ProviderInfo[];
  linkedProviders: ContentProviderAuthInterface[];
  showAllProviders: boolean;
  onShowAll: () => void;
  isCurrentProviderLinked: boolean;
  currentProviderRequiresAuth: boolean;
}

export const ProviderChipSelector: React.FC<Props> = (props) => (
  <Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {Locale.label("plans.lessonSelector.contentProvider") || "Content Provider"}
      </Typography>
      {!props.showAllProviders && (
        <Button size="small" onClick={props.onShowAll}>
          {Locale.label("plans.lessonSelector.browseOtherProviders") || "Browse Other Providers"}
        </Button>
      )}
    </Stack>
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {(props.showAllProviders ? props.availableProviders : props.availableProviders.filter(p =>
        !p.requiresAuth || props.linkedProviders.some(lp => lp.providerId === p.id)
      )).map((providerInfo) => {
        const isLinked = !providerInfo.requiresAuth || props.linkedProviders.some(lp => lp.providerId === providerInfo.id);
        return (
          <Chip
            key={providerInfo.id}
            label={providerInfo.name}
            onClick={() => props.onProviderChange(providerInfo.id)}
            color={props.selectedProviderId === providerInfo.id ? "primary" : "default"}
            variant={props.selectedProviderId === providerInfo.id ? "filled" : "outlined"}
            icon={!isLinked ? <LinkOffIcon /> : undefined}
            sx={{ opacity: isLinked ? 1 : 0.6 }}
          />
        );
      })}
    </Box>
    {!props.isCurrentProviderLinked && props.currentProviderRequiresAuth && (
      <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
        {Locale.label("plans.lessonSelector.providerNotLinked") || "This provider is not linked. Please link it in ministry settings to access content."}
      </Typography>
    )}
  </Box>
);
