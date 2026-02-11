import { useState, useEffect, useContext } from "react";
import { Box, Grid, Card, CardContent, Stack, Typography } from "@mui/material";
import { Palette as PaletteIcon, TextFields as TextFieldsIcon, Code as CodeIcon, Image as ImageIcon, SmartButton as SmartButtonIcon, Style as StyleIcon, SpaceBar as SpaceBarIcon, FormatSize as FormatSizeIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface, BlockInterface, GenericSettingInterface } from "../../helpers/Interfaces";
import { PaletteEdit, FontEdit, CssEdit, Preview, AppearanceEdit, TypographyEdit, SpacingScaleEdit } from "./";
import UserContext from "../../UserContext";
import { useNavigate } from "react-router-dom";
import { CardWithHeader } from "../../components/ui";
import React from "react";

export function StylesManager() {
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const [globalStyle, setGlobalStyle] = useState<GlobalStyleInterface>(null);
  const [section, setSection] = useState<string>("");
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

  useEffect(() => { loadData(); }, []);

  const getFooter = async () => {
    const existing = await ApiHelper.get("/blocks/blockType/footerBlock", "ContentApi");
    if (existing.length > 0) navigate("/site/blocks/" + existing[0].id);
    else {
      const block: BlockInterface = { name: "Site Footer", blockType: "footerBlock" };
      ApiHelper.post("/blocks", [block], "ContentApi").then((data: any) => {
        navigate("/site/blocks/" + data[0].id);
      });
    }
  };

  const styleOptions = [
    {
      id: "palette",
      icon: <PaletteIcon />,
      title: "Color Palette",
      description: "Customize your site's color scheme",
      action: () => setSection("palette")
    },
    {
      id: "fonts",
      icon: <TextFieldsIcon />,
      title: "Fonts",
      description: "Select and customize typography",
      action: () => setSection("fonts")
    },
    {
      id: "typography",
      icon: <FormatSizeIcon />,
      title: "Typography Scale",
      description: "Configure font sizes and spacing",
      action: () => setSection("typography")
    },
    {
      id: "spacing",
      icon: <SpaceBarIcon />,
      title: "Spacing Scale",
      description: "Define consistent spacing values",
      action: () => setSection("spacing")
    },
    {
      id: "css",
      icon: <CodeIcon />,
      title: "CSS & Javascript",
      description: "Add custom styles and scripts",
      action: () => setSection("css")
    },
    {
      id: "logo",
      icon: <ImageIcon />,
      title: "Logo",
      description: "Upload and manage your logo",
      action: () => setSection("logo")
    },
    {
      id: "footer",
      icon: <SmartButtonIcon />,
      title: "Site Footer",
      description: "Customize your site footer",
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
          {section === "css" && <CssEdit globalStyle={globalStyle} updatedFunction={handleUpdate} />}
          {section === "logo" && <AppearanceEdit settings={currentSettings} updatedFunction={() => { setSection(""); loadData(); }} />}
          {section === "" && (
            churchSettings
              ? (<Preview globalStyle={globalStyle} churchSettings={churchSettings} churchName={UserHelper.currentUserChurch?.church?.name || "Your Church"} />)
              : (<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Typography color="text.secondary">Loading preview...</Typography>
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
