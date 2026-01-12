import React, { memo } from "react";
import { DonationPage } from "../../donationComponents";
import { UserHelper } from "@churchapps/apphelper";
import { Box } from "@mui/material";

interface Props {
  personId: string;
}

export const PersonDonations: React.FC<Props> = memo((props) => {
  return (
    <Box
      sx={{
        "& .donationPage": {
          "& .table": {
            width: "100%",
            borderCollapse: "collapse",
            margin: "16px 0",
          },
          "& .table th": {
            backgroundColor: "var(--bg-sub)",
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "text.primary",
            borderBottom: "2px solid var(--border-main)",
          },
          "& .table td": {
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-main)",
            fontSize: "0.95rem",
            color: "text.primary",
          },
          "& .table tbody tr:hover": { backgroundColor: "var(--bg-sub)" },
          "& .table tbody tr:last-child td": { borderBottom: "none" },
          "& .donationAmount": {
            fontWeight: 600,
            color: "primary.main",
          },
          "& .donationDate": {
            color: "text.secondary",
            fontSize: "0.875rem",
          },
          "& .donationFund": {
            color: "text.primary",
            fontWeight: 500,
          },
          "& .totalRow": {
            fontWeight: 600,
            backgroundColor: "action.hover",
            "& td": {
              borderTop: "2px solid",
              borderTopColor: "primary.main",
              color: "primary.main",
            },
          },
          "& .noData": {
            textAlign: "center",
            padding: "32px 16px",
            color: "text.secondary",
            fontSize: "0.95rem",
            fontStyle: "italic",
          },
          "& .filters": {
            marginBottom: "16px",
            padding: "16px",
            backgroundColor: "var(--bg-sub)",
            borderRadius: "8px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
          },
          "& .filters label": {
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "text.primary",
            marginRight: "8px",
          },
          "& .filters select": {
            padding: "6px 12px",
            border: "1px solid var(--border-main)",
            borderRadius: "4px",
            fontSize: "0.875rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
            "&:focus": {
              outline: "none",
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px rgba(21, 101, 192, 0.1)",
            },
          },
          '& .filters input[type="date"]': {
            padding: "6px 12px",
            border: "1px solid var(--border-main)",
            borderRadius: "4px",
            fontSize: "0.875rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
            "&:focus": {
              outline: "none",
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px rgba(21, 101, 192, 0.1)",
            },
          },
        },
      }}>
      <div className="donationPage">
        <DonationPage personId={props.personId} church={UserHelper.currentUserChurch?.church} />
      </div>
    </Box>
  );
});
