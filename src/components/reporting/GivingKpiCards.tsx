"use client";

import React from "react";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import { Locale } from "../../helpers";

export interface GivingKpis {
  totalGiving: number;
  avgGift: number;
  donorCount: number;
  donationCount: number;
}

interface Props {
  kpis: GivingKpis;
}

const formatCurrency = (value: number) => {
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return usd.format(value || 0);
};

const formatNumber = (value: number) => (value || 0).toLocaleString();

export const GivingKpiCards = (props: Props) => {
  const { kpis } = props;

  const cards = [
    { label: Locale.label("donations.kpi.totalGiving") || "Total Giving", value: formatCurrency(kpis.totalGiving) },
    { label: Locale.label("donations.kpi.avgGift") || "Average Gift", value: formatCurrency(kpis.avgGift) },
    { label: Locale.label("donations.kpi.donorCount") || "Unique Donors", value: formatNumber(kpis.donorCount) },
    { label: Locale.label("donations.kpi.donationCount") || "Total Donations", value: formatNumber(kpis.donationCount) }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, i) => (
        <Grid key={i} size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" component="div">{card.value}</Typography>
              <Typography variant="body2" color="text.secondary">{card.label}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
