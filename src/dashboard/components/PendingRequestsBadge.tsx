import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
import { Inbox as InboxIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import type { GroupJoinRequestInterface } from "@churchapps/helpers";

export const PendingRequestsBadge: React.FC = () => {
  const { data } = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: []
  });
  const count = data?.length || 0;
  if (count === 0) return null;

  return (
    <Card variant="outlined" data-testid="pending-requests-badge">
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Link to="/groups/pending" style={{ textDecoration: "none", color: "inherit" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <InboxIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {count} pending join request{count === 1 ? "" : "s"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Review &amp; approve
              </Typography>
            </Box>
          </Stack>
        </Link>
      </CardContent>
    </Card>
  );
};
