"use client";

import React from "react";
import { NonAuthDonation as SharedNonAuthDonation } from "@churchapps/apphelper/donations";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
}

// Thin pass-through: the shared guest form resolves the church's gateway and
// dispatches to the right provider — Stripe and Kingdom Funding alike.
export const NonAuthDonation: React.FC<Props> = (props) => <SharedNonAuthDonation {...props} />;
