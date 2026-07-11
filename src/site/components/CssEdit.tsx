import { useState, useEffect } from "react";
import { TextField, Box, Typography, Stack, Button, Alert, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { Code as CodeIcon, Info as InfoIcon, Warning as WarningIcon, ExpandMore as ExpandMoreIcon, Terminal as TerminalIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface | null;
  updatedFunction?: (globalStyle: GlobalStyleInterface | null) => void;
}

export function CssEdit(props: Props) {
  const [globalStyle, setGlobalStyle] = useState<GlobalStyleInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.globalStyle) setGlobalStyle({ ...props.globalStyle });
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction?.(globalStyle);
      setIsSubmitting(false);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const gs = { ...globalStyle };
    switch (e.target.name) {
      case "css": gs.customCss = val; break;
      case "js": gs.customJS = val; break;
    }
    setGlobalStyle(gs);
  };

  if (!globalStyle) return null;

  const cssExamples = [
    {
      title: Locale.label("site.cssEdit.exampleLinkColors"), code: `a {
  color: #1976d2;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}`
    },
    {
      title: Locale.label("site.cssEdit.exampleCustomButton"), code: `.custom-button {
  background: linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%);
  border-radius: 8px;
  padding: 12px 24px;
}`
    },
    {
      title: Locale.label("site.cssEdit.exampleHideElements"), code: `.element-to-hide {
  display: none !important;
}`
    }
  ];

  const jsExamples = [
    {
      title: Locale.label("site.cssEdit.exampleAnalytics"), code: `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`
    },
    {
      title: Locale.label("site.cssEdit.exampleCustomHtml"), code: `<script>
  // Custom functionality
  function customFunction() {
    console.log('Custom function executed');
  }
</script>`
    }
  ];

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ backgroundColor: "primary.light", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CodeIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>{Locale.label("site.cssEdit.headerTitle")}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>{Locale.label("site.cssEdit.headerSubtitle")}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction?.(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("site.cssEdit.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "primary.light", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }}>{Locale.label("site.cssEdit.saveChanges")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2"><strong>{Locale.label("site.cssEdit.advancedFeature")}</strong> {Locale.label("site.cssEdit.advancedFeatureDescription")}</Typography>
        </Alert>

        <CardWithHeader title={Locale.label("site.cssEdit.customCss")} icon={<CodeIcon />}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.cssEdit.customCssDescription")}</Typography>
              <TextField multiline rows={8} label={Locale.label("site.cssEdit.customLabel")} name="css" value={globalStyle?.customCss || ""} onChange={handleChange} fullWidth placeholder={`/* Add your custom CSS here */
a {
  color: #1976d2;
}

.custom-class {
  margin: 20px;
}`} sx={{ "& .MuiInputBase-input": { fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.875rem" } }} />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>{Locale.label("site.cssEdit.commonCssExamples")}</Typography>
              <Stack spacing={1}>
                {cssExamples.map((example, index) => (
                  <Accordion key={index} sx={{ border: "1px solid", borderColor: "grey.200" }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{example.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ backgroundColor: "var(--bg-sub)", p: 2, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                        <Typography variant="body2" component="pre" sx={{ fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.75rem", margin: 0, whiteSpace: "pre-wrap", color: "text.primary" }}>{example.code}</Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.cssEdit.customHtml")} icon={<TerminalIcon />}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.cssEdit.customHtmlDescription")}</Typography>
                <TextField multiline rows={8} label={Locale.label("site.cssEdit.customLabelHtml")} name="js" value={globalStyle?.customJS || ""} onChange={handleChange} fullWidth placeholder={`<!-- Add your custom HTML here -->
<script>
  // Your JavaScript code
  console.log('Hello World');
</script>`} sx={{ "& .MuiInputBase-input": { fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.875rem" } }} />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>{Locale.label("site.cssEdit.commonJsExamples")}</Typography>
                <Stack spacing={1}>
                  {jsExamples.map((example, index) => (
                    <Accordion key={index} sx={{ border: "1px solid", borderColor: "grey.200" }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{example.title}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ backgroundColor: "var(--bg-sub)", p: 2, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                          <Typography variant="body2" component="pre" sx={{ fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.75rem", margin: 0, whiteSpace: "pre-wrap", color: "text.primary" }}>{example.code}</Typography>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardWithHeader>
        </Box>

        <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
          <Typography variant="body2"><strong>{Locale.label("site.cssEdit.proTip")}</strong> {Locale.label("site.cssEdit.proTipDescription")}</Typography>
        </Alert>
      </Box>
    </Box>
  );
}
