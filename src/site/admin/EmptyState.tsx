import { Container, Box, Button, Icon, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface EmptyStateProps {
  onAddClick?: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <Container key="empty">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "320px",
          textAlign: "center",
          py: 6,
          px: 3
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2.5
          }}
        >
          <Icon sx={{ fontSize: "2rem", color: "#9ca3af" }}>dashboard_customize</Icon>
        </Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>
          {Locale.label("site.emptyState.title", "This page is empty")}
        </Typography>
        <Typography variant="body2" sx={{ color: "#6b7280", maxWidth: 420, mb: 3, lineHeight: 1.5 }}>
          {Locale.label(
            "site.emptyState.description",
            "Add a section to start building your page. You can rearrange and customize sections any time."
          )}
        </Typography>
        {onAddClick && (
          <Button
            variant="contained"
            color="primary"
            disableElevation
            onClick={onAddClick}
            startIcon={<Icon>add</Icon>}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {Locale.label("site.emptyState.addFirstSection", "Add your first section")}
          </Button>
        )}
      </Box>
    </Container>
  );
}
