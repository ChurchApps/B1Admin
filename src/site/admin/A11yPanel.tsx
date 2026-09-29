import { useMemo } from "react";
import { Box, Chip, Divider, Drawer, Icon, IconButton, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import type { SectionInterface } from "../../helpers/Interfaces";
import { checkPageAccessibility, type A11yIssue, type A11yRule } from "./a11yChecker";

interface Props {
  open: boolean;
  sections?: SectionInterface[];
  onClose: () => void;
  onHighlight: (sectionId: string) => void;
}

const RULE_LABEL_KEY: Record<A11yRule, string> = {
  "missing-alt": "site.a11y.rule_missingAlt",
  contrast: "site.a11y.rule_contrast",
  "heading-order": "site.a11y.rule_headingOrder",
  "empty-link-text": "site.a11y.rule_emptyLink"
};

const localizeMessage = (issue: A11yIssue): string => {
  let text = Locale.label("site.a11y." + issue.messageKey, issue.message);
  if (issue.params) Object.keys(issue.params).forEach((k) => { text = text.replace("{" + k + "}", issue.params![k]); });
  return text;
};

export function A11yPanel(props: Props) {
  const issues = useMemo(() => (props.open ? checkPageAccessibility(props.sections) : []), [props.open, props.sections]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, A11yIssue[]>();
    issues.forEach((issue) => {
      if (!map.has(issue.sectionId)) { map.set(issue.sectionId, []); order.push(issue.sectionId); }
      map.get(issue.sectionId)!.push(issue);
    });
    // Page-level first, then sections in document order.
    order.sort((a, b) => {
      if (a === b) return 0;
      if (a === "") return -1;
      if (b === "") return 1;
      const ia = props.sections?.findIndex((s) => s.id === a) ?? 0;
      const ib = props.sections?.findIndex((s) => s.id === b) ?? 0;
      return ia - ib;
    });
    return order.map((sectionId) => ({ sectionId, items: map.get(sectionId)! }));
  }, [issues, props.sections]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;

  const groupLabel = (sectionId: string): string => {
    if (sectionId === "") return Locale.label("site.a11y.pageLevel");
    const idx = props.sections?.findIndex((s) => s.id === sectionId) ?? -1;
    return Locale.label("site.a11y.sectionLabel").replace("{n}", String(idx + 1));
  };

  return (
    <Drawer anchor="right" open={props.open} onClose={props.onClose} aria-label={Locale.label("site.a11y.panelAria")}>
      <Box sx={{ width: 400, maxWidth: "100vw", display: "flex", flexDirection: "column", height: "100%" }} data-testid="a11y-panel">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Icon sx={{ color: "text.secondary" }}>accessibility_new</Icon>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h3" component="h2">{Locale.label("site.a11y.title")}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>{Locale.label("site.a11y.subtitle")}</Typography>
          </Box>
          <IconButton onClick={props.onClose} aria-label={Locale.label("site.a11y.close")} size="small"><Icon>close</Icon></IconButton>
        </Box>

        {issues.length === 0 ? (
          <Box data-testid="a11y-empty" sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 1, px: 4 }}>
            <Icon sx={{ fontSize: 48, color: "success.main" }}>check_circle</Icon>
            <Typography sx={{ fontWeight: 600, color: "success.main" }}>{Locale.label("site.a11y.noIssues")}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{Locale.label("site.a11y.noIssuesDetail")}</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 2, px: 2, py: 1, backgroundColor: "background.default" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "error.main", fontSize: 14, fontWeight: 600 }}>
                <Icon fontSize="inherit" sx={{ fontSize: "1rem" }}>error</Icon>
                <span>{Locale.label("site.a11y.summaryErrors").replace("{count}", String(errorCount))}</span>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "warning.main", fontSize: 14, fontWeight: 600 }}>
                <Icon fontSize="inherit" sx={{ fontSize: "1rem" }}>warning</Icon>
                <span>{Locale.label("site.a11y.summaryWarnings").replace("{count}", String(warningCount))}</span>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {groups.map((group) => (
                <Box key={group.sectionId || "page"}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="overline" sx={{ color: "text.secondary" }}>{groupLabel(group.sectionId)}</Typography>
                    {group.sectionId !== "" && (
                      <IconButton
                        size="small"
                        aria-label={Locale.label("site.a11y.highlight")}
                        data-testid="a11y-highlight"
                        onClick={() => props.onHighlight(group.sectionId)}
                      >
                        <Icon fontSize="small">my_location</Icon>
                      </IconButton>
                    )}
                  </Box>
                  {group.items.map((issue, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1, px: 2, py: 1 }} data-testid="a11y-issue">
                      <Icon sx={{ mt: 0.25, color: issue.severity === "error" ? "error.main" : "warning.main" }} aria-label={Locale.label(issue.severity === "error" ? "site.a11y.errorLabel" : "site.a11y.warningLabel")}>
                        {issue.severity === "error" ? "error" : "warning"}
                      </Icon>
                      <Box sx={{ minWidth: 0 }}>
                        <Chip size="small" label={Locale.label(RULE_LABEL_KEY[issue.rule])} sx={{ mb: 0.5 }} />
                        <Typography variant="body2">{localizeMessage(issue)}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Divider />
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
