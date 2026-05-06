import { useState, useEffect, useContext } from "react";
import { Box, Grid, Card, CardContent, Stack, Typography } from "@mui/material";
import { Palette as PaletteIcon, TextFields as TextFieldsIcon, Code as CodeIcon, Image as ImageIcon, SmartButton as SmartButtonIcon, Style as StyleIcon, SpaceBar as SpaceBarIcon, FormatSize as FormatSizeIcon, Menu as MenuIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface, BlockInterface, GenericSettingInterface } from "../../helpers/Interfaces";
import { PaletteEdit, FontEdit, CssEdit, Preview, AppearanceEdit, TypographyEdit, SpacingScaleEdit, NavStyleEdit } from "./";
import UserContext from "../../UserContext";
import { useNavigate, useLocation } from "react-router-dom";
import { CardWithHeader } from "../../components/ui";
import React from "react";

export function StylesManager() {
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash?.replace("#", "");
  const [globalStyle, setGlobalStyle] = useState<GlobalStyleInterface>(null);
  const [section, setSection] = useState<string>(["palette", "fonts", "typography", "spacing", "nav", "css", "logo"].includes(hash) ? hash : "");
  const [churchSettings, setChurchSettings] = useState<any>(null);
  const [currentSettings, setCurrentSettings] = useState<GenericSettingInterface[]>([]);

  const loadData = () => {
    ApiHelper.getAnonymous("/settings/public/" + UserHelper.currentUserChurch.church.id, "MembershipApi").then((s: any) => setChurchSettings(s));
    ApiHelper.get("/settings", "MembershipApi").then((settings: any) => { setCurrentSettings(settings); });

    ApiHelper.get("/globalStyles", "ContentApi").then((gs: any) => {
      if (gs.palette) setGlobalStyle(gs);
      else {
        setGlobalStyle({
          palette: JSON.stringify({
            light: "#FFFFFF",
            lightAccent: "#DDDDDD",
            accent: "#0000DD",
            darkAccent: "#9999DD",
            dark: "#000000"
          })
        });
      }
    });
  };

  const handlePaletteUpdate = (paletteJson: string) => {
    if (paletteJson) {
      const gs = { ...globalStyle };
      gs.palette = paletteJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    }
    setSection("");
  };

  const handleFontsUpdate = (fontsJson: string) => {
    if (fontsJson) {
      const gs = { ...globalStyle };
      gs.fonts = fontsJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    }
    setSection("");
  };

  const handleUpdate = (gs: GlobalStyleInterface) => {
    if (gs) ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    setSection("");
  };

  const handleTypographyUpdate = (typographyJson: string) => {
    if (typographyJson) {
      const gs = { ...globalStyle };
      gs.typography = typographyJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    }
    setSection("");
  };

  const handleSpacingUpdate = (spacingJson: string) => {
    if (spacingJson) {
      const gs = { ...globalStyle };
      gs.spacing = spacingJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    }
    setSection("");
  };

  const handleNavUpdate = (navStylesJson: string) => {
    if (navStylesJson) {
      const gs = { ...globalStyle };
      gs.navStyles = navStylesJson;
      ApiHelper.post("/globalStyles", [gs], "ContentApi").then(() => loadData());
    }
    setSection("");
  };

  useEffect(() => { loadData(); }, []);

  const getFooter = async () => {
    const existing = await ApiHelper.get("/blocks/blockType/footerBlock", "ContentApi");
    if (existing.length > 0) navigate("/site/blocks/" + existing[0].id);
    else {
      const block: BlockInterface = { name: Locale.label("site.stylesManager.siteFooterName"), blockType: "footerBlock" };
      ApiHelper.post("/blocks", [block], "ContentApi").then((data: any) => {
        navigate("/site/blocks/" + data[0].id);
      });
    }
  };

  const styleOptions = [
    {
      id: "palette",
      icon: <PaletteIcon />,
      title: Locale.label("site.stylesManager.color"),
      description: Locale.label("site.stylesManager.colorDesc"),
      action: () => setSection("palette")
    },
    {
      id: "fonts",
      icon: <TextFieldsIcon />,
      title: Locale.label("site.stylesManager.fonts"),
      description: Locale.label("site.stylesManager.fontsDesc"),
      action: () => setSection("fonts")
    },
    {
      id: "typography",
      icon: <FormatSizeIcon />,
      title: Locale.label("site.stylesManager.typography"),
      description: Locale.label("site.stylesManager.typographyDesc"),
      action: () => setSection("typography")
    },
    {
      id: "spacing",
      icon: <SpaceBarIcon />,
      title: Locale.label("site.stylesManager.spacing"),
      description: Locale.label("site.stylesManager.spacingDesc"),
      action: () => setSection("spacing")
    },
    {
      id: "nav",
      icon: <MenuIcon />,
      title: Locale.label("site.stylesManager.nav"),
      description: Locale.label("site.stylesManager.navDesc"),
      action: () => setSection("nav")
    },
    {
      id: "css",
      icon: <CodeIcon />,
      title: Locale.label("site.stylesManager.css"),
      description: Locale.label("site.stylesManager.cssDesc"),
      action: () => setSection("css")
    },
    {
      id: "logo",
      icon: <ImageIcon />,
      title: Locale.label("site.stylesManager.logo"),
      description: Locale.label("site.stylesManager.logoDesc"),
      action: () => setSection("logo")
    },
    {
      id: "footer",
      icon: <SmartButtonIcon />,
      title: Locale.label("site.stylesManager.footer"),
      description: Locale.label("site.stylesManager.footerDesc"),
      action: getFooter
    }
  ];

  return (
    <Box>
      <Grid container spacing={3}>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <CardWithHeader title={Locale.label("site.stylesManager.styleSettings")} icon={<StyleIcon sx={{ color: "primary.main" }} />}>
            <Stack spacing={2}>
              {styleOptions.map((option) => (
                <Card
                  key={option.id}
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    border: "1px solid",
                    borderColor: section === option.id ? "primary.main" : "grey.200",
                    backgroundColor: section === option.id ? "primary.50" : "transparent",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 2,
                      borderColor: "primary.main"
                    }
                  }}
                  onClick={option.action}
                  data-testid={`style-option-${option.id}`}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          backgroundColor: section === option.id ? "primary.main" : "rgba(25, 118, 210, 0.1)",
                          borderRadius: "8px",
                          p: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 40,
                          height: 40
                        }}>
                        {React.cloneElement(option.icon, {
                          sx: {
                            fontSize: 20,
                            color: section === option.id ? "#FFF" : "primary.main"
                          }
                        })}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: section === option.id ? "primary.main" : "text.primary" }}>
                          {option.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                          {option.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardWithHeader>
        </Grid>
      </Grid>
    </Box>
  );
}
