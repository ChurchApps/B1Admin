import { useEffect, useState } from "react";
import Resizer from "react-image-file-resizer";
import { Box, Typography, Stack, Button, Card, CardContent, alpha } from "@mui/material";
import { Image as ImageIcon, CloudUpload as CloudUploadIcon, Edit as EditIcon } from "@mui/icons-material";
import { ArrayHelper, ApiHelper, ImageEditor, Locale } from "@churchapps/apphelper";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import type { GenericSettingInterface } from "@churchapps/helpers";

interface Props {
  updatedFunction?: () => void;
  settings?: GenericSettingInterface[];
}

function getOgImage(img: any) {
  return new Promise<string>((resolve, reject) => {
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1200;
      canvas.height = 630;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 15, 15);
      const dataURL = canvas.toDataURL();
      resolve(dataURL.toString());
    };
  });
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res: Response = await fetch(dataUrl);
  const blob: Blob = await res.blob();
  return new File([blob], fileName, { type: "image/png" });
}

function resizeImage(file: File, width: number, height: number) {
  return new Promise<string>((resolve, reject) => {
    try {
      Resizer.imageFileResizer(
        file,
        width,
        height,
        "PNG",
        100,
        0,
        (uri: any) => { resolve(uri.toString()); },
        "base64",
        width,
        height
      );
    } catch (err) {
      console.error("Error in resizing file");
      reject();
    }
  });
}

export function AppearanceEdit(props: Props) {
  const [currentSettings, setCurrentSettings] = useState<GenericSettingInterface[]>([]);
  const [editLogo, setEditLogo] = useState(false);
  const [currentEditLogo, setCurrentEditLogo] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState("about:blank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    const settings = [...currentSettings];
    const keySetting = settings.filter((c: any) => c.keyName === name);

    if (keySetting.length === 0) settings.push({ keyName: name, value, public: 1 });
    else keySetting[0].value = value;

    setCurrentSettings(settings);
  };

  const init = () => {
    const startingUrl = (ArrayHelper.getOne(props.settings, "keyName", currentEditLogo))?.value;
    setCurrentUrl(startingUrl);
  };

  useEffect(init, [currentEditLogo]);

  const getValue = async (keyName: string, dataURL: string) => {
    let url = dataURL;
    if (keyName === "ogImage") {
      const image = new Image();
      image.src = dataURL;
      url = await getOgImage(image);
    }
    return url;
  };

  const getImageUri = async (dataUrl: string, fileName: string, width: number, height: number) => {
    const file = await dataUrlToFile(dataUrl, fileName);
    const uri = await resizeImage(file, width, height);
    return uri;
  };

  const imageUpdated = async (dataUrl: string, keyName: string) => {
    if (dataUrl !== null) {
      const settings = [...currentSettings];
      const keySetting = settings.filter((s: any) => s.keyName === keyName);

      if (keySetting.length === 0) settings.push({ keyName, value: await getValue(keyName, dataUrl), public: 1 });
      else keySetting[0].value = await getValue(keyName, dataUrl);

      if (keyName === "favicon_400x400") {
        const index = settings.findIndex(s => s.keyName === "favicon_16x16");
        if (dataUrl !== "") {
          const imageDataUrl = await getImageUri(dataUrl, "favicon_16x16", 16, 16);
          if (index !== -1) settings[index].value = imageDataUrl;
          else settings.push({ keyName: "favicon_16x16", value: imageDataUrl, public: 1 });
        } else if (index !== -1) settings[index].value = "";
      }

      setCurrentSettings(settings);
    }
    setEditLogo(false);
    setCurrentUrl(null);
  };

  const getLogoEditor = (logoName: string) => {
    if (!editLogo) return null;
    else {
      let aspectRatio: number, outputWidth: number, outputHeight: number;
      if (currentEditLogo.includes("favicon")) {
        aspectRatio = 1;
        outputWidth = 400;
        outputHeight = 400;
      } else if (currentEditLogo.includes("ogImage")) {
        aspectRatio = 1170 / 600;
        outputWidth = 1170;
        outputHeight = 600;
      } else {
        aspectRatio = 4;
        outputWidth = 1280;
        outputHeight = 320;
      }

      return (
        <ImageEditor
          photoUrl={currentUrl}
          onUpdate={(dataUrl) => { imageUpdated(dataUrl, logoName); }}
          onCancel={() => { setEditLogo(false); setCurrentUrl(null); }}
          aspectRatio={aspectRatio}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
        />
      );
    }
  };

  const getLogoDisplay = (name: string, backgroundColor: string, title: string, description: string) => {
    const logoImage = ArrayHelper.getOne(currentSettings, "keyName", name);
    const hasLogo = currentSettings && logoImage !== null && logoImage.value;

    return (
      <Card sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2, overflow: "hidden", height: "100%" }}>
        <Box sx={{ backgroundColor: backgroundColor, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          {hasLogo
            ? (<img src={logoImage.value} alt={title} style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain" }} />)
            : (<Stack alignItems="center" spacing={1} sx={{ color: alpha("#000", 0.4) }}>
              <ImageIcon sx={{ fontSize: 48 }} />
              <Typography variant="body2">No image</Typography>
            </Stack>)
          }
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>{description}</Typography>
          <Button variant="outlined" startIcon={hasLogo ? <EditIcon /> : <CloudUploadIcon />} onClick={() => { setEditLogo(true); setCurrentEditLogo(name); }} fullWidth sx={{ textTransform: "none" }} data-testid={`${name}-button`}>
            {hasLogo ? "Edit" : "Upload"} {title}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const handleSave = () => {
    setIsSubmitting(true);
    ApiHelper.post("/settings", currentSettings, "MembershipApi").then(() => {
      props.updatedFunction();
      setIsSubmitting(false);
    });
  };
  const handleCancel = () => { props.updatedFunction(); };

  useEffect(() => { setCurrentSettings(props.settings); }, [props.settings]);

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {getLogoEditor(currentEditLogo)}

      <Box sx={{ backgroundColor: "var(--c1l2)", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImageIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Logo & Branding</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>Upload and manage your organization's logos and branding assets</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleCancel} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "var(--c1l2)", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-appearance-button">{Locale.label("common.saveChanges")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <CardWithHeader title={Locale.label("site.appearanceEdit.logoManagement")} icon={<ImageIcon />}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Upload your logos for different contexts. All images should have transparent backgrounds for best results.</Typography>

          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}>Main Logos</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {getLogoDisplay("logoLight", "#F5F5F5", "Light Background Logo", "Horizontal logo for light backgrounds. Ideal size: 1280×320px")}
                {getLogoDisplay("logoDark", "#333333", "Dark Background Logo", "Horizontal logo for dark backgrounds. Ideal size: 1280×320px")}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}>SEO & Browser Assets</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {getLogoDisplay("ogImage", "#1976d2", "Social Media Image", "Used for social sharing and SEO. Ideal size: 1200×630px")}
                {getLogoDisplay("favicon_400x400", "#bbdefb", "Favicon", "Square icon for browser tabs. Ideal size: 400×400px")}
              </Box>
            </Box>
          </Stack>
        </CardWithHeader>
      </Box>
    </Box>
  );
}
