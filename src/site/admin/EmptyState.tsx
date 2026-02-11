import { Container, Box, Typography } from "@mui/material";


export function EmptyState() {
  return (
    <Container key="empty">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", textAlign: "center", py: 6, px: 3 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", mb: 3 }}>
          <span className="material-icons" style={{ fontSize: "3rem", color: "#9e9e9e" }}>
            dashboard_customize
          </span>
        </Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: "#424242", mb: 1.5 }}>
          No sections yet
        </Typography>
        <Typography variant="body1" sx={{ color: "#757575", maxWidth: "500px", mb: 3, lineHeight: 1.6 }}>
          Get started by adding your first section. Drag a section or block from the sidebar, or drop it into the area above to begin building your content.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 3, py: 1.5, backgroundColor: "#f8f9fa", borderRadius: 1, border: "1px dashed #e0e0e0" }}>
          <span className="material-icons" style={{ fontSize: "1.25rem", color: "#616161" }}>
            add_circle_outline
          </span>
          <Typography variant="body2" sx={{ color: "#616161", fontWeight: 500 }}>
            Click the + button in the toolbar to add content
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
