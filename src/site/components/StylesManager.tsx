import { useState, useEffect } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { Palette as PaletteIcon, TextFields as TextFieldsIcon, Code as CodeIcon, Image as ImageIcon, SmartButton as SmartButtonIcon, SpaceBar as SpaceBarIcon, FormatSize as FormatSizeIcon, Menu as MenuIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface, BlockInterface, GenericSettingInterface, SiteInterface } from "../../helpers/Interfaces";
import { PaletteEdit, FontEdit, CssEdit, Preview, AppearanceEdit, TypographyEdit, SpacingScaleEdit, NavStyleEdit } from "./";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsConfigList, type ConfigSection } from "../../settings/components/SettingsConfigList";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

type Props = {
  siteId: string;
  selectedSite?: SiteInterface;
};

export function StylesManager(props: Props) {
  const siteId = props.siteId || "";
  const selectedSite = props.selectedSite;
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash?.replace("#", "");
  const [globalStyle, setGlobalStyle] = useState<GlobalStyleInterface | null>(null);
  const [section, setSection] = useState<string>(["palette", "fonts", "typography", "spacing", "nav", "css", "logo"].includes(hash) ? hash : "");
  const [churchSettings, setChurchSettings] = useState<any>(null);
  const [currentSettings, setCurrentSettings] = useState<GenericSettingInterface[]>([]);

  const clearSiteCache = () => {
    const subDomain = selectedSite?.subDomain || UserHelper.currentUserChurch?.church?.subDomain;
    if (!subDomain) return;
    const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);
    fetch(b1Url + "/api/revalidate/" + subDomain, { method: "POST" }).catch(() => { /* best-effort */ });
  };

  // Fork inherited rows to avoid overwriting primary.
  const prepareForSave = (gs: GlobalStyleInterface): GlobalStyleInterface => {
    if ((gs.siteId || "") !== siteId) {
      const copy = { ...gs };
      delete copy.id;
      copy.siteId = siteId;
      return copy;
    }
    return gs;
  };

  const loadData = () => {
    ApiHelper.getAnonymous("/settings/public/" + UserHelper.currentUserChurch.church.id, "MembershipApi").then((s: any) => setChurchSettings(s));
    ApiHelper.get("/settings", "MembershipApi").then((settings: any) => { setCurrentSettings(settings); });

    ApiHelper.get("/globalStyles" + (siteId ? "?siteId=" + siteId : ""), "ContentApi").then((gs: any) => {
      if (gs.palette) setGlobalStyle(gs);
      else {
        setGlobalStyle({
          ...gs,
          palette: gs.palette || JSON.stringify({
            light: "#FFFFFF",
            lightAccent: "#DDDDDD",
            accent: "#0000DD",
            darkAccent: "#9999DD",
            dark: "#000000"
          }),
          fonts: gs.fonts || JSON.stringify({ heading: "Roboto", body: "Roboto" })
        });
      }
    });
  };

  const handlePaletteUpdate = (paletteJson: string | null) => {
    if (paletteJson) {
      const gs = prepareForSave({ ...globalStyle });
      gs.palette = paletteJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    }
    setSection("");
  };

  const handleFontsUpdate = (fontsJson: string | null) => {
    if (fontsJson) {
      const gs = prepareForSave({ ...globalStyle });
      gs.fonts = fontsJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    }
    setSection("");
  };

  const handleUpdate = (gs: GlobalStyleInterface | null) => {
    if (gs) ApiHelper.post("/globalStyles", [prepareForSave(gs)], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    setSection("");
  };

  const handleTypographyUpdate = (typographyJson: string | null) => {
    if (typographyJson) {
      const gs = prepareForSave({ ...globalStyle });
      gs.typography = typographyJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    }
    setSection("");
  };

  const handleSpacingUpdate = (spacingJson: string | null) => {
    if (spacingJson) {
      const gs = prepareForSave({ ...globalStyle });
      gs.spacing = spacingJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    }
    setSection("");
  };

  const handleNavUpdate = (navStylesJson: string | null) => {
    if (navStylesJson) {
      const gs = prepareForSave({ ...globalStyle });
      gs.navStyles = navStylesJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => { loadData(); clearSiteCache(); });
    }
    setSection("");
  };

  useEffect(() => { loadData(); }, [siteId]);

  const getFooter = async () => {
    const existing = await ApiHelper.get("/blocks/blockType/footerBlock" + (siteId ? "?siteId=" + siteId : ""), "ContentApi");
    const match = siteId ? existing.find((b: BlockInterface) => (b.siteId || "") === siteId) : existing[0];
    if (match) navigate("/site/blocks/" + match.id);
    else {
      const block: BlockInterface = { name: Locale.label("site.stylesManager.siteFooterName"), blockType: "footerBlock", siteId: siteId || undefined };
      ApiHelper.post("/blocks", [block], "ContentApi").then((data: any) => {
        navigate("/site/blocks/" + data[0].id);
      });
    }
  };

  const styleOptions: (ConfigSection & { action: () => void })[] = [
    {
      key: "palette",
      icon: <PaletteIcon />,
      title: Locale.label("site.stylesManager.color"),
      subtitle: Locale.label("site.stylesManager.colorDesc"),
      color: "primary",
      action: () => setSection("palette")
    },
    {
      key: "fonts",
      icon: <TextFieldsIcon />,
      title: Locale.label("site.stylesManager.fonts"),
      subtitle: Locale.label("site.stylesManager.fontsDesc"),
      color: "secondary",
      action: () => setSection("fonts")
    },
    {
      key: "typography",
      icon: <FormatSizeIcon />,
      title: Locale.label("site.stylesManager.typography"),
      subtitle: Locale.label("site.stylesManager.typographyDesc"),
      color: "info",
      action: () => setSection("typography")
    },
    {
      key: "spacing",
      icon: <SpaceBarIcon />,
      title: Locale.label("site.stylesManager.spacing"),
      subtitle: Locale.label("site.stylesManager.spacingDesc"),
      color: "warning",
      action: () => setSection("spacing")
    },
    {
      key: "nav",
      icon: <MenuIcon />,
      title: Locale.label("site.stylesManager.nav"),
      subtitle: Locale.label("site.stylesManager.navDesc"),
      color: "success",
      action: () => setSection("nav")
    },
    {
      key: "css",
      icon: <CodeIcon />,
      title: Locale.label("site.stylesManager.css"),
      subtitle: Locale.label("site.stylesManager.cssDesc"),
      color: "secondary",
      action: () => setSection("css")
    },
    {
      key: "logo",
      icon: <ImageIcon />,
      title: Locale.label("site.stylesManager.logo"),
      subtitle: Locale.label("site.stylesManager.logoDesc"),
      color: "primary",
      action: () => setSection("logo")
    },
    {
      key: "footer",
      icon: <SmartButtonIcon />,
      title: Locale.label("site.stylesManager.footer"),
      subtitle: Locale.label("site.stylesManager.footerDesc"),
      color: "warning",
      action: getFooter
    }
  ];

  const handleSelect = (key: string) => {
    styleOptions.find((o) => o.key === key)?.action();
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SettingsConfigList sections={styleOptions} selected={section} onSelect={handleSelect} testIdPrefix="style-option" headerLabel={Locale.label("site.stylesManager.styleSettings")} />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {section === "palette" && <PaletteEdit globalStyle={globalStyle} updatedFunction={handlePaletteUpdate} />}
          {section === "fonts" && <FontEdit globalStyle={globalStyle} updatedFunction={handleFontsUpdate} />}
          {section === "typography" && <TypographyEdit globalStyle={globalStyle} updatedFunction={handleTypographyUpdate} />}
          {section === "spacing" && <SpacingScaleEdit globalStyle={globalStyle} updatedFunction={handleSpacingUpdate} />}
          {section === "nav" && <NavStyleEdit globalStyle={globalStyle} updatedFunction={handleNavUpdate} />}
          {section === "css" && <CssEdit globalStyle={globalStyle} updatedFunction={handleUpdate} />}
          {section === "logo" && <AppearanceEdit settings={currentSettings} updatedFunction={() => { setSection(""); loadData(); }} />}
          {section === "" && (
            churchSettings
              ? (<Preview globalStyle={globalStyle} churchSettings={churchSettings} churchName={UserHelper.currentUserChurch?.church?.name || Locale.label("site.stylesManager.yourChurch")} />)
              : (<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Typography color="text.secondary">{Locale.label("site.stylesManager.loadingPreview")}</Typography>
              </Box>)
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
