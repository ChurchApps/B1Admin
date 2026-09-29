import React, { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Icon, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { sectionTemplates, templateCategories, type SectionTemplateDef } from "./sectionTemplates";
import { TemplatePreview } from "./TemplatePreview";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: SectionTemplateDef) => void;
  switchMode?: boolean;
}

export const SectionTemplatePicker: React.FC<Props> = (props) => {
  const [category, setCategory] = useState<string>("all");

  const templates = category === "all" ? sectionTemplates : sectionTemplates.filter((t) => t.category === category);

  const cardSx = {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: "var(--b1-radius-panel)",
    padding: "8px",
    cursor: "pointer",
    height: "100%",
    transition: "border-color 140ms, background-color 140ms",
    "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" }
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{Locale.label(props.switchMode ? "site.sectionTemplates.switchTitle" : "site.sectionTemplates.title")}</DialogTitle>
      <DialogContent dividers>
        {props.switchMode && (
          <Typography sx={{ fontSize: 14, color: "text.secondary", marginBottom: 2 }} data-testid="switch-layout-hint">
            {Locale.label("site.sectionTemplates.switchHint")}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", marginBottom: 2 }}>
          <Chip
            label={Locale.label("site.sectionTemplates.all")}
            color={category === "all" ? "primary" : "default"}
            onClick={() => setCategory("all")}
            size="small"
          />
          {templateCategories.map((c) => (
            <Chip
              key={c}
              label={Locale.label("site.sectionTemplates.category." + c)}
              color={category === c ? "primary" : "default"}
              onClick={() => setCategory(c)}
              size="small"
            />
          ))}
        </Box>
        <Grid container spacing={2}>
          {!props.switchMode && (
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <Box sx={cardSx} onClick={props.onSelectBlank} data-testid="template-blank">
                <Box
                  sx={{
                    height: 110,
                    borderRadius: "6px",
                    border: "2px dashed",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary"
                  }}
                >
                  <Icon>add</Icon>
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, marginTop: "8px", textAlign: "center" }}>
                  {Locale.label("site.sectionTemplates.blank")}
                </Typography>
              </Box>
            </Grid>
          )}
          {templates.map((template) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={template.key}>
              <Box sx={cardSx} onClick={() => props.onSelectTemplate(template)} data-testid={"template-" + template.key}>
                <TemplatePreview template={template} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, marginTop: "8px", textAlign: "center" }}>
                  {Locale.label("site.sectionTemplates." + template.key)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
