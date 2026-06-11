import React, { useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import type { SectionContentDef, TemplateElementDef } from "./sectionTemplates";

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

const STOCK = "https://content.churchapps.org/stockPhotos";
const SAMPLE_SERMONS = [
  { title: "Faith That Moves", date: "June 7", photo: STOCK + "/1.78/worship.png" },
  { title: "The Heart of Worship", date: "May 31", photo: STOCK + "/1.78/worship2.png" },
  { title: "Living Generously", date: "May 24", photo: STOCK + "/1.78/hands.png" }
];
const SAMPLE_GROUPS = [
  { name: "Young Adults", time: "Tuesdays 7pm", photo: STOCK + "/1.78/hands.png" },
  { name: "Women's Study", time: "Thursdays 10am", photo: STOCK + "/1.78/lessons.png" },
  { name: "Men's Breakfast", time: "Saturdays 8am", photo: STOCK + "/1.78/checkin.png" }
];

// Like the real renderer, buttons are inline and inherit the section's text-align.
const MiniButton: React.FC<{ text: string; variant?: string }> = ({ text, variant }) => (
  <div style={{ textAlign: "inherit", marginTop: 8 }}>
    <span style={{
      display: "inline-block",
      padding: "10px 26px",
      borderRadius: 4,
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: 0.5,
      ...(variant === "outlined" ? { border: "1.5px solid currentColor" } : { backgroundColor: "#1976d2", color: "#fff" })
    }}>{text}</span>
  </div>
);

const MiniElement: React.FC<{ def: TemplateElementDef }> = ({ def }) => {
  const a: Record<string, any> = def.answers || {};
  switch (def.elementType) {
    case "row":
      return (
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {def.elements?.map((col, i) => (
            <div key={i} style={{ flex: Number(col.answers?.size) || 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {col.elements?.map((child, j) => <MiniElement key={j} def={child} />)}
            </div>
          ))}
        </div>
      );
    case "box":
      return (
        <div style={{
          background: resolveBackground(String(a.background || "transparent")),
          color: resolveBackground(String(a.textColor || "inherit")),
          borderRadius: a.rounded === "true" ? 15 : 0,
          padding: 22,
          textAlign: (def.styles?.all?.["text-align"] as any) || "inherit",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          {def.elements?.map((child, i) => <MiniElement key={i} def={child} />)}
        </div>
      );
    case "text":
      return <div className="miniText" style={{ textAlign: (a.textAlignment as any) || "left" }} dangerouslySetInnerHTML={{ __html: a.text || "" }} />;
    case "buttonLink":
      return <MiniButton text={a.buttonLinkText} variant={a.buttonLinkVariant} />;
    case "image":
      return <img src={a.photo} alt={a.photoAlt || ""} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, display: "block" }} />;
    case "card":
      return (
        <div style={{ backgroundColor: "#fff", color: "#333", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", height: "100%" }}>
          {a.photo && <img src={a.photo} alt={a.photoAlt || ""} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />}
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 19, fontWeight: 600, textAlign: "center", marginBottom: 6 }}>{a.title}</div>
            <div className="miniText" style={{ textAlign: "center", fontSize: 14 }} dangerouslySetInnerHTML={{ __html: a.text || "" }} />
          </div>
        </div>
      );
    case "textWithPhoto":
      return (
        <div style={{ display: "flex", gap: 28, alignItems: "center", flexDirection: a.photoPosition === "left" ? "row-reverse" : "row" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="miniText" style={{ textAlign: (a.textAlignment as any) || "left" }} dangerouslySetInnerHTML={{ __html: a.text || "" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <img src={a.photo} alt={a.photoAlt || ""} style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", borderRadius: 6, display: "block" }} />
          </div>
        </div>
      );
    case "faq":
      return (
        <div style={{ backgroundColor: "#fff", color: "#333", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.12)", padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{a.title}</span>
          <span style={{ fontSize: 13, opacity: 0.55 }}>▼</span>
        </div>
      );
    case "sermons":
      return (
        <div style={{ display: "flex", gap: 20 }}>
          {SAMPLE_SERMONS.map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: "relative", borderRadius: 6, overflow: "hidden" }}>
                <img src={s.photo} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", filter: "brightness(0.65)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1976d2", fontSize: 14, paddingLeft: 3 }}>▶</div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{s.title}</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>{s.date}</div>
            </div>
          ))}
        </div>
      );
    case "groups":
    case "groupList":
      return (
        <div>
          {def.elementType === "groups" && (
            <div style={{ display: "flex", gap: 12, marginBottom: 18, justifyContent: "center" }}>
              <div style={{ flex: "0 0 45%", backgroundColor: "#fff", border: "1px solid #d0d5dc", borderRadius: 20, padding: "8px 16px", fontSize: 13, color: "#9aa1ab" }}>Search groups...</div>
              <div style={{ backgroundColor: "#fff", border: "1px solid #d0d5dc", borderRadius: 20, padding: "8px 16px", fontSize: 13, color: "#555" }}>All Categories ▾</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 20 }}>
            {SAMPLE_GROUPS.map((g, i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, backgroundColor: "#fff", color: "#333", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
                <img src={g.photo} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{g.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "donateLink":
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
            {["$25", "$50", "$100"].map((amt) => (
              <span key={amt} style={{ border: "1.5px solid #1976d2", color: "#1976d2", borderRadius: 4, padding: "8px 18px", fontSize: 14, fontWeight: 600 }}>{amt}</span>
            ))}
          </div>
          <MiniButton text="Give Now" centered />
        </div>
      );
    default:
      return null;
  }
};

const MiniSection: React.FC<{ section: SectionContentDef }> = ({ section }) => {
  const background = resolveBackground(section.section.background);
  const isImage = background.indexOf("/") > -1 && !background.startsWith("linear-gradient");
  const light = section.section.textColor === "light";
  const styles = section.section.styles?.all || {};
  const padTop = parseInt(styles["padding-top"], 10) || 56;
  const padBottom = parseInt(styles["padding-bottom"], 10) || 56;

  const textAlign = (section.section.styles?.all?.["text-align"] as any) || "left";

  return (
    <div style={{
      position: "relative",
      padding: `${padTop}px 56px ${padBottom}px`,
      color: light ? "#fff" : "#333",
      textAlign,
      ...(isImage ? { backgroundImage: `url('${background}')`, backgroundSize: "cover", backgroundPosition: "center" } : { background })
    }}>
      {isImage && <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", opacity: 0.55 }} />}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18 }}>
        {section.elements.map((def, i) => <MiniElement key={i} def={def} />)}
      </div>
    </div>
  );
};

interface Props {
  sections: SectionContentDef[];
  navLabels?: string[];
  churchName?: string;
  maxHeight: number;
}

const DESIGN_WIDTH = 800;

export const TemplateMiniRender: React.FC<Props> = ({ sections, navLabels, churchName, maxHeight }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (outerRef.current) setScale(outerRef.current.clientWidth / DESIGN_WIDTH);
      if (innerRef.current) setNaturalHeight(innerRef.current.scrollHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outerRef.current) observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, [sections]);

  const scaledHeight = naturalHeight * scale;
  const height = Math.min(maxHeight, scaledHeight || maxHeight);
  const clipped = scaledHeight > maxHeight + 2;

  return (
    <Box
      ref={outerRef}
      sx={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        borderRadius: "6px",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "#fff",
        pointerEvents: "none",
        userSelect: "none",
        "& .miniText h1": { fontSize: "44px", fontWeight: 700, lineHeight: 1.15, margin: "0 0 14px" },
        "& .miniText h2": { fontSize: "33px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 10px" },
        "& .miniText h3": { fontSize: "25px", fontWeight: 600, lineHeight: 1.3, margin: "0 0 8px" },
        "& .miniText p": { fontSize: "16px", lineHeight: 1.55, margin: "6px 0" }
      }}
    >
      <div ref={innerRef} style={{ width: DESIGN_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {navLabels && navLabels.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", backgroundColor: "#fff", borderBottom: "1px solid #e5e8ec" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#1976d2" }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: "#222" }}>{churchName || "Your Church"}</span>
            </div>
            <div style={{ display: "flex", gap: 22 }}>
              {navLabels.map((l, i) => <span key={i} style={{ fontSize: 14, fontWeight: 500, color: i === 0 ? "#1976d2" : "#444" }}>{l}</span>)}
            </div>
          </div>
        )}
        {sections.map((section, i) => <MiniSection key={i} section={section} />)}
      </div>
      {clipped && <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, background: "linear-gradient(rgba(255,255,255,0), rgba(255,255,255,0.9))" }} />}
    </Box>
  );
};
