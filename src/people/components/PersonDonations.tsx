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
            margin: "16px 0"
          },
          "& .table th": {
            backgroundColor: "var(--b1-canvas)",
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: 600,
            color: "text.primary",
            borderBottom: "2px solid",
            borderBottomColor: "divider"
          },
          "& .table td": {
            padding: "12px 16px",
            borderBottom: "1px solid",
            borderBottomColor: "divider",
            color: "text.primary"
          },
          "& .table tbody tr:hover": { backgroundColor: "var(--b1-canvas)" },
          "& .table tbody tr:last-child td": { borderBottom: "none" },
          "& .donationAmount": {
            fontWeight: 600,
            color: "primary.main"
          },
          "& .donationDate": { color: "text.secondary" },
          "& .donationFund": {
            color: "text.primary",
            fontWeight: 500
          },
          "& .totalRow": {
            fontWeight: 600,
            backgroundColor: "action.hover",
            "& td": {
              borderTop: "2px solid",
              borderTopColor: "primary.main",
              color: "primary.main"
            }
          },
          "& .noData": {
            textAlign: "center",
            padding: "32px 16px",
            color: "text.secondary",
            fontStyle: "italic"
          },
          "& .filters": {
            marginBottom: "16px",
            padding: "16px",
            backgroundColor: "var(--b1-canvas)",
            borderRadius: "var(--b1-radius-panel)",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap"
          },
          "& .filters label": {
            fontWeight: 500,
            color: "text.primary",
            marginRight: "8px"
          },
          "& .filters select": {
            padding: "6px 12px",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "var(--b1-radius-control)",
            backgroundColor: "background.paper",
            color: "text.primary",
            "&:focus": {
              outline: "none",
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px var(--b1-focus)"
            }
          },
          '& .filters input[type="date"]': {
            padding: "6px 12px",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "var(--b1-radius-control)",
            backgroundColor: "background.paper",
            color: "text.primary",
            "&:focus": {
              outline: "none",
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px var(--b1-focus)"
            }
          }
        }
      }}>
      <div className="donationPage">
        <DonationPage personId={props.personId} church={UserHelper.currentUserChurch?.church} />
      </div>
    </Box>
  );
});
