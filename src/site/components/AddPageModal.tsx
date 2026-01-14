import { useState, useEffect } from "react";
import { ErrorMessages, InputBox, UserHelper, SlugHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { Permissions, type LinkInterface } from "@churchapps/helpers";
import { Button, Dialog, Grid, Icon, InputLabel, type SelectChangeEvent, TextField, Typography, CircularProgress, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

type Props = {
  mode: string,
  updatedCallback: () => void;
  onDone: () => void;
  requestedSlug?: string;
};

interface PageInterface {
  id?: string;
  title?: string;
  url?: string;
  layout?: string;
}

export function AddPageModal(props: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState<PageInterface>(null);
  const [link, setLink] = useState<LinkInterface>(null);
  const [errors, setErrors] = useState([]);
  const [pageTemplate, setPageTemplate] = useState<string>("blank");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string>("");

  const handleCancel = () => props.onDone();
  const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const p = { ...page };
    const val = e.target.value;
    switch (e.target.name) {
      case "title": p.title = val; break;
      case "url":
        p.url = val.toLowerCase();
        if (link) {
          const l = { ...link };
          l.url = val.toLowerCase();
          setLink(l);
        }
        break;
      case "layout": p.layout = val; break;
    }
    setPage(p);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const l = { ...link };
    const val = e.target.value;
    switch (e.target.name) {
      case "linkText": l.text = val; break;
      case "linkUrl": l.url = val; break;
    }
    setLink(l);
  };

  const validate = () => {
    const errors = [];
    if (pageTemplate === "ai") {
      // AI mode validation is handled in handleAiGenerate
      return true;
    } else if (pageTemplate === "link") {
      if (!link.url || link.url === "") errors.push("Please enter a url.");
    } else {
      if (!page.title || page.title === "") errors.push("Please enter a title.");
    }
    if (props.mode === "navigation") {
      if (!link.text || link.text === "") errors.push("Please enter link text.");
    }
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push("Unauthorized to create pages");
    setErrors(errors);
    return errors.length === 0;
  };

  const handleAiGenerate = async () => {
    // Validate prompt
    if (!aiPrompt || aiPrompt.trim().length < 10) {
      setAiErrors(["Please provide a detailed description (at least 10 characters)."]);
      return;
    }

    setIsSubmitting(true);
    setAiErrors([]);
    setAiGenerationStatus("Gathering church information...");

    try {
      // STEP 1: Gather context from ContentApi
      const church = UserHelper.currentUserChurch.church;
      const globalStyles = await ApiHelper.get("/globalStyles", "ContentApi");

      const validElementTypes = [
        "text", "textWithPhoto", "card", "faq", "table",
        "image", "video", "map", "logo", "sermons", "stream",
        "donation", "donateLink", "form", "calendar", "groupList",
        "row", "box", "carousel", "rawHTML", "iframe",
        "buttonLink", "whiteSpace", "block"
      ];

      const churchContext = {
        churchId: church.id,
        churchName: church.name,
        subdomain: church.subDomain,
        theme: {
          primaryColor: globalStyles?.palette?.primary,
          secondaryColor: globalStyles?.palette?.secondary,
          fonts: globalStyles?.fonts,
          palette: globalStyles?.palette
        }
      };

      // STEP 2: Generate page outline (fast, uses haiku model)
      setAiGenerationStatus("Planning your page structure...");
      const outlineRequest = {
        prompt: aiPrompt.trim(),
        churchContext,
        availableElementTypes: validElementTypes,
        constraints: {
          maxSections: 10,
          preferredLayout: "headerFooter"
        }
      };

      const outlineResponse = await ApiHelper.post("/website/generatePageOutline", outlineRequest, "AskApi");

      if (!outlineResponse?.outline?.sections?.length) {
        throw new Error("Failed to generate page outline");
      }

      const outline = outlineResponse.outline;
      const sectionCount = outline.sections.length;

      // STEP 3: Generate all sections in parallel (uses sonnet model for quality)
      // Use Promise.allSettled to handle individual failures gracefully
      setAiGenerationStatus(`Generating ${sectionCount} sections...`);

      const sectionPromises = outline.sections.map((sectionOutline: any, index: number) =>
        ApiHelper.post("/website/generateSection", {
          sectionOutline,
          churchContext,
          availableElementTypes: validElementTypes,
          pageContext: {
            title: outline.title,
            totalSections: sectionCount,
            sectionIndex: index
          }
        }, "AskApi")
      );

      const sectionResults = await Promise.allSettled(sectionPromises);

      // Filter out failed sections and collect successful ones
      const successfulSections: any[] = [];
      const failedSectionIndices: number[] = [];

      sectionResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.section) {
          successfulSections.push({
            ...result.value.section,
            sort: successfulSections.length // Re-number based on successful sections
          });
        } else {
          failedSectionIndices.push(index + 1); // 1-based for user display
          console.error(`Section ${index} failed:`, result.status === "rejected" ? result.reason : "No section data");
        }
      });

      // If all sections failed, throw an error
      if (successfulSections.length === 0) {
        throw new Error("All sections failed to generate. Please try again.");
      }

      // STEP 4: Assemble the complete page structure with successful sections
      const assembledPage = {
        title: outline.title,
        url: outline.url,
        layout: outline.layout || "headerFooter",
        sections: successfulSections
      };

      // Warn user if some sections failed
      if (failedSectionIndices.length > 0) {
        const failedMsg = `Note: ${failedSectionIndices.length} section(s) failed to generate and were skipped.`;
        console.warn(failedMsg);
        // We'll continue with what we have
      }

      // STEP 5: Post generated structure to ContentApi
      setAiGenerationStatus("Creating page sections and elements...");
      const pageToSave = {
        title: assembledPage.title,
        churchId: church.id,
        layout: assembledPage.layout,
        url: SlugHelper.slugifyString(
          "/" + assembledPage.title.toLowerCase().replace(/\s+/g, "-"),
          "urlPath"
        )
      };

      // Create page record
      const savedPage = await ApiHelper.post("/pages", [pageToSave], "ContentApi");
      const pageId = savedPage[0].id;

      // Create sections and elements using existing ContentApi endpoints
      for (const section of assembledPage.sections || []) {
        section.pageId = pageId;
        section.churchId = church.id;

        const savedSection = await ApiHelper.post("/sections", [section], "ContentApi");
        const sectionId = savedSection[0].id;

        // Save elements for this section (handle nested elements for rows, boxes, etc.)
        const saveElements = async (elements: any[], parentId?: string) => {
          for (const element of elements || []) {
            element.sectionId = sectionId;
            element.churchId = church.id;
            if (parentId) element.parentId = parentId;

            const savedElement = await ApiHelper.post("/elements", [element], "ContentApi");
            const elementId = savedElement[0].id;

            // Recursively save nested elements (e.g., for rows, boxes, carousels)
            if (element.elements && element.elements.length > 0) {
              await saveElements(element.elements, elementId);
            }
          }
        };

        await saveElements(section.elements);
      }

      // STEP 6: Navigate to preview
      setAiGenerationStatus("Opening your new page...");
      props.updatedCallback();
      navigate(`/site/pages/preview/${pageId}`);

    } catch (error) {
      setAiErrors([error?.message || "Failed to generate page. Please try again with a different description."]);
    } finally {
      setIsSubmitting(false);
      setAiGenerationStatus("");
    }
  };

  const handleSave = async () => {
    if (pageTemplate === "ai") {
      handleAiGenerate();
    } else if (validate()) {
      setIsSubmitting(true);
      try {
        let pageData = null;
        let linkData = null;
        if (pageTemplate !== "link") {
          const p = { ...page };
          const slugString = link?.text || page.title || "new-page";
          p.url = props.requestedSlug || SlugHelper.slugifyString("/" + slugString.toLowerCase().replace(" ", "-"), "urlPath");

          pageData = await ApiHelper.post("/pages", [p], "ContentApi").then((data: any) => {
            setPage(data[0]);
            return data[0];
          });
        }

        if (props.mode === "navigation") {
          const l = { ...link };
          if (pageTemplate !== "link") l.url = pageData.url;
          linkData = await ApiHelper.post("/links", [l], "ContentApi").then((data: any) => data[0]);
        }

        props.updatedCallback();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const selectTemplate = (template: string) => {
    const p = { ...page };
    const l = { ...link };
    const churchName = UserHelper.currentUserChurch.church.name || "";
    switch (template) {
      case "sermons": p.title = Locale.label("site.templates.viewSermons"); l.text = Locale.label("common.sermons"); break;
      case "about": p.title = "About " + churchName; l.text = "About Us"; break;
      case "donate": p.title = "Support " + churchName; l.text = "Donate"; break;
      case "location": p.title = "Directions to " + churchName; l.text = "Location"; break;
    }
    setPage(p);
    setLink(l);
    setPageTemplate(template);
  };

  const getTemplateButton = (key: string, icon: string, text: string) => (
    <Grid size={3}>
      <Button variant={(pageTemplate.toLowerCase() === key) ? "contained" : "outlined"} startIcon={<Icon>{icon}</Icon>} onClick={() => { selectTemplate(key); }} fullWidth data-testid={`template-${key}-button`}>{text}</Button>
    </Grid>
  );

  useEffect(() => {
    setPage({ layout: "headerFooter" });
    setLink({ churchId: UserHelper.currentUserChurch.church.id, category: "website", linkType: "url", sort: 99 } as LinkInterface);
  }, [props.mode]);

  if (!page && !link) return <></>;
  else {
    return (

    <Dialog open={true} onClose={props.onDone} className="dialogForm">
      <InputBox id="dialogForm" headerText={(pageTemplate === "link") ? Locale.label("site.addPage.newLink") : Locale.label("site.addPage.newPage")} headerIcon="article" saveFunction={handleSave} cancelFunction={handleCancel} data-testid="add-page-modal" isSubmitting={isSubmitting}>
        <ErrorMessages errors={errors} />

        <InputLabel>{Locale.label("site.addPage.pageType")}</InputLabel>


        <Grid container spacing={2}>
          {getTemplateButton("blank", "article", "Blank")}
          {getTemplateButton("sermons", "subscriptions", Locale.label("common.sermons"))}
          {getTemplateButton("about", "quiz", "About Us")}
          {getTemplateButton("donate", "volunteer_activism", "Donate")}
          {getTemplateButton("location", "location_on", "Location")}
          {getTemplateButton("ai", "auto_awesome", "AI")}
          {(props.mode === "navigation") && getTemplateButton("link", "link", "Link")}
        </Grid>

        {pageTemplate === "ai" && (
          <>
            <ErrorMessages errors={aiErrors} />
            {isSubmitting && aiGenerationStatus && (
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                mb: 2,
                backgroundColor: "primary.main",
                color: "#ffffff",
                borderRadius: 1
              }}>
                <CircularProgress size={24} sx={{ color: "#ffffff" }} />
                <Typography sx={{ color: "#ffffff" }}>{aiGenerationStatus}</Typography>
              </Box>
            )}
            <Typography sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
              Describe the page you want to create
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={5}
              maxRows={8}
              placeholder="Example: Create a welcoming homepage with our church name, mission statement, service times, and a donation button"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isSubmitting}
              data-testid="ai-prompt-input"
            />
            <Typography sx={{ fontSize: "12px", fontStyle: "italic", my: 1 }}>
              Examples:
              <br />• Create a welcoming homepage with our church name, mission statement, service times, and a donation button
              <br />• Build a ministries page showing our youth group, worship team, and community outreach with photos
              <br />• Make a contact page with a map to our location, phone number, email form, and social media links
            </Typography>
          </>
        )}

        {pageTemplate !== "ai" && (
          <Grid container spacing={2}>
            {(pageTemplate !== "link") && <Grid size={(props.mode === "navigation") ? 6 : 12}>
              <TextField size="small" fullWidth label="Page Title" name="title" value={page.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} data-testid="page-title-input" />
            </Grid>}
            {(pageTemplate === "link") && <Grid size={(props.mode === "navigation") ? 6 : 12}>
              <TextField size="small" fullWidth label="Link Url" name="linkUrl" value={link.url || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} />
            </Grid>}
            {(props.mode === "navigation") && <Grid size={6}>
              <TextField size="small" fullWidth label="Link Text" name="linkText" value={link.text || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} />
            </Grid>}
          </Grid>
        )}
      </InputBox>

    </Dialog>
    );
  }
}
