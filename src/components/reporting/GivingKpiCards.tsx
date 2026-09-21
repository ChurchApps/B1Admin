"use client";

import { Card, CardContent, Grid, Typography } from "@mui/material";
import { CurrencyHelper } from "@churchapps/apphelper";
import { Locale } from "../../helpers";

export interface GivingKpis {
  totalGiving: number;
  avgGift: number;
  donorCount: number;
  donationCount: number;
  // Set by the Api: totals are already converted into `currency` with server-side exchange rates.
  currency?: string;
  isConverted?: boolean;
}

interface Props {
  kpis: GivingKpis;
  currency?: string;
}

const formatNumber = (value: number) => (value || 0).toLocaleString();

export const GivingKpiCards = (props: Props) => {
  const { kpis } = props;
  const currency = kpis.currency || props.currency || "usd";
  const formatCurrency = (value: number) => CurrencyHelper.formatCurrencyWithLocale(value || 0, currency, 0);

  const cards = [
    { label: Locale.label("reporting.givingKpiCards.totalGiving"), value: formatCurrency(kpis.totalGiving), testId: "kpi-total-giving" },
    { label: Locale.label("reporting.givingKpiCards.avgGift"), value: formatCurrency(kpis.avgGift), testId: "kpi-avg-gift" },
    { label: Locale.label("reporting.givingKpiCards.donorCount"), value: formatNumber(kpis.donorCount), testId: "kpi-donor-count" },
    { label: Locale.label("reporting.givingKpiCards.donationCount"), value: formatNumber(kpis.donationCount), testId: "kpi-donation-count" }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, i) => (
        <Grid key={i} size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" component="div" data-testid={card.testId}>{card.value}</Typography>
              <Typography variant="body2" color="text.secondary">{card.label}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      {kpis.isConverted && (
        <Grid size={12}>
          <Typography variant="caption" color="text.secondary" data-testid="kpi-converted-note">{Locale.label("reporting.givingKpiCards.convertedNote")}</Typography>
        </Grid>
      )}
    </Grid>
  );
};
