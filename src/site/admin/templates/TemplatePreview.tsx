import React from "react";
import { Box } from "@mui/material";
import type { SectionTemplateDef, TemplateElementDef } from "./sectionTemplates";

interface Props {
  template: SectionTemplateDef;
}

const PALETTE_FALLBACKS: Record<string, string> = {
  "var(--light)": "#f4f5f7",
  "var(--lightAccent)": "#dbeafe",
  "var(--accent)": "#2563eb",
  "var(--darkAccent)": "#1d4ed8",
  "var(--dark)": "#111827",
  "var(--primary)": "#1976d2",
  "var(--secondary)": "#9333ea"
};

const resolveBackground = (background: string) => PALETTE_FALLBACKS[background] || background;

const TextLines: React.FC<{ html: string; alignment?: string; color: string }> = ({ html, alignment, color }) => {
  const hasHeading = /<h[1-3]/.test(html);
  const items = alignment === "center" ? "center" : "flex-start";
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: items, gap: "3px", width: "100%" }}>
      {hasHeading && <Box sx={{ height: 6, width: "55%", borderRadius: 1, backgroundColor: color, opacity: 0.9 }} />}
      <Box sx={{ height: 3, width: "85%", borderRadius: 1, backgroundColor: color, opacity: 0.45 }} />
      <Box sx={{ height: 3, width: "70%", borderRadius: 1, backgroundColor: color, opacity: 0.45 }} />
    </Box>
  );
};

const PreviewElement: React.FC<{ def: TemplateElementDef; color: string }> = ({ def, color }) => {
  switch (def.elementType) {
    case "row":
      return (
        <Box sx={{ display: "flex", gap: "6px", width: "100%" }}>
          {def.elements?.map((col, i) => (
            <Box key={i} sx={{ flex: Number(col.answers?.size) || 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
              {col.elements?.map((child, j) => <PreviewElement key={j} def={child} color={color} />)}
            </Box>
          ))}
        </Box>
      );
    case "text":
      return <TextLines html={String(def.answers?.text || "")} alignment={String(def.answers?.textAlignment || "left")} color={color} />;
    case "buttonLink":
      return (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Box sx={{ height: 10, width: 42, borderRadius: "5px", backgroundColor: def.answers?.buttonLinkVariant === "outlined" ? "transparent" : "#1976d2", border: def.answers?.buttonLinkVariant === "outlined" ? `1px solid ${color}` : "none" }} />
        </Box>
      );
    case "image":
    case "textWithPhoto":
    case "card": {
      const photo = def.answers?.photo as string | undefined;
      const img = photo
        ? <Box component="img" src={photo} alt="" sx={{ width: "100%", height: 28, objectFit: "cover", borderRadius: "3px", display: "block" }} />
        : <Box sx={{ width: "100%", height: 28, borderRadius: "3px", backgroundColor: color, opacity: 0.2 }} />;
      if (def.elementType === "image") return img;
      if (def.elementType === "card") {
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "3px", border: "1px solid rgba(128,128,128,0.35)", borderRadius: "4px", padding: "3px", backgroundColor: "rgba(255,255,255,0.6)" }}>
            {img}
            <Box sx={{ height: 4, width: "60%", margin: "0 auto", borderRadius: 1, backgroundColor: "#374151", opacity: 0.8 }} />
            <Box sx={{ height: 3, width: "80%", margin: "0 auto", borderRadius: 1, backgroundColor: "#374151", opacity: 0.4 }} />
          </Box>
        );
      }
      return (
        <Box sx={{ display: "flex", gap: "6px", width: "100%", flexDirection: def.answers?.photoPosition === "left" ? "row-reverse" : "row" }}>
          <Box sx={{ flex: 1 }}><TextLines html={String(def.answers?.text || "")} color={color} /></Box>
          <Box sx={{ flex: 1 }}>{img}</Box>
        </Box>
      );
    }
    case "faq":
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid rgba(128,128,128,0.35)", borderRadius: "3px", padding: "3px 5px", backgroundColor: "rgba(255,255,255,0.6)" }}>
          <Box sx={{ height: 3, flex: 1, borderRadius: 1, backgroundColor: "#374151", opacity: 0.6 }} />
          <Box sx={{ width: 0, height: 0, borderLeft: "3px solid transparent", borderRight: "3px solid transparent", borderTop: "4px solid #374151", opacity: 0.6 }} />
        </Box>
      );
    case "sermons":
    case "groupList":
    case "groups":
      return (
        <Box sx={{ display: "flex", gap: "4px", width: "100%" }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
              <Box sx={{ height: 18, borderRadius: "3px", backgroundColor: color, opacity: 0.2 }} />
              <Box sx={{ height: 3, width: "70%", borderRadius: 1, backgroundColor: color, opacity: 0.45 }} />
            </Box>
          ))}
        </Box>
      );
    case "donateLink":
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "center" }}>
          <Box sx={{ display: "flex", gap: "3px" }}>
            {[0, 1, 2].map((i) => <Box key={i} sx={{ height: 9, width: 22, borderRadius: "4px", border: `1px solid ${color}`, opacity: 0.6 }} />)}
          </Box>
          <Box sx={{ height: 9, width: 50, borderRadius: "4px", backgroundColor: "#1976d2" }} />
        </Box>
      );
    default:
      return <Box sx={{ height: 14, width: "100%", borderRadius: "3px", backgroundColor: color, opacity: 0.2 }} />;
  }
};

export const TemplatePreview: React.FC<Props> = ({ template }) => {
  const background = resolveBackground(template.section.background);
  const isImage = background.indexOf("/") > -1 && !background.startsWith("linear-gradient");
  const color = template.section.textColor === "light" ? "#ffffff" : "#374151";

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: 110,
        borderRadius: "6px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "5px",
        padding: "10px 14px",
        ...(isImage
          ? { backgroundImage: `url('${background}')`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background })
      }}
    >
      {isImage && <Box sx={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />}
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: "5px" }}>
        {template.elements.slice(0, 3).map((def, i) => <PreviewElement key={i} def={def} color={color} />)}
      </Box>
    </Box>
  );
};
