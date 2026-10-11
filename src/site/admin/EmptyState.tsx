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
        <Icon sx={{ fontSize: 32, color: "text.secondary", mb: 2 }}>dashboard_customize</Icon>
        <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
          {Locale.label("site.emptyState.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mb: 3 }}>
          {Locale.label("site.emptyState.description")}
        </Typography>
        {onAddClick && (
          <Button
            variant="contained"
            color="primary"
            onClick={onAddClick}
            startIcon={<Icon>add</Icon>}
          >
            {Locale.label("site.emptyState.addFirstSection")}
          </Button>
        )}
      </Box>
    </Container>
  );
}
